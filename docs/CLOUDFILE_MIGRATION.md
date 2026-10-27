# Future CloudFile Chrome Extension replacement — nonbreaking migration

**State: plan only.** Local Tool Bridge v0.2 is not a CloudFile file editor. The existing CloudFile Chrome extension remains the production file operation route until actual end-to-end acceptance.

## Separate products and identities

| Product | Chrome extension | Native host and task owner |
|---|---|---|
| Current CloudFile Chrome Extension | Existing, installed extension ID must stay unchanged | Windows `com.cloudfile.current_agent`; macOS `com.cloudfile.agent2`; Rust DEV `com.cloudfile.agent22.dev`; CloudFile Agent2 owns file data/Journal/Guard |
| New Local Tool Bridge | New independent extension ID and Web Store listing | Generic user-installed `com.eaopen.browser_bridge` or explicitly user-chosen compatible host; optional Local Bridge adapter |
| Local Bridge Rust | Separate independent runtime; extension is NOT a prerequisite | Future optional Chrome Native Host adapter and MCP/Agent tasks; never copies CloudFile file engine |

## Roadmap with real-user value

1. **Generic v0.2 available standalone (current):** selection/summary capture, edit/copy/save, read-only per-site detection, optional Native Host status/user-clicked share.
2. **Local Bridge Native Host adapter:** Local Bridge implements the independent framed V1 `host.status` and `context.share`, with clear task acceptance/state; the extension does not launch arbitrary EXE/CLI based on web content. Native host install registers actual extension ID, per-user Windows/macOS/Linux.
3. **File ability provider (future):** use one typed, scope-bound Chrome→Native request contract for `local-view`, `optimistic-edit`, and `exclusive-edit` that ultimately calls the **existing** CloudFile Rust Agent2 V2 ticket, Journal, Guard, original Seafile version/commit. Do not implement upload/Checkout/Checkin inside this extension.
4. **Backward-compatible coexistence:** old plugin continues handling existing installations and in-flight tasks while a separately installed new plugin supports opt-in verified file tasks. A user can remove one only when their actual workflows have migrated safely.
5. **Acceptance before replacement:** real Windows/macOS + Chrome + CloudFile DEV tests for view/read-only ACL, Office save/upload/version visibility and conflicts, 2-user exclusive Checkout/Commit/Checkin and lease state, offline/restart/unknown reply restoration, user login/SSO, extension/Agent updates, multiple file tasks and safe uninstall/rollback.
6. **Optional switch and retirement:** only after verifiable parity and graceful coexistence; no automatic cross-host retries or V1 fallback when a V2 write result is unknown. The original extensions/Host/Journal are not silently renamed, overwritten or deleted.

## Scope discipline

- No `externally_connectable: http://*/*`, mass content scraping, reading cookies/passwords, or browser-side business authorization.
- CloudFile and application backends still decide file and business ACL, version conditions and whether a user may edit, regardless of which extension supplied the user-initiated connection.
- Personal and enterprise tools can share the same browser plugin by default, but **users choose which provider and operation to use**; this is not an enterprise DLP product.
- Provider APIs remain generic, with a Local Bridge optimized implementation; adding CloudFile-specific browser commands is a separately tested capability module, not the baseline extension's required purpose.

**Implementation owners:** [CloudFile Chrome extension](https://github.com/eaopen/cloudfile-chrome-extension), [CloudFile Agent2](https://github.com/eaopen/cloudfile-local-agent2), [Local Bridge](https://github.com/eaopen/local-bridge), this repo.
