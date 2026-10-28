# Protocol V1 — browser surface and optional native host

Status: extension code implemented for read-only site discovery, popup-initiated page handoff, and reference native-host handshake. **Actual Local Bridge runtime integration is not implemented by the reference host.**

## Web <-> content script (optional user-approved site)

Message object: `{channel:'local-tool-bridge:web:v1', type:'REQUEST', version:1, requestId:'unique', action:'extension.status'|'native.status', params:{}}`.

The content script replies to the same page origin with `type:'RESPONSE'` and the same requestId and either `{ok:true,result:{...}}` or `{ok:false,code:'...'}`. An initial `type:'READY'` announces availability after explicit user site permission. This is a local browser handshake, **not** a proof of the user identity or service authorization.

The user can only grant sites in the popup; page scripts cannot grant, elevate, request native permission, turn on file reads, or ask for arbitrary action names. `chrome.runtime.onMessage` additionally rejects non-top frame, unknown site, or disallowed action.

## Extension <-> Native Host

Default host name: `com.eaopen.browser_bridge`. Only the user in the extension popup may select another valid, separately installed Native Messaging host name. Websites cannot change it. See [Provider guide](PROVIDER_GUIDE.md). Messages use Chrome Native Messaging's 4-byte native-endian length prefix and UTF-8 JSON. The user installs and registers the native host separately. In practice supported Windows/macOS/Linux platforms are little-endian.

```json
{
  "protocol_version": 1,
  "request_id": "r1",
  "action": "host.status",
  "payload": {}
}
```

Response:

```json
{
  "protocol_version": 1,
  "request_id": "r1",
  "ok": true,
  "result": {
    "provider": "reference-host",
    "connected_to_local_bridge": false,
    "capabilities": ["host.status", "context.share"]
  }
}
```

Other V1 action: `context.share`, with bounded UTF-8 string payload `title`, `url`, `selection` only. The `selection` value can be user-edited text, a chosen page summary, or an explicitly typed note. **Only popup** can send this action, after explicit preview and a click. It never exposes to a Web page. The reference host returns `received:true, forwarded:false` without storing/forwarding, demonstrating a protocol test but **not** a real agent task.

### Optional V1 `context.summarize` capability

Native hosts that explicitly advertise `context.summarize` in `host.status.result.capabilities` may accept the same bounded, user-reviewed `{title,url,selection}` payload **only from the extension's own popup**. This is an additive, capability-gated action, not a general-purpose `agent.run` or arbitrary prompt API. Approved websites retain *only* `extension.status` and `native.status`; they can never start this action.

A successful response reports `{status:"completed",summary:"..."}` only when the selected host has received a real completed result; unavailable/failed/incomplete agent runs return `ok:false`. A host is not required to support this action. The Local Bridge provider uses the user's existing authenticated Codex CLI; other trusted providers can implement their own backend. Selected content can reach the provider's configured model service, which may be network based. The extension does not start AI automatically, upload to an extension-owned server, or persist the result in a second conversation database. The popup must remain open until the response arrives.

Do not reuse CloudFile's production Native Host name or Chrome extension ID. The separately developed Local Bridge can later ship its own host implementation with the same framed V1 contract, or provide an explicitly registered alternative. Store listing should not claim a host is built-in or automatically installed.

Further capabilities require explicit version/capability negotiation, source trust and tests. Unknown actions must be rejected; this V1 addition is only `context.summarize` when advertised by the host. No generic `{command, argv, path}` request; no unbounded pass-through to arbitrary host processes. Extension and host own their own versions and upgrades.

## Optional manual Web AI Relay

An optional host may advertise `relay.return`. The extension's popup, **never a website**, sends a bounded `{relay_id,task_ref,web_ai,source:{title,url},reply:{title,url,selection}}` object when the user explicitly clicks Return to local provider. The Local Bridge implementation stores it under its existing user-owned inbox and reports `received/stored` rather than `completed`. It does not process it with a model, apply patches, or call an MCP tool. Web chat prompting is a separate user-controlled clipboard operation, **not** an API action on the Native Host. See [manual Web AI Relay](WEB_AI_RELAY.md).

## New optional `enterprise.pi.run` (trusted site only)

This is a *separate user-approved per-origin capability*, not a generic Agent/MCP tool for every website. The already-authenticated enterprise Web page first obtains a short-lived scoped model ticket **from its own backend**, then sends through the existing approved `window.postMessage` Web API:

```json
{
  "channel":"local-tool-bridge:web:v1",
  "type":"REQUEST",
  "version":1,
  "requestId":"enterprise-task-123",
  "action":"enterprise.pi.run",
  "params":{
    "api_path":"/api/local-ai/v1",
    "model":"team-chat",
    "ticket":"<short-lived-ticket-from-the-logged-in-enterprise-backend>",
    "prompt":"Analyze this user-approved fictional task"
  }
}
```

The Chrome Service Worker supplies `origin` from **Chrome's actual sender**, not page data, enforces separate local-AI permission and nativeMessaging authorization, and limits the operation to a text-only model request. The Native Host validates the same-origin HTTPS path (loopback HTTP allowed only for development), checks endpoint and token scope by calling the enterprise backend, and returns `ok:true,result:{status:"completed",agent:"pi",model_source:"enterprise_session",result:"..."}` only after confirmed execution. No shell, filesystem, browser Cookie or externally chosen model URL is forwarded. The ticket is never echoed in a result. Without a trusted app backend, return a genuine error; do not silently fall back to other models.

The business application keeps its own `requestId`/object reference; Bridge does not create another enterprise account or replace an existing business authorization system. The user must separately enable this origin's **enterprise AI** button after granting basic site read-only access. Testing with mock Native Host is not a claim that real enterprise SSO integration is finished.
