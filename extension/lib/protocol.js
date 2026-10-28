/** Native host and browser message contract V1 (browser-side pure helpers).
 *  This module has no access to OS programs or to Chrome APIs.
 */
export const VERSION = 1;
export const HOST_NAME = 'com.eaopen.browser_bridge';
export const WEB_CHANNEL = 'local-tool-bridge:web:v1';
export const MAX_SELECTION = 16000;
export const MAX_TITLE = 300;
export const MAX_SHARE_BYTES = 64 * 1024;
export const MAX_REQUEST_ID = 80;
export const MAX_ENTERPRISE_PROMPT_BYTES = 32 * 1024;

// This is a Chrome Native Messaging host identifier, never an EXE or URL.
// It is selected by the local extension user, not a web page or model prompt.
export function validateHostName(value) {
  return typeof value === 'string' && value.length <= 128 &&
    /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/.test(value);
}

export function validRequestId(value) {
  return typeof value === 'string' && value.length > 0 &&
    value.length <= MAX_REQUEST_ID && /^[a-zA-Z0-9_.-]+$/.test(value);
}

export function validatedOrigin(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password ||
        u.pathname !== '/' || u.search || u.hash || u.href !== `${u.origin}/`) return null;
    return u.origin;
  } catch { return null; }
}

// Chrome match patterns grant a scheme+hostname, not an individual port.
// We additionally verify the *full* exact origin when processing page calls.
export function hostMatch(origin) {
  const checked = validatedOrigin(`${origin}/`);
  if (!checked) return null;
  const parsed = new URL(checked);
  // Chrome match patterns do not port-scope; exact origin checked in service worker.
  // Reject IPv6 literal hosts in v1 rather than creating an invalid match pattern.
  if (parsed.hostname.includes(':')) return null;
  return `${parsed.protocol}//${parsed.hostname}/*`;
}

export function sanitizePage({ url = '', title = '', selection = '' } = {}) {
  let cleanedUrl = '';
  try {
    const page = new URL(url);
    if (['https:', 'http:'].includes(page.protocol)) {
      // Query strings/fragments often include token and tracking identifiers.
      cleanedUrl = `${page.origin}${page.pathname}`.slice(0, 2000);
    }
  } catch { /* unsupported tab */ }
  return {
    url: cleanedUrl,
    title: String(title).slice(0, MAX_TITLE),
    selection: String(selection).slice(0, MAX_SELECTION)
  };
}

export function formatContext(context) {
  const c = sanitizePage(context);
  return [`Page: ${c.title || '(untitled)'}`, c.url, c.selection ? `Selected text:\n${c.selection}` : '']
    .filter(Boolean).join('\n\n');
}

export function nativeRequest(action, payload = {}, requestId) {
  if (!validRequestId(requestId)) throw new Error('Invalid request id');
  if (!['host.status', 'context.share', 'context.summarize', 'relay.return', 'enterprise.pi.run'].includes(action)) throw new Error('Unsupported native action');
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error('Invalid payload');
  if (action === 'context.share' || action === 'context.summarize' || action === 'relay.return' || action === 'enterprise.pi.run') {
    const s = JSON.stringify(payload);
    if (new TextEncoder().encode(s).length > MAX_SHARE_BYTES) throw new Error('Share too large');
  } else if (Object.keys(payload).length) {
    throw new Error('Status takes no arguments');
  }
  return { protocol_version: VERSION, request_id: requestId, action, payload };
}

export function parseNativeResponse(message, requestId) {
  if (!message || typeof message !== 'object' || Array.isArray(message) ||
      message.protocol_version !== VERSION || message.request_id !== requestId ||
      typeof message.ok !== 'boolean') throw new Error('Invalid native host response');
  if (!message.ok) return { ok: false, error: String(message.error || 'native host refused').slice(0, 200) };
  return { ok: true, result: message.result || {} };
}

// The service worker still validates Chrome-reported sender origin and a
// *separate* user-enabled AI grant before this ever reaches a local program.
export function validEnterprisePiParams(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p) ||
      Object.keys(p).length !== 4 ||
      !['api_path','model','ticket','prompt'].every(k => Object.hasOwn(p,k))) return false;
  if (typeof p.api_path !== 'string' || p.api_path.length < 2 ||
      p.api_path.length > 128 || !/^\/[a-zA-Z0-9/_-]+$/.test(p.api_path) ||
      p.api_path.startsWith('//') || p.api_path.includes('..')) return false;
  if (typeof p.model !== 'string' || p.model.length > 128 ||
      !/^[a-zA-Z0-9_][a-zA-Z0-9_./-]*$/.test(p.model) || p.model.includes('..')) return false;
  if (typeof p.ticket !== 'string' || p.ticket.length > 8192 ||
      !/^[\x21-\x7e]+$/.test(p.ticket)) return false;
  if (typeof p.prompt !== 'string' || !p.prompt.trim() ||
      new TextEncoder().encode(p.prompt).length > MAX_ENTERPRISE_PROMPT_BYTES) return false;
  return true;
}

export function validWebRequest(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message) ||
      message.channel !== WEB_CHANNEL || message.type !== 'REQUEST' ||
      message.version !== VERSION || !validRequestId(message.requestId) ||
      !Object.keys(message).every(k => ['channel', 'type', 'version', 'requestId', 'action', 'params'].includes(k))) return false;
  if (message.action === 'enterprise.pi.run') {
    return validEnterprisePiParams(message.params);
  }
  return ['extension.status', 'native.status'].includes(message.action) &&
    (message.params === undefined ||
      (message.params && typeof message.params === 'object' && !Array.isArray(message.params) &&
       Object.keys(message.params).length === 0));
}
