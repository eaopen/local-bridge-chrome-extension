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
