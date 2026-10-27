# Local Tool Bridge — Chrome extension

[中文](README.zh-CN.md) · [Local Bridge](https://github.com/eaopen/local-bridge) · [Provider protocol](docs/PROTOCOL_V1.md) · [CloudFile migration](docs/CLOUDFILE_MIGRATION.md)

**One independent browser connector for the local tools you already use.** This Chrome Manifest V3 extension runs on its own for user-selected page context: capture, edit, copy, and save `.txt` notes. With a separately installed compatible Native Messaging provider, it can also share the context to that provider. **Local Bridge is a featured optional provider, not a required dependency.** Third-party native tools can implement the same contract.

**Single purpose:** explicitly transfer user-reviewed context from the current page to user-chosen local tools. No passive browsing capture, remote scripts, analytics, cookie access, browser identity management, or general-purpose command execution.

## v0.2.0 — merged from two v0.1.0 prototypes

| Feature | Works with no native host? | Details |
|---|---|---|
| Capture page/selection | Yes | Active tab only after user click; selection or description/title; URL excludes query/fragment |
| Edit, copy, export `.txt` | Yes | Review or change text before local Copy/Save/Send |
| Website read-only presence API | Yes | User enables individual sites; only `extension.status` and optional `native.status` |
| Native provider status / handoff | Optional | `host.status` and `context.share`, request ID correlation, framed Chrome Native Messaging |
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

The plugin itself has **no runtime npm dependencies**. Node 20+ is only needed to run tests and create the reproducible store ZIP; `npm run build` produces `dist/local-tool-bridge-v0.2.0.zip` containing only deployable extension assets.

### Without a provider

Select any text on an ordinary HTTP(S) page, click the extension icon → **Capture** → edit text → **Copy** or **Save .txt**. You can also type a note without capturing. No page content leaves your browser unless you explicitly send it to a provider; Copy/Save are local.

### With a provider (including Local Bridge when its adapter is available)

1. Install an independent Chrome Native Messaging host that implements [Provider V1](docs/PROTOCOL_V1.md).
2. The host installer must register the host for your OS user, pin **this extension's actual published ID** in `allowed_origins`, and validate the protocol. The default host is `com.eaopen.browser_bridge`. Advanced users can explicitly select another valid installed host name in the popup.
3. On the popup, click **Check provider** (Chrome requests nativeMessaging permission only then); review your content, then **Send to provider**. A reference host that only acknowledges receipt does **not** constitute successful local AI or CloudFile processing.

This v0.2.0 extension does **not** ship or register a production native host. Local Bridge integration is tracked independently at [Local Bridge #9](https://github.com/eaopen/local-bridge/issues/9). The extension does not need Local Bridge for its independent page-note features.

## Existing CloudFile users

No change is made to the current [CloudFile Chrome Extension](https://github.com/eaopen/cloudfile-chrome-extension), its installed ID, Windows host `com.cloudfile.current_agent`, macOS host `com.cloudfile.agent2`, Rust DEV host, existing file tickets or in-progress edits. Future replacement means verified parity in V2 file view / optimistic edit / exclusive edit, task/status/update routing, SSO and safe upgrade before switching; **not** an immediate replacement. See [migration acceptance](docs/CLOUDFILE_MIGRATION.md).

## Release and trust

- Manifest V3, only `activeTab`, `scripting`, `storage` required; `nativeMessaging` and site origins are **optional**, requested on user action.
- No blanket content scripts or `externally_connectable`; a site only obtains **read-only availability** after the user approves that site. Sites cannot capture content or request native operations.
- No passwords, cookies, background browsing, third-party server telemetry, local filesystem execution, or remote code.
- Reference Native Host is for protocol testing, not packaged into the Store extension.
- Chrome Web Store still requires user tests, a real publishing account, HTTPS privacy policy, final extension ID, screenshots, a complete listing and review.

See [privacy policy draft](docs/PRIVACY_POLICY.md), [store release checklist](docs/STORE_RELEASE.md), [security](docs/SECURITY.md), and [development instructions](docs/DEVELOPMENT.md).

Apache-2.0. **No claim that v0.2.0 is approved/published in Chrome Web Store.**
