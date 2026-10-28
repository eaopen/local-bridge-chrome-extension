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
  if (!['host.status', 'context.share', 'context.summarize'].includes(action)) throw new Error('Unsupported native action');
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error('Invalid payload');
  if (action === 'context.share' || action === 'context.summarize') {
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

export function validWebRequest(message) {
  return Boolean(message && typeof message === 'object' && !Array.isArray(message) &&
    message.channel === WEB_CHANNEL && message.type === 'REQUEST' &&
    message.version === VERSION && validRequestId(message.requestId) &&
    ['extension.status', 'native.status'].includes(message.action) &&
    Object.keys(message).every(k => ['channel', 'type', 'version', 'requestId', 'action', 'params'].includes(k)) &&
    (message.params === undefined ||
      (message.params && typeof message.params === 'object' && !Array.isArray(message.params) &&
       Object.keys(message.params).length === 0)));
}
