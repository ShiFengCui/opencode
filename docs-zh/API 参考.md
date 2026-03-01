# OpenCode API 参考

> 本文档详细整理 OpenCode 系统的 HTTP API 接口、SSE 事件流和 SDK 使用方法。

## 目录

- [一、通信协议](#一通信协议)
- [二、HTTP API 接口](#二 http-api-接口)
- [三、SSE 事件流](#三 sse-事件流)
- [四、SDK 使用](#四 sdk-使用)
- [五、错误处理](#五错误处理)

---

## 一、通信协议

### 1.1 基础配置

- **服务器地址**: `http://localhost:4096` (默认)
- **Content-Type**: `application/json`
- **认证**: Basic Auth (可选，通过 `OPENCODE_SERVER_PASSWORD` 环境变量配置)
- **用户名**: `opencode` (默认，可通过 `OPENCODE_SERVER_USERNAME` 修改)
- **CORS**: 允许 localhost 和 `*.opencode.ai`

### 1.2 请求头

```typescript
{
  "Content-Type": "application/json",
  "x-opencode-directory": "/path/to/project", // 可选，指定项目目录
  "Authorization": "Basic base64(username:password)" // 可选，如果设置了密码
}
```

### 1.3 Server-Sent Events (SSE)

**连接端点**: `GET /event`

**连接参数**:

```typescript
GET /event?directory=/path/to/project
```

**SSE 事件格式**:

```typescript
{
  "type": "event.type.name",
  "properties": { /* 事件数据 */ }
}
```

**心跳机制**:

- 服务器每 30 秒发送一次心跳事件
- 防止 WKWebView 60 秒超时

---

## 二、HTTP API 接口

### 2.1 会话管理 (Session)

**基础路径**: `/session`

#### 2.1.1 创建会话

```http
POST /session/
Content-Type: application/json

{
  "title": "会话标题",
  "directory": "/path/to/project",
  "permission": [] // 权限规则
}
```

**响应**: `Session.Info`

**代码位置**: `packages/opencode/src/server/routes/session.ts:100-150`

#### 2.1.2 获取会话列表

```http
GET /session/?directory=/path/to/project&roots=true&limit=20
```

**查询参数**:

- `directory`: 项目目录过滤
- `roots`: 仅返回根会话 (无 parentID)
- `start`: 起始时间戳过滤
- `search`: 标题搜索
- `limit`: 返回数量限制

**响应**: `Session.Info[]`

**代码位置**: `packages/opencode/src/server/routes/session.ts:160-200`

#### 2.1.3 获取会话详情

```http
GET /session/:sessionID
```

**响应**: `Session.Info`

#### 2.1.4 删除会话

```http
DELETE /session/:sessionID
```

**响应**: `boolean`

#### 2.1.5 更新会话

```http
PATCH /session/:sessionID
Content-Type: application/json

{
  "title": "新标题",
  "time": {
    "archived": 1234567890
  }
}
```

**响应**: `Session.Info`

#### 2.1.6 会话分叉

```http
POST /session/:sessionID/fork
Content-Type: application/json

{
  "messageID": "message_xxx" // 可选，指定分叉点
}
```

**响应**: `Session.Info`

#### 2.1.7 中止会话

```http
POST /session/:sessionID/abort
```

**响应**: `boolean`

#### 2.1.8 分享会话

```http
POST /session/:sessionID/share
```

**响应**: `Session.Info`

#### 2.1.9 取消分享

```http
DELETE /session/:sessionID/share
```

**响应**: `Session.Info`

---

### 2.2 消息管理 (Message)

**基础路径**: `/session/:sessionID/message`

#### 2.2.1 获取消息列表

```http
GET /session/:sessionID/message?limit=50
```

**查询参数**:

- `limit`: 返回消息数量限制

**响应**: `MessageV2.WithParts[]`

#### 2.2.2 获取单条消息

```http
GET /session/:sessionID/message/:messageID
```

**响应**:

```json
{
  "info": MessageV2.Info,
  "parts": MessageV2.Part[]
}
```

#### 2.2.3 发送消息 (Prompt)

```http
POST /session/:sessionID/message
Content-Type: application/json

{
  "parts": [
    {
      "type": "text",
      "text": "用户输入内容"
    },
    {
      "type": "file",
      "mime": "text/plain",
      "filename": "example.txt",
      "url": "data:text/plain;base64,xxx"
    }
  ],
  "model": {
    "providerID": "anthropic",
    "modelID": "claude-sonnet-4-20250514"
  },
  "agent": "build", // 或 "plan"
  "system": "自定义系统提示词"
}
```

**响应**: 流式 JSON

```json
{
  "info": MessageV2.Assistant,
  "parts": MessageV2.Part[]
}
```

**代码位置**: `packages/opencode/src/server/routes/session.ts:698-738`

#### 2.2.4 异步发送消息

```http
POST /session/:sessionID/prompt_async
Content-Type: application/json

// 参数同上
```

**响应**: `204 No Content` (立即返回，后台处理)

#### 2.2.5 发送命令

```http
POST /session/:sessionID/command
Content-Type: application/json

{
  "command": "命令名称",
  "args": ["参数 1", "参数 2"]
}
```

**响应**: `MessageV2.WithParts`

#### 2.2.6 执行 Shell 命令

```http
POST /session/:sessionID/shell
Content-Type: application/json

{
  "command": "ls -la",
  "description": "列出文件",
  "timeout": 120000
}
```

**响应**: `MessageV2.Assistant`

#### 2.2.7 删除消息部分

```http
DELETE /session/:sessionID/message/:messageID/part/:partID
```

**响应**: `boolean`

#### 2.2.8 更新消息部分

```http
PATCH /session/:sessionID/message/:messageID/part/:partID
Content-Type: application/json

// MessageV2.Part 完整对象
{
  "id": "part_xxx",
  "sessionID": "session_xxx",
  "messageID": "message_xxx",
  "type": "text",
  "text": "更新后的文本"
}
```

**响应**: `MessageV2.Part`

#### 2.2.9 回滚消息

```http
POST /session/:sessionID/revert
Content-Type: application/json

{
  "messageID": "message_xxx"
}
```

**响应**: `Session.Info`

#### 2.2.10 恢复回滚

```http
POST /session/:sessionID/unrevert
```

**响应**: `Session.Info`

---

### 2.3 权限管理 (Permission)

**基础路径**: `/permission`

#### 2.3.1 获取待处理权限

```http
GET /permission/
```

**响应**: `PermissionNext.Request[]`

#### 2.3.2 响应权限请求

```http
POST /permission/:requestID/reply
Content-Type: application/json

{
  "reply": "once" | "always" | "reject",
  "message": "可选的回复消息"
}
```

**响应**: `boolean`

**权限回复类型**:

- `once`: 仅允许本次
- `always`: 总是允许 (添加到规则)
- `reject`: 拒绝

---

### 2.4 项目管理 (Project)

**基础路径**: `/project`

#### 2.4.1 获取项目信息

```http
GET /project/
```

**响应**: `Project.Info`

#### 2.4.2 获取工作目录

```http
GET /path
```

**响应**:

```json
{
  "home": "/Users/username",
  "state": "/Users/username/.opencode/state",
  "config": "/Users/username/.opencode/config",
  "worktree": "/path/to/worktree",
  "directory": "/path/to/project"
}
```

#### 2.4.3 获取 VCS 信息

```http
GET /vcs
```

**响应**:

```json
{
  "branch": "main"
}
```

---

### 2.5 提供商管理 (Provider)

**基础路径**: `/provider`

#### 2.5.1 获取提供商列表

```http
GET /provider/
```

**响应**: `Provider.Info[]`

#### 2.5.2 获取模型列表

```http
GET /provider/:providerID/model
```

**响应**: `Provider.Model[]`

#### 2.5.3 设置认证信息

```http
PUT /auth/:providerID
Content-Type: application/json

{
  "apiKey": "sk-xxx",
  "endpoint": "https://api.example.com"
}
```

**响应**: `boolean`

#### 2.5.4 删除认证信息

```http
DELETE /auth/:providerID
```

**响应**: `boolean`

---

### 2.6 文件操作 (File)

**基础路径**: `/`

#### 2.6.1 读取文件

```http
GET /file?path=/absolute/path/to/file.txt
```

**响应**: 文件内容

#### 2.6.2 写入文件

```http
POST /file
Content-Type: application/json

{
  "path": "/absolute/path/to/file.txt",
  "content": "文件内容"
}
```

**响应**: `boolean`

#### 2.6.3 删除文件

```http
DELETE /file
Content-Type: application/json

{
  "path": "/absolute/path/to/file.txt"
}
```

**响应**: `boolean`

---

### 2.7 MCP 管理

**基础路径**: `/mcp`

#### 2.7.1 获取 MCP 服务器列表

```http
GET /mcp/
```

**响应**: `MCP.Server[]`

#### 2.7.2 添加 MCP 服务器

```http
POST /mcp
Content-Type: application/json

{
  "name": "server-name",
  "command": "npx",
  "args": ["-y", "@example/mcp-server"]
}
```

**响应**: `boolean`

#### 2.7.3 移除 MCP 服务器

```http
DELETE /mcp/:name
```

**响应**: `boolean`

#### 2.7.4 获取 MCP 工具

```http
GET /mcp/tools
```

**响应**: `MCP.Tool[]`

---

### 2.8 配置管理

**基础路径**: `/config`

#### 2.8.1 获取配置

```http
GET /config/
```

**响应**: `Config.Info`

#### 2.8.2 更新配置

```http
POST /config
Content-Type: application/json

{
  "key": "config-key",
  "value": "config-value"
}
```

**响应**: `boolean`

---

### 2.9 系统接口

#### 2.9.1 获取 Agent 列表

```http
GET /agent
```

**响应**: `Agent.Info[]`

**内置 Agent**:

- `build`: 默认，完整访问权限
- `plan`: 只读，分析模式

#### 2.9.2 获取 Skill 列表

```http
GET /skill
```

**响应**: `Skill.Info[]`

#### 2.9.3 获取 LSP 状态

```http
GET /lsp
```

**响应**: `LSP.Status[]`

#### 2.9.4 获取格式化器状态

```http
GET /formatter
```

**响应**: `Format.Status[]`

#### 2.9.5 获取命令列表

```http
GET /command
```

**响应**: `Command.Info[]`

#### 2.9.6 写入日志

```http
POST /log
Content-Type: application/json

{
  "service": "client",
  "level": "info" | "debug" | "error" | "warn",
  "message": "日志消息",
  "extra": { /* 元数据 */ }
}
```

**响应**: `boolean`

#### 2.9.7 获取会话状态

```http
GET /session/status
```

**响应**: `Record<sessionID, SessionStatus.Info>`

**状态类型**:

- `active`: 活跃
- `idle`: 空闲
- `completed`: 完成

#### 2.9.8 实例化项目

```http
POST /session/:sessionID/init
Content-Type: application/json

{
  "agent": "build"
}
```

**响应**: `boolean`

#### 2.9.9 会话摘要

```http
POST /session/:sessionID/summarize
Content-Type: application/json

{
  "providerID": "anthropic",
  "modelID": "claude-sonnet-4-20250514",
  "auto": false
}
```

**响应**: `boolean`

#### 2.9.10 获取消息 Diff

```http
GET /session/:sessionID/diff?messageID=message_xxx
```

**响应**: `Snapshot.FileDiff[]`

#### 2.9.11 处置实例

```http
POST /instance/dispose
```

**响应**: `boolean`

#### 2.9.12 获取待处理问题

```http
GET /question/
```

**响应**: `Question.Request[]`

#### 2.9.13 回复问题

```http
POST /question/:requestID/reply
Content-Type: application/json

{
  "reply": "allow" | "reject",
  "message": "可选回复"
}
```

**响应**: `boolean`

---

## 三、SSE 事件流

### 3.1 事件订阅

**端点**: `GET /event`

**连接示例**:

```typescript
const eventSource = new EventSource(`${serverUrl}/event?directory=${encodeURIComponent(projectDir)}`)

eventSource.addEventListener("message", (event) => {
  const data = JSON.parse(event.data)
  console.log("Event:", data.type, data.properties)
})
```

### 3.2 事件类型

#### 3.2.1 服务器事件

| 事件类型                   | 说明            | 数据                    |
| -------------------------- | --------------- | ----------------------- |
| `server.connected`         | 客户端连接成功  | `{}`                    |
| `server.heartbeat`         | 心跳 (每 30 秒) | `{}`                    |
| `server.instance.disposed` | 实例已处置      | `{ directory: string }` |
| `global.disposed`          | 全局处置事件    | `{}`                    |

#### 3.2.2 会话事件

| 事件类型          | 说明      | 数据                                          |
| ----------------- | --------- | --------------------------------------------- |
| `session.created` | 会话创建  | `{ info: Session.Info }`                      |
| `session.updated` | 会话更新  | `{ info: Session.Info }`                      |
| `session.deleted` | 会话删除  | `{ sessionID: string }`                       |
| `session.error`   | 会话错误  | `{ sessionID: string, error: Error }`         |
| `session.diff`    | 会话 Diff | `{ sessionID, messageID, diffs: FileDiff[] }` |

#### 3.2.3 消息事件

| 事件类型               | 说明         | 数据                                       |
| ---------------------- | ------------ | ------------------------------------------ |
| `message.updated`      | 消息更新     | `{ info: Message.Info }`                   |
| `message.removed`      | 消息删除     | `{ sessionID, messageID }`                 |
| `message.part.updated` | 消息部分更新 | `{ part: MessageV2.Part, delta?: string }` |
| `message.part.removed` | 消息部分删除 | `{ sessionID, messageID, partID }`         |

#### 3.2.4 权限事件

| 事件类型           | 说明     | 数据                                            |
| ------------------ | -------- | ----------------------------------------------- |
| `permission.asked` | 请求权限 | `{ id, sessionID, permission, metadata, tool }` |

#### 3.2.5 项目事件

| 事件类型             | 说明     | 数据                 |
| -------------------- | -------- | -------------------- |
| `project.updated`    | 项目更新 | `Project.Info`       |
| `vcs.branch.updated` | 分支更新 | `{ branch: string }` |

#### 3.2.6 文件事件

| 事件类型               | 说明           | 数据               |
| ---------------------- | -------------- | ------------------ |
| `file.watcher.updated` | 文件监视器更新 | `{}`               |
| `file.edited`          | 文件编辑       | `{ path: string }` |

#### 3.2.7 LSP 事件

| 事件类型                 | 说明     | 数据                         |
| ------------------------ | -------- | ---------------------------- |
| `lsp.updated`            | LSP 更新 | `{}`                         |
| `lsp.client.diagnostics` | LSP 诊断 | `{ serverID, path: string }` |

#### 3.2.8 MCP 事件

| 事件类型                  | 说明               | 数据                   |
| ------------------------- | ------------------ | ---------------------- |
| `mcp.tools.changed`       | MCP 工具变更       | `{ serverID: string }` |
| `mcp.browser.open.failed` | MCP 浏览器打开失败 | `{ error: string }`    |

#### 3.2.9 安装事件

| 事件类型                        | 说明     | 数据                  |
| ------------------------------- | -------- | --------------------- |
| `installation.updated`          | 安装更新 | `{ version: string }` |
| `installation.update-available` | 有新版本 | `{ version: string }` |

#### 3.2.10 其他事件

| 事件类型               | 说明       | 数据                          |
| ---------------------- | ---------- | ----------------------------- |
| `pty.created`          | PTY 创建   | `{ info: PTY.Info }`          |
| `pty.updated`          | PTY 更新   | `{ info: PTY.Info }`          |
| `pty.exited`           | PTY 退出   | `{ id, exitCode: number }`    |
| `pty.deleted`          | PTY 删除   | `{ id }`                      |
| `command.executed`     | 命令执行   | `{ command, args, exitCode }` |
| `question.asked`       | 问题询问   | `Question.Request`            |
| `question.replied`     | 问题回复   | `{ requestID, reply }`        |
| `question.rejected`    | 问题拒绝   | `{ requestID }`               |
| `worktree.ready`       | 工作树就绪 | `{ directory }`               |
| `worktree.failed`      | 工作树失败 | `{ directory, error }`        |
| `session.status`       | 会话状态   | `SessionStatus.Info`          |
| `session.status.idle`  | 会话空闲   | `{ sessionID }`               |
| `session.todo.updated` | Todo 更新  | `Todo.Info[]`                 |
| `session.compacted`    | 会话压缩   | `{ sessionID }`               |

---

## 四、SDK 使用

### 4.1 安装

```bash
npm install @opencode-ai/sdk
# 或
bun add @opencode-ai/sdk
```

### 4.2 初始化客户端

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

// 基础配置
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
})

// 带认证配置
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
  headers: {
    Authorization: "Basic " + btoa("opencode:password"),
  },
})

// 指定项目目录
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
  directory: "/path/to/project",
})
```

### 4.3 API 调用示例

#### 创建会话

```typescript
const session = await client.session.create({
  body: {
    title: "我的会话",
    agent: "build",
  },
})

