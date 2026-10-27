# Local development and native host smoke test

Node >=20 is required only for running tests/package or **optional sample native host**. The extension itself uses only browser APIs and has no npm runtime dependency.

1. Run `npm test` and `npm run build`.
2. Open Chrome `chrome://extensions`, toggle Developer mode, choose **Load unpacked** and select `extension/`.
3. Open a normal `https://` page, select some text, click toolbar icon → **Capture**, edit, **Copy** or **Save .txt**. This works without Local Bridge.
4. For approved-Web testing: click **Allow this site**, reload site if needed, open devtools and execute `extension.status` snippet from [PROTOCOL_V1.md](PROTOCOL_V1.md). Disable and confirm further requests return no answer or `site_not_allowed`.
5. To test optional Native Messaging, use Node 20+ as a reference host:
   - Create a wrapper executable script that launches `node /absolute/path/native-host/reference-host.mjs`. Do not register the `.mjs` directly as a Chrome native host on Windows.
   - Copy `native-host/manifest.example.json` and set `path` to wrapper's absolute path, `allowed_origins` to the unpacked extension's real `chrome-extension://<id>/`.
   - Register host name `com.eaopen.browser_bridge` using Chrome's documented OS-specific method (Windows HKCU NativeMessagingHosts registry key; macOS/Linux per-user NativeMessagingHosts directory).
   - Click **Check provider**. It must say `reference-host`. Click **Send to provider**; it must explicitly say not forwarded.
6. No registration is required for the extension's standalone functionality. Do not register/overwrite the existing CloudFile Host.

**Note:** Store-signed extension IDs can differ from unpacked IDs. The native manifest needs the actual extension ID. Local Bridge CLI `mcp` stdio expects newline JSON and is **not itself a Chrome Native Messaging host**; don't register `local-bridge mcp` as host directly.
