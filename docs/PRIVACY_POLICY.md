# Privacy policy — Local Tool Bridge (pre-publication draft)

Last updated: 2026-10-28. Before publishing, host the finalized policy at an accessible HTTPS URL and link it in Chrome Web Store Developer Dashboard. Publisher identity/contact must be supplied by the actual publisher.

## Single purpose and data use

Local Tool Bridge helps users **capture current page context and pass it to their own desktop tools**. It can operate without any desktop application. It does **not** send analytics, browsing history, or other data to the extension developer's servers. It does not collect passwords, cookies, financial information or background browsing data.

When the user clicks **Capture**, the extension reads the active tab's page **title, URL without query/fragment, and selected text**; if no selection exists it may use that page's public meta description/title as a short summary. It displays a preview only in the popup. The user can edit captured content or type a note; **Copy** uses their clipboard and **Save .txt** creates a user-requested local download. The extension does not automatically upload the text, persist page contents, or capture other tabs in the background.

When the user clicks **Copy**, the content is written to their clipboard. When the user separately grants `nativeMessaging` permission, installs a compatible Native Messaging host, and clicks **Send to local host**, the previewed content is transmitted directly to that *locally installed host*. What a third-party host does with the content is governed by that host/provider's own privacy practices, which the user should review. The development reference host does not store or forward page content.

The optional **Summarize with local AI** button sends the reviewed text to the selected, separately installed native provider only when the user clicks it. The extension first checks that the provider advertises `context.summarize`; sites cannot invoke this action. Local Bridge's optional backend uses the user's installed Codex CLI, which can send the provided text to the user's configured model service, potentially over a network. Other provider integrations may have different data processing behavior. Users should avoid sending confidential information to a provider/model they do not intend to use. This extension does not automatically retain the summary or run AI in the background.

The extension stores only a local list of site origins and the user-selected Native Messaging host name for which the user voluntarily enabled **read-only capability discovery**. Those origins are not uploaded by this extension. User-approved sites can ask for basic extension availability and optional local host status; they cannot use this extension to read content from other tabs, retrieve cookies or run arbitrary native operations.

## User controls

Users may disable each site in the popup, remove permissions from Chrome extension settings, disconnect/uninstall a native host, remove the extension or clear local extension storage. The user controls what page is captured and when it is copied or sent.

## No sale or unsolicited sharing

The extension does not sell user data, display ads, silently transfer data to cloud servers or install remote executable code. If future releases change these practices, this disclosure must be updated before release and user permission requirements revisited.

## Publisher contact

**Required before Chrome Web Store submission:** replace this line with the publisher's actual identity and contact address. This repository draft is not yet a published privacy policy.
