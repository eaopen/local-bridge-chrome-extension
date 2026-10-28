# Enterprise Web → Local Pi (no personal API key)

A previously logged-in enterprise Web application can optionally supply its existing OpenAI-compatible AI endpoint to a user's Pi process. The enterprise provider owns the AI backend, authorization, quotas and billing. The user does not install a separate Pi model account, change Pi settings or expose their browser cookies.

## User approval and trust

The user installs the independently packaged Chrome extension and compatible Local Bridge Native Host. From the enterprise application's own HTTPS origin, the user first grants basic read-only site integration and **separately** enables local enterprise AI for that origin. Only this exact site may then use `enterprise.pi.run`, a bounded text-only operation; local file and shell tools remain disabled.

The enterprise backend authenticates its own logged-in user and issues a short-lived, scoped `ticket`, chosen model ID and same-origin OpenAI-compatible streaming API path. The extension obtains origin from the **Chrome-reported message sender**, never from a webpage claim. The Native Host checks same-origin HTTPS path, ticket presence, model and prompt bounds and returns actual Pi completion or failure.

## Enterprise Web call

After the enterprise app backend has issued a valid scoped ticket:

```js
const requestId = crypto.randomUUID();
const access = await enterpriseApp.getScopedLocalAiTicket(); // App-owned; not a Bridge SDK.
const request = {
  channel: 'local-tool-bridge:web:v1',
  type: 'REQUEST', version: 1, requestId,
  action: 'enterprise.pi.run',
  params: {
    api_path: '/api/local-ai/v1',
    model: access.model,
    ticket: access.token,
    prompt: 'Analyze a user-authorized synthetic task'
  }
};
function onAnswer(e) {
  if (e.source !== window || e.origin !== location.origin) return;
  if (e.data?.channel !== request.channel ||
      e.data?.type !== 'RESPONSE' || e.data.requestId !== requestId) return;
  window.removeEventListener('message',onAnswer);
  // "ok" and result.status must confirm completion. Never log real credentials.
  console.log(e.data.ok ? e.data.result.status : e.data.code);
}
window.addEventListener('message',onAnswer);
window.postMessage(request, location.origin);
```

The enterprise app must expose a same-origin endpoint such as `https://app.company.example/api/local-ai/v1/chat/completions` or proxy its existing AI API there, and validate the ticket on each request. Arbitrary cross-origin model endpoints, permanent API keys, browser cookie extraction, Web Chat scraping, automatic model routing, generic MCP tool execution and local file writes are out of scope.

## Verification status

Chrome JavaScript tests cover typed requests, per-site AI permission, exact Chrome origin, ticket non-disclosure, return semantics and revocation. The Local Bridge and actual Pi process have completed a synthetic SSE model request using an isolated mock enterprise endpoint with a correct bearer, model, stream request and temporary configuration cleanup.

**Actual enterprise SSO backend and real Chrome GUI/Native Host roundtrip are not yet validated.** An unavailable Host, Pi or enterprise ticket must report unavailable without disturbing the original Web application. The separate ChatGPT/Gemini Web AI Relay remains a manual user-controlled continuation, not an unattended Pi model API.
