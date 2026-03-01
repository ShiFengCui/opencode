# OpenCode 前后端交互文档

> 本文档详细整理 OpenCode 系统的前后端交互流程、API 接口、通信协议和事件系统。

---

## 目录

- [一、架构概述](#一架构概述)
- [二、通信协议](#二通信协议)
- [三、HTTP API 接口](#三 http-api-接口)
- [四、SSE 事件流](#四 sse-事件流)
- [五、数据模型](#五数据模型)
- [六、核心交互流程](#六核心交互流程)
- [七、SDK 使用](#七 sdk-使用)

---

## 一、架构概述

### 1.1 客户端 - 服务器架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │  TUI     │  │  Web     │  │  Desktop │  │  SDK       │ │
│  │ (SolidJS)│  │ (React)  │  │ (Tauri)  │  │ (TypeScript)│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
└───────┼─────────────┼─────────────┼──────────────┼────────┘
        │             │             │              │
        └─────────────┴──────┬──────┴──────────────┘
                             │ HTTP + SSE
┌────────────────────────────▼───────────────────────────────┐
│                      服务器层 (Bun + Hono)                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  REST API  │  SSE Event Stream  │  WebSocket        │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Session  │  Tool  │  Permission  │  Provider       │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 层级         | 技术                                 |
| ------------ | ------------------------------------ |
| **运行时**   | Bun (JavaScript/TypeScript)          |
| **Web 框架** | Hono                                 |
| **前端框架** | SolidJS (TUI), React (Web)           |
| **类型验证** | Zod                                  |
| **AI SDK**   | Vercel AI SDK                        |
| **通信协议** | HTTP REST + Server-Sent Events (SSE) |
| **SDK 生成** | @hey-api/openapi-ts                  |

### 1.3 默认端口

- **服务器端口**: `4096` (默认)
- **协议**: HTTP
- **SSE 端点**: `/event`

---

## 二、通信协议

### 2.1 HTTP REST API

**基础配置:**

- **Content-Type**: `application/json`
- **认证**: Basic Auth (可选，通过 `OPENCODE_SERVER_PASSWORD` 环境变量配置)
- **CORS**: 允许 localhost 和 `*.opencode.ai`

**请求头:**

```typescript
{
  "Content-Type": "application/json",
  "x-opencode-directory": "/path/to/project" // 可选，指定项目目录
}
```

### 2.2 Server-Sent Events (SSE)

**连接端点**: `GET /event`

**连接参数:**

```typescript
GET /event?directory=/path/to/project
```

**SSE 事件格式:**

```typescript
{
  "type": "event.type.name",
  "properties": { /* 事件数据 */ }
}
```

**心跳机制:**

- 服务器每 30 秒发送一次心跳事件
- 防止 WKWebView 60 秒超时

**连接生命周期:**

```typescript
1. 客户端发起 SSE 连接
2. 服务器发送 `server.connected` 事件
3. 订阅所有 Bus 事件并推送
4. 收到 `global.disposed` 事件时关闭连接
5. 客户端断开时清理订阅
```

### 2.3 错误响应格式

**标准错误响应:**

```json
{
  "name": "ErrorName",
  "data": {
    "message": "错误描述信息",
    "statusCode": 500,
    "isRetryable": false
  }
}
```

**常见错误类型:**

- `ProviderAuthError`: AI 提供商认证失败
- `MessageOutputLengthError`: 响应超出长度限制
- `MessageAbortedError`: 消息被中止
- `APIError`: API 调用错误
- `NotFoundError`: 资源未找到 (404)

---

## 三、HTTP API 接口

### 3.1 会话管理 (Session)

**基础路径**: `/session`

#### 3.1.1 创建会话

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

#### 3.1.2 获取会话列表

```http
GET /session/?directory=/path/to/project&roots=true&limit=20
```

**查询参数:**

- `directory`: 项目目录过滤
- `roots`: 仅返回根会话 (无 parentID)
- `start`: 起始时间戳过滤
- `search`: 标题搜索
- `limit`: 返回数量限制

**响应**: `Session.Info[]`

#### 3.1.3 获取会话详情

```http
GET /session/:sessionID
```

**响应**: `Session.Info`

#### 3.1.4 删除会话

```http
DELETE /session/:sessionID
```

**响应**: `boolean`

#### 3.1.5 更新会话

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

#### 3.1.6 会话分叉

```http
POST /session/:sessionID/fork
Content-Type: application/json

{
  "messageID": "message_xxx" // 可选，指定分叉点
}
```

**响应**: `Session.Info`

#### 3.1.7 中止会话

```http
POST /session/:sessionID/abort
```

**响应**: `boolean`

#### 3.1.8 分享会话

```http
POST /session/:sessionID/share
```

**响应**: `Session.Info`

#### 3.1.9 取消分享

```http
DELETE /session/:sessionID/share
```

**响应**: `Session.Info`

---

### 3.2 消息管理 (Message)

**基础路径**: `/session/:sessionID/message`

#### 3.2.1 获取消息列表

```http
GET /session/:sessionID/message?limit=50
```

**查询参数:**

- `limit`: 返回消息数量限制

**响应**: `MessageV2.WithParts[]`

#### 3.2.2 获取单条消息

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

#### 3.2.3 发送消息 (Prompt)

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

#### 3.2.4 异步发送消息

```http
POST /session/:sessionID/prompt_async
Content-Type: application/json

// 参数同上
```

**响应**: `204 No Content` (立即返回，后台处理)

#### 3.2.5 发送命令

```http
POST /session/:sessionID/command
Content-Type: application/json

{
  "command": "命令名称",
  "args": ["参数 1", "参数 2"]
}
```

**响应**: `MessageV2.WithParts`

#### 3.2.6 执行 Shell 命令

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

#### 3.2.7 删除消息部分

```http
DELETE /session/:sessionID/message/:messageID/part/:partID
```

**响应**: `boolean`

#### 3.2.8 更新消息部分

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

#### 3.2.9 回滚消息

```http
POST /session/:sessionID/revert
Content-Type: application/json

{
  "messageID": "message_xxx"
}
```

**响应**: `Session.Info`

#### 3.2.10 恢复回滚

```http
POST /session/:sessionID/unrevert
```

**响应**: `Session.Info`

---

### 3.3 权限管理 (Permission)

**基础路径**: `/permission`

#### 3.3.1 获取待处理权限

```http
GET /permission/
```

**响应**: `PermissionNext.Request[]`

#### 3.3.2 响应权限请求

```http
POST /permission/:requestID/reply
Content-Type: application/json

{
  "reply": "once" | "always" | "reject",
  "message": "可选的回复消息"
}
```

**响应**: `boolean`

**权限回复类型:**

- `once`: 仅允许本次
- `always`: 总是允许 (添加到规则)
- `reject`: 拒绝

---

### 3.4 项目管理 (Project)

**基础路径**: `/project`

#### 3.4.1 获取项目信息

```http
GET /project/
```

**响应**: `Project.Info`

#### 3.4.2 获取工作目录

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

#### 3.4.3 获取 VCS 信息

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

### 3.5 提供商管理 (Provider)

**基础路径**: `/provider`

#### 3.5.1 获取提供商列表

```http
GET /provider/
```

**响应**: `Provider.Info[]`

#### 3.5.2 获取模型列表

```http
GET /provider/:providerID/model
```

**响应**: `Provider.Model[]`

#### 3.5.3 设置认证信息

```http
PUT /auth/:providerID
Content-Type: application/json

{
  "apiKey": "sk-xxx",
  "endpoint": "https://api.example.com"
}
```

**响应**: `boolean`

#### 3.5.4 删除认证信息

```http
DELETE /auth/:providerID
```

**响应**: `boolean`

---

### 3.6 文件操作 (File)

**基础路径**: `/`

#### 3.6.1 读取文件

```http
GET /file?path=/absolute/path/to/file.txt
```

**响应**: 文件内容

#### 3.6.2 写入文件

```http
POST /file
Content-Type: application/json

{
  "path": "/absolute/path/to/file.txt",
  "content": "文件内容"
}
```

**响应**: `boolean`

#### 3.6.3 删除文件

```http
DELETE /file
Content-Type: application/json

{
  "path": "/absolute/path/to/file.txt"
}
```

**响应**: `boolean`

---

### 3.7 MCP 管理

**基础路径**: `/mcp`

#### 3.7.1 获取 MCP 服务器列表

```http
GET /mcp/
```

**响应**: `MCP.Server[]`

#### 3.7.2 添加 MCP 服务器

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

#### 3.7.3 移除 MCP 服务器

```http
DELETE /mcp/:name
```

**响应**: `boolean`

#### 3.7.4 获取 MCP 工具

```http
GET /mcp/tools
```

**响应**: `MCP.Tool[]`

---

### 3.8 配置管理

**基础路径**: `/config`

#### 3.8.1 获取配置

```http
GET /config/
```

**响应**: `Config.Info`

#### 3.8.2 更新配置

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

### 3.9 系统接口

#### 3.9.1 获取 Agent 列表

```http
GET /agent
```

**响应**: `Agent.Info[]`

**内置 Agent:**

- `build`: 默认，完整访问权限
- `plan`: 只读，分析模式

#### 3.9.2 获取 Skill 列表

```http
GET /skill
```

**响应**: `Skill.Info[]`

#### 3.9.3 获取 LSP 状态

```http
GET /lsp
```

**响应**: `LSP.Status[]`

#### 3.9.4 获取格式化器状态

```http
GET /formatter
```

**响应**: `Format.Status[]`

#### 3.9.5 获取命令列表

```http
GET /command
```

**响应**: `Command.Info[]`

#### 3.9.6 写入日志

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

#### 3.9.7 获取会话状态

```http
GET /session/status
```

**响应**: `Record<sessionID, SessionStatus.Info>`

**状态类型:**

- `active`: 活跃
- `idle`: 空闲
- `completed`: 完成

#### 3.9.8 实例化项目

```http
POST /session/:sessionID/init
Content-Type: application/json

{
  "agent": "build"
}
```

**响应**: `boolean`

#### 3.9.9 会话摘要

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

#### 3.9.10 获取消息 Diff

```http
GET /session/:sessionID/diff?messageID=message_xxx
```

**响应**: `Snapshot.FileDiff[]`

#### 3.9.11 处置实例

```http
POST /instance/dispose
```

**响应**: `boolean`

#### 3.9.12 获取待处理问题

```http
GET /question/
```

**响应**: `Question.Request[]`

#### 3.9.13 回复问题

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

## 四、SSE 事件流

### 4.1 事件订阅

**端点**: `GET /event`

**连接示例:**

```typescript
const eventSource = new EventSource(`${serverUrl}/event?directory=${encodeURIComponent(projectDir)}`)

eventSource.addEventListener("message", (event) => {
  const data = JSON.parse(event.data)
  console.log("Event:", data.type, data.properties)
})
```

### 4.2 事件类型

#### 4.2.1 服务器事件

| 事件类型                   | 说明            | 数据                    |
| -------------------------- | --------------- | ----------------------- |
| `server.connected`         | 客户端连接成功  | `{}`                    |
| `server.heartbeat`         | 心跳 (每 30 秒) | `{}`                    |
| `server.instance.disposed` | 实例已处置      | `{ directory: string }` |
| `global.disposed`          | 全局处置事件    | `{}`                    |

#### 4.2.2 会话事件

| 事件类型          | 说明      | 数据                                          |
| ----------------- | --------- | --------------------------------------------- |
| `session.created` | 会话创建  | `{ info: Session.Info }`                      |
| `session.updated` | 会话更新  | `{ info: Session.Info }`                      |
| `session.deleted` | 会话删除  | `{ sessionID: string }`                       |
| `session.error`   | 会话错误  | `{ sessionID: string, error: Error }`         |
| `session.diff`    | 会话 Diff | `{ sessionID, messageID, diffs: FileDiff[] }` |

#### 4.2.3 消息事件

| 事件类型               | 说明         | 数据                                       |
| ---------------------- | ------------ | ------------------------------------------ |
| `message.updated`      | 消息更新     | `{ info: Message.Info }`                   |
| `message.removed`      | 消息删除     | `{ sessionID, messageID }`                 |
| `message.part.updated` | 消息部分更新 | `{ part: MessageV2.Part, delta?: string }` |
| `message.part.removed` | 消息部分删除 | `{ sessionID, messageID, partID }`         |

#### 4.2.4 权限事件

| 事件类型           | 说明     | 数据                                            |
| ------------------ | -------- | ----------------------------------------------- |
| `permission.asked` | 请求权限 | `{ id, sessionID, permission, metadata, tool }` |

#### 4.2.5 项目事件

| 事件类型             | 说明     | 数据                 |
| -------------------- | -------- | -------------------- |
| `project.updated`    | 项目更新 | `Project.Info`       |
| `vcs.branch.updated` | 分支更新 | `{ branch: string }` |

#### 4.2.6 文件事件

| 事件类型               | 说明           | 数据               |
| ---------------------- | -------------- | ------------------ |
| `file.watcher.updated` | 文件监视器更新 | `{}`               |
| `file.edited`          | 文件编辑       | `{ path: string }` |

#### 4.2.7 LSP 事件

| 事件类型                 | 说明     | 数据                         |
| ------------------------ | -------- | ---------------------------- |
| `lsp.updated`            | LSP 更新 | `{}`                         |
| `lsp.client.diagnostics` | LSP 诊断 | `{ serverID, path: string }` |

#### 4.2.8 MCP 事件

| 事件类型                  | 说明               | 数据                   |
| ------------------------- | ------------------ | ---------------------- |
| `mcp.tools.changed`       | MCP 工具变更       | `{ serverID: string }` |
| `mcp.browser.open.failed` | MCP 浏览器打开失败 | `{ error: string }`    |

#### 4.2.9 安装事件

| 事件类型                        | 说明     | 数据                  |
| ------------------------------- | -------- | --------------------- |
| `installation.updated`          | 安装更新 | `{ version: string }` |
| `installation.update-available` | 有新版本 | `{ version: string }` |

#### 4.2.10 其他事件

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

### 4.3 事件数据结构

#### Session.Info

```typescript
{
  id: string,                    // 会话 ID
  slug: string,                  // 短 URL 标识
  version: string,               // OpenCode 版本
  projectID: string,             // 项目 ID
  directory: string,             // 工作目录
  parentID?: string,             // 父会话 ID
  title: string,                 // 会话标题
  agent: string,                 // Agent 名称
  model?: {                      // 模型信息
    providerID: string,
    modelID: string
  },
  permission?: Ruleset,          // 权限规则
  time: {
    created: number,             // 创建时间戳
    updated: number,             // 更新时间戳
    archived?: number,           // 归档时间戳
    compacting?: number          // 压缩时间戳
  }
}
```

#### MessageV2.Part

```typescript
// TextPart
{
  id: string,
  sessionID: string,
  messageID: string,
  type: "text",
  text: string,
  synthetic?: boolean,
  ignored?: boolean,
  time?: { start: number, end?: number },
  metadata?: Record<string, any>
}

// ToolPart
{
  id: string,
  sessionID: string,
  messageID: string,
  type: "tool",
  callID: string,
  tool: string,
  state: ToolState,
  time: { start: number, end?: number }
}

// FilePart
{
  id: string,
  sessionID: string,
  messageID: string,
  type: "file",
  mime: string,
  filename?: string,
  url: string,
  source?: FilePartSource
}

// ReasoningPart
{
  id: string,
  sessionID: string,
  messageID: string,
  type: "reasoning",
  text: string,
  time: { start: number, end?: number }
}
```

#### ToolState

```typescript
// pending
{
  status: "pending",
  input: Record<string, any>,
  raw: string
}

// running
{
  status: "running",
  input: Record<string, any>,
  title?: string,
  metadata?: Record<string, any>,
  time: { start: number }
}

// completed
{
  status: "completed",
  input: Record<string, any>,
  output: string,
  title: string,
  metadata: Record<string, any>,
  time: { start: number, end: number },
  attachments?: FilePart[]
}

// error
{
  status: "error",
  input: Record<string, any>,
  error: string,
  metadata?: Record<string, any>,
  time: { start: number, end: number }
}
```

#### PermissionNext.Request

```typescript
{
  id: string,                    // 权限请求 ID
  sessionID: string,             // 会话 ID
  permission: string,            // 权限类型 (bash, edit, read 等)
  metadata?: Record<string, any>, // 元数据
  tool?: {
    callID: string,
    name: string
  }
}
```

#### FileDiff

```typescript
{
  file: string,                  // 文件路径
  before: string,                // 修改前内容
  after: string,                 // 修改后内容
  additions: number,             // 新增行数
  deletions: number              // 删除行数
}
```

---

## 五、数据模型

### 5.1 核心 Schema

所有数据模型使用 Zod 定义，位于 `packages/opencode/src` 各模块中。

**主要 Schema 文件:**

- `session/index.ts`: Session.Info, Session.CreateInput
- `session/message-v2.ts`: MessageV2.Info, MessageV2.Part
- `permission/next.ts`: PermissionNext.Rule, PermissionNext.Request
- `provider/provider.ts`: Provider.Info, Provider.Model
- `agent/agent.ts`: Agent.Info
- `tool/tool.ts`: Tool.Info

### 5.2 类型生成

SDK 类型通过 OpenAPI 规范自动生成:

```bash
# 生成 SDK
bun run ./script/generate.ts
```

**生成文件位置:**

- `packages/sdk/js/src/gen/types.gen.ts`: TypeScript 类型定义
- `packages/sdk/js/src/gen/sdk.gen.ts`: SDK 方法
- `packages/sdk/js/src/gen/client/client.gen.ts`: HTTP 客户端

---

## 六、核心交互流程

### 6.1 会话创建流程

```
客户端                          服务器
  │                              │
  ├── POST /session ───────────> │
  │                              │ 创建 Session.Info
  │                              │ 保存到存储
  │                              │ 发布 session.created 事件
  │ <───── Session.Info ──────── │
  │                              │
  ├── GET /event ──────────────> │ (SSE 连接)
  │ <──── server.connected ───── │
  │ <──── session.created ────── │
```

### 6.2 发送消息 (Prompt) 流程

```
客户端                          服务器
  │                              │
  ├── POST /session/:id/message ─> │
  │                              │ 创建用户消息
  │                              │ 发布 message.part.updated
  │                              │ 进入主循环 (loop)
  │                              │   ├─ 创建 assistant 消息
  │                              │   ├─ 构建 LLM 输入
  │                              │   ├─ 调用 AI SDK streamText()
  │                              │   └─ 处理流式响应
  │ <──── SSE 流 ─────────────── │
  │   message.part.updated         │ (文本增量)
  │   message.part.updated         │ (工具调用)
  │   message.part.updated         │ (工具结果)
  │   message.updated              │ (消息完成)
  │                              │
```

**详细时序:**

```typescript
// 1. 客户端发送消息
const response = await client.session.message({
  path: { sessionID: "session_123" },
  body: {
    parts: [{ type: "text", text: "帮我创建一个 React 组件" }]
  }
})

// 2. 服务器处理流程
// packages/opencode/src/server/routes/session.ts:698-738
POST /session/:sessionID/message
  ↓
SessionPrompt.prompt(input)
  ↓
createUserMessage(input)  // 创建用户消息
  ↓
loop(sessionID)  // 主循环
  ↓
  while (true) {
    // 创建 assistant 消息
    assistantMessage = createAssistantMessage()

    // 构建 LLM 输入
    streamInput = buildStreamInput()
      ├─ SystemPrompt.build()  // 系统提示词
      ├─ MessageV2.history()   // 历史消息
      └─ ToolRegistry.build()  // 工具定义

    // 调用 AI SDK
    stream = LLM.stream(streamInput)

    // 处理流式响应
    processor.process(stream)
      ├─ text-delta → 发布 message.part.updated
      ├─ tool-call → 检查权限 → 执行工具
      ├─ tool-result → 发布 message.part.updated
      └─ finish-step → 计算成本，判断是否继续
  }
```

### 6.3 权限请求流程

```
客户端                          服务器
  │                              │
  │ <──── permission.asked ───── │ (SSE 推送)
  │                              │   { id, permission, metadata }
  │                              │
  ├── GET /permission ─────────> │ (获取待处理权限)
  │ <──── Permission[] ───────── │
  │                              │
  ├── POST /permission/:id/reply ─> │
  │   { reply: "once" }            │ 更新权限状态
  │                              │ 恢复等待的 Promise
  │ <──── true ───────────────── │
  │                              │ 继续工具执行
```

**权限检查代码位置:**

- `packages/opencode/src/permission/next.ts:100-250`

### 6.4 工具执行流程

```
AI 模型                         服务器                          客户端
  │                              │                              │
  │ ── tool-call ──────────────> │                              │
  │                              │ 更新 tool state 为 running    │
  │                              │ 发布 message.part.updated    │
  │                              │                              │ <─ part.updated
  │                              │ 检查权限                     │
  │                              │ (PermissionNext.ask)         │
  │                              │                              │
  │                              ├─ 允许 ──> 执行工具           │
  │                              │                              │
  │ <─ tool-result ─────────────│                              │
  │                              │ 更新 tool state 为 completed │
  │                              │ 发布 message.part.updated    │
  │                              │                              │ <─ part.updated
  │                              │                              │
```

### 6.5 会话分叉流程

```typescript
// 客户端调用
await client.session.fork({
  path: { sessionID: "session_123" },
  body: { messageID: "message_456" } // 可选
})

// 服务器处理
// packages/opencode/src/server/routes/session.ts:340-350
POST /session/:sessionID/fork
  ↓
Session.fork({ sessionID, messageID })
  ↓
1. 获取原会话
2. 创建新会话 (标题添加 "fork #1")
3. 复制消息历史 (到指定 messageID)
4. 返回新 Session.Info
```

### 6.6 SSE 事件推送流程

```typescript
// 服务器端实现
// packages/opencode/src/server/server.ts:478-531
app.get("/event", async (c) => {
  return streamSSE(c, async (stream) => {
    // 发送连接事件
    stream.writeSSE({
      data: JSON.stringify({ type: "server.connected" }),
    })

    // 订阅所有 Bus 事件
    const unsub = Bus.subscribeAll(async (event) => {
      await stream.writeSSE({
        data: JSON.stringify(event),
      })

      if (event.type === "global.disposed") {
        stream.close()
      }
    })

    // 心跳
    const heartbeat = setInterval(() => {
      stream.writeSSE({
        data: JSON.stringify({ type: "server.heartbeat" }),
      })
    }, 30000)

    // 清理
    stream.onAbort(() => {
      clearInterval(heartbeat)
      unsub()
    })
  })
})
```

---

## 七、SDK 使用

### 7.1 安装

```bash
npm install @opencode-ai/sdk
# 或
bun add @opencode-ai/sdk
```

### 7.2 初始化客户端

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

### 7.3 API 调用示例

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

#### 获取消息列表

```typescript
const messages = await client.session.messages({
  path: { sessionID: session.id },
  query: { limit: 50 },
})

console.log(messages) // MessageV2.WithParts[]
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

#### 中止会话

```typescript
await client.session.abort({
  path: { sessionID: session.id },
})
```

#### 获取会话列表

```typescript
const sessions = await client.session.list({
  query: {
    directory: "/path/to/project",
    limit: 20,
  },
})
```

### 7.4 SDK 类型

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

### 7.5 SDK 生成

当修改服务器 API 后，需要重新生成 SDK:

```bash
# 在项目根目录执行
bun run ./script/generate.ts
```

**生成流程:**

1. 从 Hono 路由生成 OpenAPI 规范
2. 使用 `@hey-api/openapi-ts` 生成 TypeScript 客户端
3. 更新 `packages/sdk/js/src/gen/*`

---

## 八、错误处理

### 8.1 HTTP 错误码

| 状态码 | 说明           |
| ------ | -------------- |
| 200    | 成功           |
| 204    | 异步操作已接受 |
| 400    | 请求参数错误   |
| 404    | 资源未找到     |
| 500    | 服务器内部错误 |

### 8.2 错误响应格式

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

### 8.3 常见错误

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

## 九、最佳实践

### 9.1 客户端开发建议

1. **SSE 重连机制**

   ```typescript
   function connectSSE(url: string) {
     const es = new EventSource(url)

     es.onerror = () => {
       es.close()
       setTimeout(() => connectSSE(url), 3000)
     }

     return es
   }
   ```

2. **消息部分更新处理**

   ```typescript
   // 使用 delta 增量更新 UI
   case "message.part.updated":
     const { part, delta } = event.properties
     if (delta) {
       // 增量更新文本
       appendText(part.id, delta)
     } else {
       // 完整替换
       updatePart(part)
     }
   ```

3. **权限请求处理**
   ```typescript
   // 监听权限事件并显示确认对话框
   case "permission.asked":
     const result = await showPermissionDialog(event.properties)
     await client.permission.reply({
       path: { requestID: event.properties.id },
       body: { reply: result ? "once" : "reject" }
     })
   ```

### 9.2 服务器开发建议

1. **使用 Zod 验证所有输入**
2. **发布 Bus 事件解耦模块**
3. **使用 SSE 推送实时状态**
4. **错误统一格式化为 NamedError**

### 9.3 性能优化

1. **消息分页**: 使用 `limit` 参数限制返回数量
2. **会话搜索**: 使用 `search` 参数过滤
3. **SSE 心跳**: 30 秒防止超时
4. **实例隔离**: 使用 `directory` 参数隔离多项目

---

## 十、代码位置索引

### 核心文件

| 功能            | 文件路径                                            |
| --------------- | --------------------------------------------------- |
| **HTTP 服务器** | `packages/opencode/src/server/server.ts`            |
| **会话路由**    | `packages/opencode/src/server/routes/session.ts`    |
| **权限路由**    | `packages/opencode/src/server/routes/permission.ts` |
| **文件路由**    | `packages/opencode/src/server/routes/file.ts`       |
| **MCP 路由**    | `packages/opencode/src/server/routes/mcp.ts`        |
| **提示词处理**  | `packages/opencode/src/session/prompt.ts`           |
| **消息处理器**  | `packages/opencode/src/session/processor.ts`        |
| **LLM 流**      | `packages/opencode/src/session/llm.ts`              |
| **事件总线**    | `packages/opencode/src/bus/index.ts`                |
| **事件定义**    | `packages/opencode/src/bus/bus-event.ts`            |
| **权限控制**    | `packages/opencode/src/permission/next.ts`          |
| **工具注册表**  | `packages/opencode/src/tool/registry.ts`            |
| **SDK 客户端**  | `packages/sdk/js/src/client.ts`                     |
| **SDK 类型**    | `packages/sdk/js/src/gen/types.gen.ts`              |

### 数据模型定义

| 模型           | 文件路径                                      |
| -------------- | --------------------------------------------- |
| **Session**    | `packages/opencode/src/session/index.ts`      |
| **MessageV2**  | `packages/opencode/src/session/message-v2.ts` |
| **Permission** | `packages/opencode/src/permission/next.ts`    |
| **Provider**   | `packages/opencode/src/provider/provider.ts`  |
| **Agent**      | `packages/opencode/src/agent/agent.ts`        |
| **Tool**       | `packages/opencode/src/tool/tool.ts`          |

---

## 附录

### A. OpenAPI 规范

完整的 OpenAPI 规范可通过 `GET /doc` 端点获取。

### B. 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构
- [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) - 技术实现
- [CONTRIBUTING.md](./CONTRIBUTING.md) - 贡献指南

### C. 更新日志

本文档最后更新：2026-03-01
对应 OpenCode 版本：基于 dev 分支
