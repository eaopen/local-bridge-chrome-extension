## v0.6.0 — experimental Web V2 MCP status, separate grants

- Add separately versioned `local-tool-bridge:web:v2` requests for `local.capabilities` and `mcp.status`; keep old V1 browser/Native Messaging actions untouched.
- Only exact top-level origins explicitly approved for local MCP may call V2; the OS user must separately grant one installed provider and a **status-only** tool in Local Bridge CLI. No generic tools/call, Agent run, chat read/send, shell or file write.
- Use existing independent Native Host with explicit `protocol_version=2` dispatch. No CloudFile Native Host or file workflow changes.
- Add origin/permission and schema tests; source tests do **not** claim real Chrome GUI, corporate SSO or installed MCP Provider execution has passed.
- Optional exact-site Web WorkBuddy text start + cursor polling of multiple assistant events, separately granted in Chrome and by local user CLI; no file/MCP/shell tools.
- Chrome performs one-time localhost session bootstrap; normal WorkBuddy/MCP data uses direct Bridge HTTP/SSE, with Chrome Native Messaging as a failure fallback. Actual native WorkBuddy device end-to-end remains pending.
- The new feature is a cross-project preview; `eaopen/local-bridge` compatible branch and user's optional Provider are required for a completed status query. Users without Bridge keep existing Capture/Copy/Save and Web AI Relay.

## v0.5.0 — enterprise Web → local Pi (code, not Store approval)

- Separate one-time exact-origin grant for an enterprise website to invoke a scoped text-only Pi task.
- Enterprise service supplies compatible model endpoint, short-lived ticket and authorization; no personal Pi API setup.
- Status-only site permissions remain read-only; same-origin path/ticket and the site source are checked before executing. No local file/shell tools, free Web Chat scraping or model gateway.
- CI/Node tests verify the browser contract; real enterprise SSO and Chrome GUI/Host integration still need acceptance.

## v0.4.0 — manual Web AI Relay (code, not Store approval)

- User-driven Copy task + open Web AI, supported destinations and optional custom HTTPS chat site.
- One pending source/task reference stored locally without chat transcript; paste or select a reply and copy a return package without a host.
- Optional popup-only `relay.return` capability to store a reviewed, source-linked response in the existing Local Bridge inbox.
- No model API routing, quota management, hidden chat automation, automatic tool execution or extra browser permissions. Real Chrome UI/native-host integration still needs target-device acceptance.

## v0.3.0 — optional user-click AI summaries (code, not Store approval)

- Add `context.summarize` as an **optional** V1 Native Messaging capability, only callable by the extension popup. User reviews selected/edited text and clicks a dedicated button.
- Show real completed local-provider summaries in the popup with a Copy action; unavailable/no-host cases preserve existing Copy/Save.
- Keep approved website API read-only; no automatic model calls, browser cookies, broad host permissions, extra required dependencies or CloudFile host takeover.
- Clarify that a locally installed provider may call a remote model. Real Chrome/host/AI sign-in verification remains pending.

# Changelog

## 0.2.0 — unified independent extension

- Consolidated earlier Local Tool Bridge and Browser Local Connector prototype work into one MV3 project.
- Retained user-granted read-only website capability discovery, background source checks, Native Messaging V1, reference host and CI.
- Added editable selection/page-summary preview and local TXT export; Copy and Send use the reviewed content.
- Added user-only Native Host selection, defaulting to `com.eaopen.browser_bridge`. Provider is optional; Local Bridge is promoted with a passive learn-more link, never required.
- Retained CloudFile legacy extension unmodified, with explicit eventual replacement roadmap and E2E gates.
- No claim of Chrome Web Store publication or completed Local Bridge / CloudFile Native Host integration.
