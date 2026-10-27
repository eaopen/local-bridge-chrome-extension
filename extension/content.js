// Loaded ONLY on user-approved origins through registered content scripts.
// All page messages are untrusted; the service worker re-checks origin and grants.
(() => {
  if (globalThis.__localToolBridgeContentV1__) return;
  globalThis.__localToolBridgeContentV1__ = true;
  const CHANNEL = 'local-tool-bridge:web:v1';

  chrome.runtime.sendMessage({ type: 'SITE_ALLOWED' }, (reply) => {
    if (chrome.runtime.lastError || !reply?.allowed) return;

    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const msg = event.data;
      if (!msg || msg.channel !== CHANNEL || msg.type !== 'REQUEST' || msg.version !== 1) return;
      if (typeof msg.requestId !== 'string' || msg.requestId.length > 80) return;
      // The SW is the authority for allowed actions. No arbitrary native forwarding.
      chrome.runtime.sendMessage({ type: 'WEB_REQUEST', request: msg }, (result) => {
        const response = chrome.runtime.lastError
          ? { ok: false, code: 'extension_unavailable' }
          : (result || { ok: false, code: 'empty_response' });
        window.postMessage({ channel: CHANNEL, type: 'RESPONSE', version: 1,
          requestId: msg.requestId, ...response }, location.origin);
      });
    });
    window.postMessage({ channel: CHANNEL, type: 'READY', version: 1 }, location.origin);
  });
})();
