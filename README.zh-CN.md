# Local Tool Bridge — 独立通用 Chrome 插件

[GitHub Local Bridge](https://github.com/eaopen/local-bridge) · [协议](docs/PROTOCOL_V1.md) · [CloudFile 迁移计划](docs/CLOUDFILE_MIGRATION.md) · [隐私说明](docs/PRIVACY_POLICY.md)

**定位：把 Chrome 中用户选中的网页内容，方便地交给自己已经使用的本机工具。** 这是独立的 Chrome Manifest V3 扩展；不安装 Local Bridge 也能使用。Local Bridge 是重点优化的可选接入对象，其它本地 Native Messaging Provider 也可实现同一协议。

## 两套旧原型已统一

- **Local Tool Bridge v0.1.0（基座）**：按站点授权只读能力发现、Chrome Native Messaging、参考 Host、测试、CI、打包和商店文档。
- **Browser Local Connector v0.1.0（补充体验）**：网页选中或摘要采集、可编辑文本、复制、保存 TXT、连接状态和用户主动发送。
- **合并成果 v0.2.0**：保留第一套的独立协议/站点授权/测试体系，吸收第二套的网页内容编辑、复制、导出等使用能力，且可以在扩展设置中指定其它已经安装的 Native Host 名称。

目前无需 Host 即可使用：点击 Chrome 工具栏扩展图标 → 获取当前页面选中文本（无选中时取页面摘要/标题）→ 编辑 → 复制或保存为 TXT。URL 会去掉 query/hash，避免意外带出跟踪参数或 URL 中的临时凭据。也支持自行输入短文本。

已安装且授权独立 Native Host 时，可按一下「检查 Provider」并主动「发送给 Provider」。**只 ACK 不等于 AI 任务完成**；用户应在目标程序查看完成状态。


## v0.5.0：企业 Web 无个人模型配置使用 Pi

企业已有 AI API 时，用户无需申请 Pi 模型 Key。已登录企业 Web 应用通过其后端获取**短期、限范围**的模型票据；用户只需为该网站单独开启一次本地企业 AI 能力，以后企业网页即可使用 **企业同源 AI API → Chrome 插件 → Local Bridge → 本地 Pi → 返回网页** 的受控文本任务。普通仅授权“网站状态发现”的网页仍没有此权限。网页不允许自定义任意外部模型地址、可执行程序或本机文件工具；短期票据不保存在 Chrome 设置中。

此功能需要企业服务方接入已定义的兼容 API 和票据合同，目前代码/模拟执行可用，**尚未完成真实企业登录与 Chrome GUI 全链路验收**。无需 Local Bridge 时原有网页采集、复制、Web AI 手动接力不受影响。详见 [企业 Web → Pi 接入合同](docs/ENTERPRISE_PI_WEB.md)。

## v0.4.0：手动 Web AI 接力（不是 9Router）

当 Codex 等本地工具额度耗尽或暂时不可用时，可在当前 Popup 选择 ChatGPT/Gemini/Claude/Copilot/DeepSeek 或自定义 HTTPS 聊天网站，点击 **Copy task & open Web AI**，由用户自己粘贴提示词、继续聊天。完成后选择或粘贴一段 AI 回复，可以 **Copy return package** 给任意工具；可选安装 Local Bridge 时，还能调用 `relay.return` 把结果及原任务引用存入已有本地收件箱。

**不自动抓取网页 AI 回复，不接管网页登录，不自动消耗免费额度，不做模型 API 网关，不自动执行模型建议的 MCP/终端操作。** 即使没有 Local Bridge 或任何 Agent，也能使用复制/返回包功能。浏览器本地只保留一个轻量任务关联记录，不保存聊天正文。详见 [使用说明](docs/WEB_AI_RELAY.md)。

## v0.3.0：主动点击本机 AI 摘要

在插件弹窗中选中或编辑内容后，可点击 **Summarize with local AI**。只有用户明确点击且本机 Provider 报告支持 `context.summarize` 时才向 Host 发送内容；普通网页不能调用。Local Bridge 的可选实现复用本机已安装和登录的 Codex CLI，以临时只读模式返回结果；使用其他 Provider 时，由其自行实现兼容协议。

如果没有 Host 或没有支持的 AI，插件的采集、复制、保存等能力完全不受影响。摘要操作不自动触发，默认不保存模型回复；运行期间应保持弹窗打开。**所选 Agent 可能使用云端模型**，发送前请确认内容是否适合由所选模型处理。真实 Chrome/本机 Agent 实机联动仍在验证中。

## 与 Local Bridge 的关系

**通用工具优先、Local Bridge 深度适配、互不强制依赖。** 新插件可以通过用户设置连接不同的 Native Messaging Host，默认主机名为 `com.eaopen.browser_bridge`；未来 Local Bridge 作为其中一个具体实现，既能调用本机 MCP/Agent，也能衔接其它本地能力。扩展里可以提供 Local Bridge 项目的可选了解链接，但不进行强制安装、流量追踪或未经用户触发的自动调用。

## 逐步替代 CloudFile 插件（不是直接接管）

现有 CloudFile Chrome Extension 继续服务正在使用的文件查看、普通编辑和独占编辑，旧扩展 ID、Native Host、SSO、Journal 和版本提交都不改变。新插件的长期方向是通过**文件能力 Adapter** 接入同一 CloudFile Agent2 引擎，等到 Chrome、Windows/macOS 和真实服务端验收通过后，再考虑默认入口切换和旧插件下线。详情见 [迁移计划](docs/CLOUDFILE_MIGRATION.md)。

## 开发和发布

```bash
npm test
npm run build
# Chrome -> chrome://extensions -> 开发者模式 -> 加载已解压的扩展 -> extension/
```

Node 20+ 只在测试/构建时需要；插件无运行时 npm 依赖。商店包为 `dist/local-tool-bridge-v0.5.0.zip`。正式上架还需要发布者验证、固定扩展 ID、真实 Chrome/系统验证、截图、HTTPS 隐私政策与 Chrome Web Store 审核；**仓库代码通过测试不意味着已经上架**。

[Chrome Web Store 准备清单](docs/STORE_RELEASE.md) · [开发约束 AGENTS.md](AGENTS.md)
