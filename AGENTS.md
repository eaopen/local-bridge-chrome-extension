# Developer and AI Agent rules

1. Solve the user's friction: connect the selected browser page to their desktop tools, and keep standalone edit/copy/save useful. Do not create a catch-all Chrome app.
2. Keep this repository, extension version, release ID and update stream **independent** from `eaopen/local-bridge` and the existing CloudFile Chrome extension. No takeover of CloudFile browser routes or native host registrations.
3. All page-origin requests from content scripts are untrusted; service worker rechecks Chrome-reported sender origin and only forwards registered typed read-only calls. Webpages may not choose a host, executable, shell command, cookie or long-lived token. An explicit user-only popup setting can select the name of a separately installed and trusted Native Messaging provider.
4. Standalone must work if local host is missing. Optional Native Messaging must be explicit, user-triggered for sending content, and the host must be installed separately.
5. Avoid cloud telemetry, remote code, page-wide scraping and unrelated browser permissions; follow Chrome Web Store Manifest V3 single-purpose and accurate privacy standards.
6. Mark experimental/placeholder native integration honestly. Do not claim a reference host has executed a Local Bridge/Agent task.
7. Prefer narrow tests and one true browser scenario; no overly broad abstraction or governance layers.
8. The optional `context.summarize` path is **popup user-click only**, capability-gated, with a fixed typed payload. Approved webpages may never invoke AI/tools. Do not describe a locally installed CLI as inherently offline: its configured model could be remote.
