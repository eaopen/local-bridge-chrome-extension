# Web V2: status-only local MCP (first end-to-end slice)

This is **code under development**, not production approval or an Etech Web deployment.

V1 Chrome popup capture, local Codex summary, manual relay and enterprise Pi remain unchanged. V2 adds a separately permissioned Web API for one bounded **read-only status** MCP tool. It is not a generic MCP executor or a Web Agent adapter.

## Exact user-owned prerequisites

1. Install the independent Local Tool Bridge Chrome extension and Local Bridge Native Host, linked by the real extension ID.
2. Install and register an MCP Provider locally, for example the optional WeChat Provider, using the Local Bridge CLI. The WeChat Provider itself owns app login and permissions. There is no default WeChat install or automatic chat access.
3. As the local OS user, explicitly grant an **exact origin + provider + status tool** pair:

```sh
local-bridge provider add wechat /path/to/installed/wechat-provider serve
local-bridge provider tools wechat
local-bridge web-v2 grant-status https://portal.example.test wechat wechat_status
local-bridge web-v2 capabilities https://portal.example.test
```

4. In Chrome popup, click **Allow this site**, then separately **Enable this site's local MCP status**. These website grants are independent of the local user's CLI grant.
5. From that exact approved top-level Web origin, make a V2 request:

```javascript
const requestId = crypto.randomUUID();
const channel = 'local-tool-bridge:web:v2';
function reply(e) {
  if (e.source !== window || e.origin !== location.origin) return;
  if (e.data?.channel !== channel || e.data?.type !== 'RESPONSE'
      || e.data.requestId !== requestId) return;
  window.removeEventListener('message', reply);
  console.log(e.data.ok ? e.data.result : e.data.code);
}
window.addEventListener('message', reply);
window.postMessage({
  channel, version: 2, type: 'REQUEST', requestId, action: 'mcp.status',
  params: {provider:'wechat', tool:'wechat_status'}
}, location.origin);
```

The content script forwards the message only after the site's basic permission; the Service Worker checks Chrome's real sender origin, top-level frame, separately granted local MCP permission and host V2 availability. The Native Host verifies the **local CLI grant** again and only issues a no-argument status tool call to a user-installed Provider. The original enterprise/CloudFile site is unchanged.

## Deliberate limitations

- Only tool names `status` or ending in `_status` can be granted; every exact tool is checked against the installed provider's declared tool list. No provider registration by website; no generic args, file writes, chat reads, message sends, shell, or arbitrary agent run.
- A provider reporting `mcp_responding_not_app_login_verified` is not proof the user has logged into that application. The tool's own status must be consulted.
- Missing Provider, origin permission or Host returns an actual error; never fake completion. V1 Chrome still works without Local Bridge; CloudFile V1 Host/Agent2 remains separate.
- WorkBuddy/Codex/Pi V2 agent dispatch and business model API use separate scoped authorization and still require additional implementation and real UI/SSO acceptance.
- The Chrome page API and Native Host V2's `protocol_version=2` are separate from CloudFile's ApplicationProfile V1. Do not reuse the CloudFile production Chrome extension ID or Host.
