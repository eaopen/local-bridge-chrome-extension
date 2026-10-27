# Generic Chrome capabilities — capability-first roadmap

The extension exists to connect the user's **browser context and deliberately permitted browser actions** to the local tools they already use. Neither Local Bridge nor CloudFile is a required install. The browser extension never becomes the identity provider or business-authorization authority.

| Capability ID (proposed) | Why users need it | V0.2 status | Permission/review expectation |
|---|---|---|---|
| `browser.page.context` | Hand off the page being read to an AI or desktop app | **Implemented in popup** (title, cleaned URL, selection or summary; editable preview, local Copy/Save, optional explicit handoff) | `activeTab`, `scripting`, direct user action |
| `browser.extension.status` | Approved Web app discovers whether browser companion is available | **Implemented**: per-origin opt-in read-only Web API | `scripting`, individually granted optional hosts |
| `browser.native.status` | User or approved site knows whether optional local host exists | **Implemented** with optional native permission | `nativeMessaging` optional |
| `browser.tabs.list` | Local agent suggests tabs related to a task | Planned, not advertised | Optional `tabs`, specific user grant; URLs/titles are sensitive |
| `browser.tabs.open` | Hand a reviewed URL/result back into the browser | Planned, not advertised | Typed URLs, user or trusted action, Chrome tabs API |
| `browser.page.extract` | Extract user-approved page content in an agreed schema | Planned, not advertised | Per-site origin grant; limit data, no broad scraping |
| `browser.capture.visible` | Show the local Agent what the user is seeing | Planned, not advertised | Explicit user gesture and visible capture; higher privacy impact |
| `browser.downloads` | Reuse existing browser download flow | Planned, not advertised | Explicit download permission, no automatic bulk transfers |
| `browser.site.action` | Let approved enterprise Web trigger a specific browser-side command | Planned, not advertised | Separate typed action contract + user's original system authorization |

**Do not add permissions now to future-proof those planned features.** Keep the Chrome Web Store single browser purpose and let users grant each additional capability only when implemented and actually needed. A user who only wants to copy current-page context should never have to install Local Bridge or approve browsing history access.

Long-lived bidirectional Native Host requests would need a reviewed `connectNative()` protocol with task correlation and explicit per-capability restrictions; v0.2 currently uses only user-initiated `sendNativeMessage()` calls. A future provider-independent local host must not accept arbitrary shell, executable paths, webpage-supplied identity claims or unchecked commands.

Principle: **browser extension supplies browser capabilities; Local Bridge supplies local task coordination; CloudFile supplies file operations.** Together useful; independently usable.
