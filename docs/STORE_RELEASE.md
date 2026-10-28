# Chrome Web Store release preparation

**Store-targeted design, not an approved store submission.** Manifest V3, single browser purpose, local functionality without Bridge, minimal required permissions, consent-driven optional host access, bundled code and icons. Final approval is Google's decision.

## Single-purpose statement

"Capture context from the current tab and hand it to desktop tools you choose." Optional local-host status and approved site capability discovery serve this **same** use case. Do not add unrelated password managers, shopping, chat scraping, ads or universal automation to this extension.

## Permission justification

| Permission | Why | When used |
|---|---|---|
| `activeTab` | Current tab access on direct user interaction | User opens popup and clicks Capture |
| `scripting` | Read current selected text; inject the same read-only content script on explicitly granted sites | User capture/site-enable action only |
| `storage` | Store site origins that the user opted into | Enable/disable site |
| `nativeMessaging` (**optional**) | Hand user-reviewed context to an installed tool or invoke its opt-in summary capability | User clicks Check/Send/Summarize and grants Chrome permission |
| `http://*/*`, `https://*/*` (**optional hosts**) | User may work on arbitrary intranet/public enterprise sites | Requested one origin at a time; exact-origin filtering in worker |

No `tabs`, `history`, `cookies`, `webRequest`, `downloads`, `debugger`, broad required host permissions, or persistent all-page scraping.

## Required before public launch

- [ ] Use a **new stable published extension ID**. If a developer key is used, never leak its private portion; record the final ID in the separately installed Native Messaging host `allowed_origins`.
- [ ] Test installed extension on Chrome Windows/macOS and at least one standalone/no-host machine. Test current-page capture, clipboard, site enable/disable, permission revoke and no-host fallback.
- [ ] Validate the independently implemented Local Bridge native host on real Windows/macOS Chrome and a user-authenticated Codex CLI; the reference host is only a protocol fixture. Document the difference between a local CLI and model inference that may run on a remote service.
- [ ] Host accurate privacy policy via HTTPS and complete User Data/Privacy Practices declaration; describe what happens when page content is explicitly forwarded to a selected local third-party tool.
- [ ] Supply truthful listing title, short/long descriptions, developer contact, 128x128 icon, screenshots from the *real running extension*, and store promotional assets if required in the selected listing category.
- [ ] Chrome Web Store account and developer verification completed, including any required 2-step verification; review current store policies at submission time.
- [ ] Run `npm run build` (Node 20+, no dependencies). Upload only `dist/local-tool-bridge-v0.3.0.zip`; source/native development fixtures excluded.
- [ ] Test that user-approved HTTP internal sites work without treating Profile JSON or web page as trusted code.
- [ ] Verify no external scripts, telemetry, analytics, automated chat scraping, permission surprises or broken UI; public screenshots match current version.

Official policy references:
- https://developer.chrome.com/docs/webstore/program-policies/policies/
- https://developer.chrome.com/docs/webstore/troubleshooting/
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- https://developer.chrome.com/docs/extensions/reference/api/permissions
