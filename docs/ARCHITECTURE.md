# Architecture & ownership

## The one browser purpose

**Local Tool Bridge** lets a user hand the **current page/selection** to their desktop tools, with an optional trusted local connection. This is one Chrome-side purpose, not a kitchen-sink browser platform. It has real functionality without a native application: capture a user-chosen current tab and edit, copy or save its context locally, and optionally hand it to a chosen native provider.

| Layer | Responsibility | Dependency |
|---|---|---|
| Chrome MV3 extension | Current page context; opt-in per-site read-only discover; trusted Native Messaging; explicit user actions | No required Local Bridge |
| User-selected native host | Chrome native framing, trusted extension ID, capability handshake, optional context receiver | Independently installed, registered by local software |
| Local Bridge runtime | Optional native capability executor, MCP, Agent and local task orchestration | No required Chrome extension |
| CloudFile Agent2 / enterprise apps | File edit, SSO, ACL, real task state, version/Journals | No replacement or takeover |

The existing `eaopen/cloudfile-chrome-extension` is **separate**: keep its ID, host registry keys, Dev/Prod routing, file modes and ongoing tasks unchanged. Do not reuse its extension identity to implement this generic functionality.

## Basic flows

1. **No native host**: user opens popup, clicks **Capture**, sees cleaned current URL (query/fragment removed), title and selected text, clicks **Copy**. No remote request, persistent page cache or page monitor.
2. **Optional local host**: user explicitly grants `nativeMessaging`, clicks **Check local host** and may click **Send to local host** on a preview they inspected. Host replies using V1 typed messages. Current reference host acknowledges only; not a working Local Bridge Agent.
3. **Trusted Web site**: user opens site, explicitly clicks **Allow this site**, Chrome requests permission for this host. Only then a content script listens for `window.postMessage` read-only requests; the background re-verifies exact `sender.origin`, top frame and allowlist. The site can request `extension.status` and (if native permission already granted) `native.status`, but cannot pass arbitrary native commands, files, tokens or application IDs. Disable this site stops the bridge.

Web API V1 example (from the approved site's own script):

```js
const requestId = 'req_' + crypto.randomUUID();
window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  if (event.data?.channel === 'local-tool-bridge:web:v1' &&
      event.data?.type === 'RESPONSE' && event.data.requestId === requestId) {
    console.log(event.data);
  }
});
window.postMessage({channel:'local-tool-bridge:web:v1', type:'REQUEST', version:1,
  requestId, action:'extension.status', params:{}}, location.origin);
```

A generic typed request/response API is intentional; no `externally_connectable: {matches:['http://*/*']}` exposed. The stable protocol does not depend on Etech/CloudFile URLs. Untrusted third-party pages cannot install a native host or decide the installed Agent/provider.

## Separation of trust and tasks

- Chrome permissions are granted per user action; user approves a page and optionally native messaging. Site allowlist stores **origins only**, not credentials or page bodies.
- Extension never reads cookies, browser history, network traffic, login tokens, or page DOM by default. The capture button reads the selected text or page meta description/title from the active tab; the user may edit or type a note. Nothing is captured by default.
- Browser site requests are *read-only capabilities*. A future action/mutation requires an explicit reviewed contract and appropriate original app authorization/ticket; arbitrary webpage text is never shell/EXE invocation consent.
- Native host installer must pin this extension's **actual published extension ID** in `allowed_origins` (no wildcard) and validate requests; the extension may be installed without a host and vice versa.
- HTTP enterprise sites may be explicitly granted. Chrome host permissions aren't port-specific, so the service worker enforces the full `origin` including port before accepting a page request. On extra ports the content script does nothing until exact-origin approval.
- Local Bridge and CloudFile file tasks remain owned by their existing code; task `accepted` is not file `completed` or message `delivered`.

See [V1 protocol](PROTOCOL_V1.md), [privacy](PRIVACY_POLICY.md), [security](SECURITY.md), and [store release](STORE_RELEASE.md).
