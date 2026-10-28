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

## Unified Agent run/read (V2, WorkBuddy currently runnable)

A separately granted Web origin can submit one text-only WorkBuddy task and poll the short-lived event log. This uses a **different per-site Agent grant** from MCP status and a separate OS-user command:

```sh
local-bridge web-v2 grant-workbuddy https://your-enterprise-web.example
# revoke later
local-bridge web-v2 revoke-workbuddy https://your-enterprise-web.example
```

Web sends `agent.run` with `{api_version:2,client_key,prompt,agent,model,think_mode,agent_mode}` and receives `status:"accepted",task_id`; only `agent.read` with `{task_id,cursor}` can retrieve ordered `seq` events, including multiple `message.delta`/`message.final` pairs and a distinct final `task.completed`. Do not interpret a message final as task completion. A lost start response must be retried using the **same** client_key, never a new task key. The user may revoke either site or local grant without affecting Etech or CloudFile V1.

The WorkBuddy native worker currently targets macOS Desktop 5.9.x / Node 24+ and is **not live tested through corporate Web/Chrome**; absence of WorkBuddy must report unavailable. It launches a separate ACP session using the current logged-in desktop account; file, MCP, shell and tool actions remain disabled.


## V2 direct HTTP/SSE (preferred)

Chrome is a connection/authentication helper, not the continuous WorkBuddy message transport. After explicit per-origin Chrome and local OS-user grants, the page invokes local.connect once. The Native Host returns a short-lived, origin-scoped credential and localhost endpoint, kept only in page memory.

The Bridge CLI command web-v2 serve binds 127.0.0.1:48293 (never a LAN interface). The page directly uses /v2/capabilities, /v2/workbuddy/tasks, /v2/workbuddy/tasks/{id}/stream?cursor=N (HTTP SSE), /v2/workbuddy/tasks/{id}/events?cursor=N, and /v2/mcp/status. Authentication uses the Authorization Bearer header, never a query-string token. The loopback service checks exact Host, Origin, local user grant and session expiry.

If loopback fetch/SSE is blocked by browser Local Network Access permissions, CORS, or an unavailable daemon, the page falls back to the already implemented short Chrome Native Messaging agent.run/agent.read, preserving client_key and task_id so WorkBuddy is not submitted twice. Original Etech chat and CloudFile V1 are independent.

SSE is the first one-way event channel, supporting multiple assistant messages and explicit terminal states. WebSocket can be added later for interactive tool approval; it must reuse the same task store and authorization, not another agent/task engine. Real Chrome GUI + signed-in WorkBuddy end-to-end acceptance is still pending.


## 2026-10-28: Agent V2 interface cleanup and Chrome LNA

- **Only current V2 API**: `agent.run` / `agent.read` on Chrome Native, `runAgent/readAgent` in Web SDK, and `/v2/agents/tasks` on the local HTTP/SSE service. All on-wire run requests require `api_version:2`. Previous unshipped vendor-specific V2 agent start/poll and HTTP task routes have been removed. WorkBuddy still owns its worker and message events internally; Codex/Pi Web adapters are not yet verified.
- **Selectors**: `agent=auto|workbuddy|codex|pi`, optional `model`, `think_mode=auto|off|low|medium|high|xhigh|max`, `agent_mode=prefer|require`. Bridge selects one real authorized adapter before starting; unsupported explicit model or think mode is rejected rather than silently downgraded. `accepted` is not `completed`.
- **Local HTTP default**: plain `127.0.0.1:48293` is a normal supported transport. Chrome 142 introduced Local Network Access prompts; Chrome 145 split `loopback-network` and `local-network`. Users may be asked by Chrome to grant loopback permission. With permission, browser mixed-content exceptions allow HTTP local connections in qualifying secure contexts. If blocked, Native Messaging fallback is preserved, including from enterprise HTTP sites that do not qualify as secure contexts.
- **HTTPS optional**: a user/enterprise may independently deploy an OS/browser-trusted TLS terminator at `https://localhost:48294` or `https://127.0.0.1:48294`, with the proxy preserving Origin and authorization. Bridge itself does **not** create TLS certs, install CAs, bypass browser certificate warnings or require TLS for loopback.
- Website / OS-user authorization remains explicit and exact-Origin. The local service must reject mismatched Host/Origin and bearer, never expose the port on LAN, and never use wildcard CORS.

References: [Chrome 142](https://developer.chrome.com/release-notes/142), [Chrome 145](https://developer.chrome.com/release-notes/145), [Local Network Access](https://developer.chrome.com/blog/local-network-access).
