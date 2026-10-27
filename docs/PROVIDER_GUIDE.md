# Integrating any Native Messaging provider

Local Tool Bridge is **provider-neutral**. `com.eaopen.browser_bridge` is the default host identifier and a convenient Local Bridge integration target, not a runtime dependency. A third-party host with a separate registered name can be selected by the user inside the popup's **Provider settings**.

## Provider V1 minimum

- Chrome Native Messaging standard: 4-byte native-endian length prefix (little-endian on typical Windows/macOS/Linux), followed by UTF-8 JSON. No log text on stdout.
- Host manifest pins one or more **actual, installed** Chrome extension IDs in `allowed_origins`; wildcard extension IDs are forbidden.
- `host.status` → confirms real provider name and supported capability IDs (status only, no claims of AI/CloudFile completion).
- `context.share` → receives a **user-edited** `{title,url,selection}` object. A positive reply means only what `result` explicitly states: `received`, `forwarded` or an actual task ref. Do not claim full processing from an ACK.
- Correlate `protocol_version:1` and `request_id`, reject unknown actions/oversized payloads and validate the real Chrome caller.
- No arbitrary shell commands, EXE paths, backend tokens, browser cookies or automatic background uploading.

## User choice and security

Only the extension popup may change `nativeHost`. A Web page is limited to user-approved, **read-only** `extension.status` and `native.status` and cannot choose a provider, enable nativeMessaging, capture another tab or send context. The extension remembers approved site origins locally; opening another browser origin or port does not inherit permission automatically.

Generic host names follow Chrome's dot-separated lowercase name contract. Selection does not install a host; each provider's own installer must create the OS-specific Native Messaging registry/manifest and approve the final extension ID. Nothing in the extension bypasses OS/user/Provider authorization.

## Local Bridge optimization

A Local Bridge adapter can register the default host ID and return `connected_to_local_bridge:true` **only when it is genuinely running and connected**. Its MCP/Agent tools and future CloudFile file module are independent services. Do not register raw `local-bridge mcp` as a Chrome host: MCP stdio uses newline JSON rather than Chrome's length-prefixed messages. The adapter must translate the envelope and preserve source/task authorization.

## Reference host

`native-host/reference-host.mjs` is a separately run, **development-only** example. It only responds to status and acknowledges context without forwarding or storing it. It is not bundled in Chrome Web Store ZIP and not a substitute for a real Provider or its installer.
