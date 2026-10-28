# Web AI Relay V1 — manual task handoff, not a model gateway

This feature helps when a local Agent (e.g., Codex) is out of quota or unavailable. It **does not** turn free consumer Web Chat into a programmable API. The user is responsible for logging in, pasting the prompt, choosing a chat model and copying back the response. Quotas, service terms and data rules of each chat site still apply.

## From the Chrome popup (works without Local Bridge)

1. **Capture** or type a short task/selection in the existing user-editable preview.
2. Expand **WEB AI RELAY · Manual fallback**, choose ChatGPT, Gemini, Claude, Copilot, DeepSeek or a custom **HTTPS** chat site. Optionally enter an existing Local Bridge inbox/task reference (e.g. `ctx-...`).
3. Click **Copy task & open Web AI**. Only a prepared prompt is put on the clipboard; the extension opens the selected website. It does **not** fill the chat, click Send, scrape responses, access cookies or use a model API. Paste the prompt yourself.
4. After chatting, choose a useful part of the response. Open the extension, click **Use selected reply from this tab**, or manually paste into the reply text field. Review it.
5. Click **Copy return package** to use the result with any local app, **without a Native Host**. Alternatively, click **Return to local provider** if your separately installed, user-authorized Native Messaging Host advertises `relay.return`.
6. The optional Local Bridge Host saves a **received**, **unverified** response in its existing private inbox, carrying a source and optional original task reference. It never automatically applies code, invokes MCP tools or marks the source task complete.

Only **one pending relay descriptor** is retained in `chrome.storage.local`: random relay identifier, optional task reference, destination label, time, original page title and URL with query/fragment removed. The selected task text, full prompt and AI reply are **not** retained in extension storage. Click **Forget relay link** to discard this metadata; any previously saved Local Bridge inbox item is separate.

## From a previously saved Local Bridge task

```sh
local-bridge inbox list
local-bridge relay prepare ctx-<existing-inbox-id>
```

Copy the resulting `prompt` into any consumer Web AI chat. The output includes the original `task_ref`. When copying back via the Chrome extension, paste that reference in the optional field to link the reply to the original task in the local inbox.

In the Chrome extension on the Web AI tab, enter that original task reference and click **Link existing local task (return only)**. Then select/paste the AI reply and use Copy return package or Return to local provider. This avoids creating another Web AI prompt just to attach the reply. The link does not read the task from Local Bridge; it is only metadata supplied by the user.

The CLI never launches a model, opens a chat or sends content to a remote service.

## Optional Native Messaging action

Compatible hosts may advertise `relay.return` beside `host.status`, `context.share` and `context.summarize`. The extension allows it **only** from the user-triggered popup, never from an approved website, iframe or page script.

The typed, bounded request includes `relay_id`, optional `task_ref`, `web_ai` label, sanitized source `{title,url}` and reviewed reply `{title,url,selection}`. Local Bridge replies `{received:true,stored:true,status:"received",task_id:"ctx-..."}` on durable local inbox storage. This is not `completed` and no original local task is modified.

The general Web SDK continues to expose only read-only `extension.status` and `native.status`. All Chrome Native Providers and Local Bridge remain optional. Existing CloudFile extension and Agent2 are not changed. WeChat Provider remains optional.

## Explicit non-goals

No browser chat DOM scraping, cookie/session extraction, invisible automation, quota monitoring, automatic provider failover, hosted API proxy, model-price comparison, 9Router-style provider switching, universal chat history or automatic tool execution from model-generated instructions. If programmatic model access is needed, use a separately authorized official API through a distinct Provider rather than this feature.

The user chooses what is pasted into a cloud Web AI. Only use permitted data; enterprise documents and credentials must follow the original application's policies. A user may copy a model's *suggested* patch, but must verify changes locally before applying them. Chrome Web Store publication and real browser Host integration still require target-device acceptance.
