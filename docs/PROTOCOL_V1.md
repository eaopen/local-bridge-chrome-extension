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

Do not reuse CloudFile's production Native Host name or Chrome extension ID. The separately developed Local Bridge can later ship its own host implementation with the same framed V1 contract, or provide an explicitly registered alternative. Store listing should not claim a host is built-in or automatically installed.

Future capabilities require deliberate schema revision, source trust and tests. No generic `{command, argv, path}` request; no unbounded pass-through to arbitrary host processes. Extension and host own their own versions and upgrades.