console.log(session.id) // "session_xxx"
```

#### 发送消息

```typescript
const response = await client.session.message({
  path: { sessionID: session.id },
  body: {
    parts: [{ type: "text", text: "帮我写一个排序函数" }],
    model: {
      providerID: "anthropic",
      modelID: "claude-sonnet-4-20250514",
    },
  },
})

console.log(response.info) // 消息信息
console.log(response.parts) // 消息部分
```

#### 订阅事件

```typescript
import { OpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
})

// 使用 EventSource (浏览器)
const eventSource = new EventSource(`${client.config.baseUrl}/event`)

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)

  switch (data.type) {
    case "message.part.updated":
      console.log("消息部分更新:", data.properties.part)
      break
    case "permission.asked":
      console.log("权限请求:", data.properties)
      break
  }
}
```

#### 响应权限请求

```typescript
// 收到 permission.asked 事件后
await client.permission.reply({
  path: { requestID: "perm_xxx" },
  body: {
    reply: "always", // 或 "once", "reject"
  },
})
```

### 4.4 SDK 类型

所有类型定义在 `packages/sdk/js/src/gen/types.gen.ts`:

```typescript
// 主要类型
import type {
  Session, // 会话信息
  MessageV2, // 消息
  MessagePart, // 消息部分
  PermissionRequest, // 权限请求
  Provider, // AI 提供商
  Agent, // Agent
  Event, // SSE 事件
} from "@opencode-ai/sdk"
```

### 4.5 SDK 生成

当修改服务器 API 后，需要重新生成 SDK:

```bash
./packages/sdk/js/script/build.ts
```

**生成流程**:

1. 从 Hono 路由生成 OpenAPI 规范
2. 使用 `@hey-api/openapi-ts` 生成 TypeScript 客户端
3. 更新 `packages/sdk/js/src/gen/*`

---

## 五、错误处理

### 5.1 HTTP 错误码

| 状态码 | 说明           |
| ------ | -------------- |
| 200    | 成功           |
| 204    | 异步操作已接受 |
| 400    | 请求参数错误   |
| 404    | 资源未找到     |
| 500    | 服务器内部错误 |

### 5.2 错误响应格式

```json
{
  "name": "ErrorName",
  "data": {
    "message": "错误描述",
    "statusCode": 500,
    "isRetryable": false,
    "responseHeaders": {},
    "responseBody": ""
  }
}
```

### 5.3 常见错误

#### ProviderAuthError

AI 提供商认证失败

```json
{
  "name": "ProviderAuthError",
  "data": {
    "providerID": "anthropic",
    "message": "Invalid API key"
  }
}
```

#### MessageAbortedError

消息被中止

```json
{
  "name": "MessageAbortedError",
  "data": {
    "message": "Session aborted by user"
  }
}
```

#### NotFoundError

资源未找到

```json
{
  "name": "NotFoundError",
  "data": {
    "message": "Session not found: session_xxx"
  }
}
```

---

## 附录

### A. OpenAPI 规范

完整的 OpenAPI 规范可通过 `GET /doc` 端点获取。

### B. 代码位置索引

| 功能            | 文件路径                                            |
| --------------- | --------------------------------------------------- |
| **HTTP 服务器** | `packages/opencode/src/server/server.ts`            |
| **会话路由**    | `packages/opencode/src/server/routes/session.ts`    |
| **权限路由**    | `packages/opencode/src/server/routes/permission.ts` |
| **文件路由**    | `packages/opencode/src/server/routes/file.ts`       |
| **MCP 路由**    | `packages/opencode/src/server/routes/mcp.ts`        |
| **SSE 端点**    | `packages/opencode/src/server/server.ts:478-531`    |
| **SDK 客户端**  | `packages/sdk/js/src/client.ts`                     |
| **SDK 类型**    | `packages/sdk/js/src/gen/types.gen.ts`              |

### C. 更新日志

本文档最后更新：2026-03-01  
对应 OpenCode 版本：基于 dev 分支
