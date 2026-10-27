/** MV3 service worker: single-purpose browser-to-local gateway.
 *  Register all event listeners synchronously, no default page monitoring.
 */
import { VERSION, HOST_NAME, validateHostName, sanitizePage, validWebRequest, validatedOrigin,
  hostMatch, nativeRequest, parseNativeResponse } from './lib/protocol.js';

const SCRIPT_ID = 'local-tool-bridge-user-sites-v1';
const MAX_SITES = 32;
const nativeStatusLast = new Map(); // soft resource limit for an approved web page

async function sites() {
  const result = await chrome.storage.local.get('trustedSites');
  return Array.isArray(result.trustedSites) ? result.trustedSites : [];
}

async function allowSite(origin) {
  return (await sites()).includes(origin) &&
    await chrome.permissions.contains({ origins: [hostMatch(origin)] });
}

async function refreshContentScripts() {
  const allowed = [];
  for (const origin of await sites()) {
    const pattern = hostMatch(origin);
    if (pattern && await chrome.permissions.contains({ origins: [pattern] })) allowed.push(pattern);
  }
  const matches = [...new Set(allowed)];
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  if (matches.length) {
    await chrome.scripting.registerContentScripts([{
      id: SCRIPT_ID, matches, js: ['content.js'], allFrames: false,
      runAt: 'document_idle', persistAcrossSessions: true
    }]);
  }
}

function popupSender(sender) {
  return sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html');
}

function publicHostStatus(response) {
  if (!response.ok) return response;
  const value = response.result || {};
  return { ok: true, result: {
    provider: String(value.provider || 'native host').slice(0, 80),
    connected_to_local_bridge: value.connected_to_local_bridge === true,
    capabilities: Array.isArray(value.capabilities)
      ? value.capabilities.filter(x => typeof x === 'string' && /^[a-z0-9._-]{1,64}$/.test(x)).slice(0, 32)
      : []
  } };
}

async function sendNative(action, payload = {}) {
  if (!await chrome.permissions.contains({ permissions: ['nativeMessaging'] })) {
    return { ok: false, code: 'native_permission_required' };
  }
  const requestId = `r${crypto.randomUUID().replaceAll('-', '')}`;
  let request;
  try { request = nativeRequest(action, payload, requestId); }
  catch (e) { return { ok: false, code: 'invalid_request', detail: e.message }; }
  try {
    const saved = await chrome.storage.local.get('nativeHost');
    const host = validateHostName(saved?.nativeHost) ? saved.nativeHost : HOST_NAME;
    const response = await chrome.runtime.sendNativeMessage(host, request);
    return parseNativeResponse(response, requestId);
  } catch {
    return { ok: false, code: 'native_host_unavailable' };
  }
}

async function onMessage(message, sender) {
  if (!message || typeof message !== 'object') return { ok: false, code: 'invalid_request' };

  if (message.type === 'SITE_ALLOWED') {
    const origin = validatedOrigin(`${sender.origin || ''}/`);
    return { allowed: Boolean(sender.tab && sender.frameId === 0 && origin &&
      new URL(sender.url).origin === origin && await allowSite(origin)) };
  }
  if (message.type === 'WEB_REQUEST') {
    const origin = validatedOrigin(`${sender.origin || ''}/`);
    if (!sender.tab || sender.frameId !== 0 || !origin ||
        new URL(sender.url).origin !== origin || !await allowSite(origin)) {
      return { ok: false, code: 'site_not_allowed' };
    }
    if (!validWebRequest(message.request)) return { ok: false, code: 'unsupported_action' };
    switch (message.request.action) {
      case 'extension.status':
        return { ok: true, result: { protocol_version: VERSION,
          extension_version: chrome.runtime.getManifest().version,
          native_host: 'optional' } };
      case 'native.status': {
        if (!await chrome.permissions.contains({ permissions: ['nativeMessaging'] })) {
          return { ok: false, code: 'native_permission_required' };
        }
        const key = `${origin}:${sender.tab.id}`;
        const now = Date.now();
        if (now - (nativeStatusLast.get(key) || 0) < 3000) return { ok: false, code: 'rate_limited' };
        nativeStatusLast.set(key, now);
        return publicHostStatus(await sendNative('host.status'));
      }
    }
    return { ok: false, code: 'unsupported_action' };
  }
  // Only our own popup can grant a site or submit page context to a host.
  if (!popupSender(sender)) return { ok: false, code: 'caller_not_allowed' };
  if (message.type === 'SITE_TOGGLE') {
    const origin = validatedOrigin(`${message.origin || ''}/`);
    if (!origin) return { ok: false, code: 'invalid_origin' };
    const previous = await sites();
    const next = message.enabled ? [...new Set([...previous, origin])] : previous.filter(x => x !== origin);
    if (next.length > MAX_SITES) return { ok: false, code: 'site_limit' };
    if (message.enabled && !await chrome.permissions.contains({ origins: [hostMatch(origin)] })) {
      return { ok: false, code: 'host_permission_required' };
    }
    await chrome.storage.local.set({ trustedSites: next });
    await refreshContentScripts();
    return { ok: true, enabled: message.enabled, count: next.length };
  }
  if (message.type === 'GET_SITE') {
    const origin = validatedOrigin(`${message.origin || ''}/`);
    return { ok: true, allowed: Boolean(origin && await allowSite(origin)) };
  }
  if (message.type === 'HOST_GET') {
    const saved = await chrome.storage.local.get('nativeHost');
    return { ok: true, host: validateHostName(saved?.nativeHost) ? saved.nativeHost : HOST_NAME };
  }
  if (message.type === 'HOST_SET') {
    if (!validateHostName(message.host)) return { ok: false, code: 'invalid_host_name' };
    await chrome.storage.local.set({ nativeHost: message.host });
    return { ok: true, host: message.host };
  }
  if (message.type === 'NATIVE_STATUS') return publicHostStatus(await sendNative('host.status'));
  if (message.type === 'SHARE_CONTEXT') {
    const ctx = message.context;
    if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) return { ok: false, code: 'invalid_context' };
    const { title, url, selection } = ctx;
    if ([title, url, selection].some(x => typeof x !== 'string')) return { ok: false, code: 'invalid_context' };
    const clean = sanitizePage({ title, url, selection });
    if (!clean.selection.trim() || selection.length > 16000) return { ok: false, code: 'invalid_context' };
    return sendNative('context.share', clean);
  }
  return { ok: false, code: 'unsupported_action' };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  onMessage(message, sender).then(sendResponse).catch(() => sendResponse({ ok: false, code: 'unexpected_error' }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => { void refreshContentScripts(); });
chrome.runtime.onStartup.addListener(() => { void refreshContentScripts(); });
chrome.permissions.onRemoved.addListener(() => { void refreshContentScripts(); });
