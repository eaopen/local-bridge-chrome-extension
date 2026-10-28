# Security and compatibility (minimal, practical)

- Chrome MV3 only; extension JavaScript is shipped locally, no CDN/runtime eval/remote executable code. No `externally_connectable` wildcard; site-specific optional host permission on user click.
- Background checks the exact Chrome-reported `sender.origin`, registered site, permission, and top frame. Do not trust a claimed `origin`, `actor`, `module`, token, executable path or command inside a page message.
- Site API V1 is *read-only*; Web pages can't enable sites, grant `nativeMessaging`, read selected text across tabs or call `context.share`. This capability is limited to the popup via sender provenance.
- Native host registered by separately installed software; its `allowed_origins` pins a real Chrome extension ID, not `*`; host itself must authorize actions and return true status.
- No use of browser cookies or app SSO tokens. Future enterprise operations obtain limited tickets from the user's original logged-in app; CloudFile file ACL/Guard/Journal remain with CloudFile.
- Explicit capture of active page selection only. Strip query strings/fragments, bound fields/transport size, no background collection and no automatic sending.
- Never display `received` as `completed` or `forwarded` unless the host actually says so. Unknown side-effect results are not automatically retried.
- This is not an enterprise DLP/identity platform. Personal and enterprise usage may coexist, but site/host call provenance and original application permissions still matter.

Known limitation: Chrome host matching doesn't isolate ports. We check and store exact origin (`scheme://host[:port]`) in the service worker, but content-script injection is limited to scheme+hostname; it stays passive on unapproved ports.

- When disabling the last approved origin for a given Chrome host pattern, the popup also attempts to remove that optional host permission. Browser content scripts are registered only for approved sites and the worker rechecks exact origin.

## Explicit local AI summary (v0.3)

The optional `context.summarize` is available **only** via the trusted extension popup click. The background service worker checks the native host's reported capability, sanitizes the current page context, and rejects website-originated requests even for approved sites. No generic command/model/prompt endpoint is opened. Selected content may reach the user's chosen model provider, which can be network-based; never claim that an installed *local client* means the model inference stays entirely on-device. Missing host/feature leaves Copy/Save independent.

## Manual Web AI Relay

Only the popup can copy/open a chosen chat and submit a reviewed `relay.return` request. An approved Web page retains **read-only status queries**, never model/API forwarding or tool invocation. The selected prompt is not automatically sent to the remote chat: the human must paste it. The extension stores one small local source/task descriptor but no prompt or AI transcript. A returned model suggestion is untrusted text, never authority to run local commands, change files, or send messages. No scraping of private Web Chat DOM, tokens or usage limits. No installed Provider is required.
