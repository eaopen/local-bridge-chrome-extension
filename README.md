# Local Tool Bridge — Chrome extension

[中文](README.zh-CN.md) · [Local Bridge](https://github.com/eaopen/local-bridge) · [Provider protocol](docs/PROTOCOL_V1.md) · [CloudFile migration](docs/CLOUDFILE_MIGRATION.md)

**One independent browser connector for the local tools you already use.** This Chrome Manifest V3 extension runs on its own for user-selected page context: capture, edit, copy, and save `.txt` notes. With a separately installed compatible Native Messaging provider, it can also share the context to that provider. **Local Bridge is a featured optional provider, not a required dependency.** Third-party native tools can implement the same contract.

**Single purpose:** explicitly transfer user-reviewed context from the current page to user-chosen local tools. No passive browsing capture, remote scripts, analytics, cookie access, browser identity management, or general-purpose command execution.

## v0.6.2 — one Agent V2 API, plain loopback HTTP by default

The V2 browser interface for Agent tasks is **only** `agent.run` / `agent.read`. The build-time Local Bridge Web SDK uses `runAgent({apiVersion:2,clientKey,prompt,agent?,model?,thinkMode?,agentMode?})` and `readAgent(taskId,cursor,onEvent)`. The previous unshipped vendor-specific `agent.start/poll` has been removed; WorkBuddy remains an internal runtime adapter. Agents may be WorkBuddy/Codex/Pi, but today only WorkBuddy has Web V2 text execution. Requested models/thinking modes that the chosen adapter cannot apply fail before submission.

The ordinary Web data channel is **`http://127.0.0.1:48293`**, no TLS or local certificates. Chrome 142+/145+ may prompt for **Local Network Access / loopback-network**; the user/browser owns that permission. If direct loopback HTTP/SSE is blocked, the same V2 task uses **Chrome Native Messaging** fallback without a duplicate task ID or extra model route. Trusted enterprise HTTPS localhost proxy is optional and separately installed; neither local HTTPS nor certificate setup is the default. See [Web V2](docs/WEB_V2_MCP.md).

## v0.5.0 — enterprise Web → local Pi without personal model setup

An existing enterprise Web app can use its **own server-provided AI API** as the model source for a locally installed Pi Agent. After the user separately enables **enterprise AI** for the exact website origin, the already-logged-in app obtains a short-lived model ticket from its own backend and invokes one bounded, text-only `enterprise.pi.run` operation through this Chrome extension and an optional Local Bridge Native Host. No personal Pi API key, new model routing account, arbitrary website executable or file-access tool is required. The scoped ticket is used in-flight only; no browser cookies or permanent credentials are collected.

This requires the enterprise app to implement the documented compatible streaming endpoint and scoped ticket. A granted status-only website permission is **not** an AI execution grant. The feature is code-complete as an optional integration contract; actual Chrome GUI + enterprise SSO server E2E remains to be tested. Other existing Copy/Save, Local Bridge and manual Web AI Relay behavior remains independent. See [Enterprise Web-to-Pi contract](docs/ENTERPRISE_PI_WEB.md).

## v0.4.0 — lightweight Web AI Relay (manual fallback)

**Not a 9Router alternative.** Use ChatGPT, Gemini, Claude, Copilot, DeepSeek or a custom HTTPS chat site when an installed local Agent is unavailable or its quota is exhausted. The user chooses reviewed page/task content, clicks **Copy task & open Web AI**, pastes the prepared prompt into their existing browser chat and then manually brings a selected answer back.

With **no** Local Bridge, the reply can be copied as a source-labeled package to any tool. With an optional compatible Native Messaging host, **Return to local provider** stores the reviewed reply in the *existing* user-owned inbox with a link to the original task reference, never claiming an AI-generated code suggestion was executed. No extra account, API key, model gateway, automatic webpage scraping, free-quota scheduling or mandatory provider. The extension retains one lightweight local handoff descriptor, **not chat bodies**. See [Web AI Relay V1](docs/WEB_AI_RELAY.md).

## v0.3.0 — optional one-click local AI summary

A user can now click **Summarize with local AI** on the content they selected/edited in the extension popup. The action is advertised only by compatible Native Messaging hosts (`context.summarize` capability); the Local Bridge implementation invokes the user's **existing Codex CLI** in ephemeral read-only mode and returns a summary to the popup. No host, no Codex or unsupported provider? Capture, edit, Copy and Save continue to work.

**This is a deliberate user action, not a website or background AI API.** The user must keep the popup open while it runs. The chosen provider/model may process text using a remote service; users should review content before invoking it. Neither the extension nor Local Bridge adds its own cloud model account. Actual Chrome plus logged-in Codex end-to-end remains to be verified on Windows/macOS.

## v0.2.0 — merged from two v0.1.0 prototypes

| Feature | Works with no native host? | Details |
|---|---|---|
| Capture page/selection | Yes | Active tab only after user click; selection or description/title; URL excludes query/fragment |
| Edit, copy, export `.txt` | Yes | Review or change text before local Copy/Save/Send |
| Website read-only presence API | Yes | User enables individual sites; only `extension.status` and optional `native.status` |
| Native provider status / handoff | Optional | `host.status` and `context.share`, request ID correlation, framed Chrome Native Messaging |
| Summarize reviewed text in popup | Optional | Extra `context.summarize` capability; only user click, requires provider with installed/authorized AI CLI |
| Manual Web AI Relay | Yes | Copy task, open existing Web AI, select/paste reply and copy a return package; optional `relay.return` Native Host stores task-linked reply |
| Custom provider selection | Optional | User locally configures an installed host name in the popup; no website can change it |
| Local Bridge onboarding | Yes | Optional official project link, standard host contract; no forced installation |
| CloudFile local editing | Not yet | Current CloudFile extension remains production path; future migration requires actual file-mode E2E |

The two original prototype paths are **merged into this one repo**: the initial *Local Tool Bridge* provides site permission and protocol/CI scaffolding; *Browser Local Connector* contributes editable notes, simple UI, Copy/Save, and local host feedback. There is no reason to ship two overlapping store listings.

## Getting started

```bash
npm test
npm run build
# Chrome → chrome://extensions → Developer mode → Load unpacked → choose extension/
```

The plugin itself has **no runtime npm dependencies**. Node 20+ is only needed to run tests and create the reproducible store ZIP; `npm run build` produces `dist/local-tool-bridge-v0.5.0.zip` containing only deployable extension assets.

### Without a provider

Select any text on an ordinary HTTP(S) page, click the extension icon → **Capture** → edit text → **Copy** or **Save .txt**. You can also type a note without capturing. No page content leaves your browser unless you explicitly send it to a provider; Copy/Save are local.

### With a provider (including Local Bridge when its adapter is available)

1. Install an independent Chrome Native Messaging host that implements [Provider V1](docs/PROTOCOL_V1.md).
2. The host installer must register the host for your OS user, pin **this extension's actual published ID** in `allowed_origins`, and validate the protocol. The default host is `com.eaopen.browser_bridge`. Advanced users can explicitly select another valid installed host name in the popup.
3. In the popup, review your content and click **Send to provider**. Click **Summarize with local AI** only if you want the selected provider to process that text (Chrome asks for optional nativeMessaging permission as needed). The extension checks that the host advertises `context.summarize` before sending the request. A reference host that only acknowledges receipt does **not** constitute successful local AI or CloudFile processing.

This v0.5.0 extension does **not** ship or register a native host. Local Bridge independently implements `com.eaopen.browser_bridge` with user-level installation and the optional summary capability, but a separately installed third-party host can implement the same typed action. Integration is tracked at [Local Bridge #9](https://github.com/eaopen/local-bridge/issues/9). The extension does not need Local Bridge for its independent page-note features.

## Existing CloudFile users

No change is made to the current [CloudFile Chrome Extension](https://github.com/eaopen/cloudfile-chrome-extension), its installed ID, Windows host `com.cloudfile.current_agent`, macOS host `com.cloudfile.agent2`, Rust DEV host, existing file tickets or in-progress edits. Future replacement means verified parity in V2 file view / optimistic edit / exclusive edit, task/status/update routing, SSO and safe upgrade before switching; **not** an immediate replacement. See [migration acceptance](docs/CLOUDFILE_MIGRATION.md).

## Release and trust

- Manifest V3, only `activeTab`, `scripting`, `storage` required; `nativeMessaging` and site origins are **optional**, requested on user action.
- No blanket content scripts or `externally_connectable`; a site only obtains **read-only availability** after the user approves that site. Sites cannot capture content or request native operations.
- No passwords, cookies, background browsing, third-party server telemetry, local filesystem execution, or remote code.
- Reference Native Host is for protocol testing, not packaged into the Store extension.
- Chrome Web Store still requires user tests, a real publishing account, HTTPS privacy policy, final extension ID, screenshots, a complete listing and review.

See [privacy policy draft](docs/PRIVACY_POLICY.md), [store release checklist](docs/STORE_RELEASE.md), [security](docs/SECURITY.md), and [development instructions](docs/DEVELOPMENT.md).

Apache-2.0. **No claim that v0.5.0 is approved/published in Chrome Web Store.**
