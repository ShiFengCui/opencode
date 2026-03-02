# Flow 与 OpenCode 协议对比分析报告

**分析日期**: 2026-03-02  
**分析目的**: 确认 Flow 后端协议是否与 OpenCode 兼容，能否无缝衔接到 opencode 客户端

---

## 执行摘要

**结论**: ❌ **当前协议不一致，无法无缝衔接**

Flow 目前的 API 设计与 OpenCode 完全不同，需要重构才能实现客户端兼容。

---

## 一、协议对比

### 1.1 OpenCode 协议（标准）

**基础路径**: `/session`

| 端点                               | 方法   | 功能          | 请求体                    | 响应                         |
| ---------------------------------- | ------ | ------------- | ------------------------- | ---------------------------- |
| `/session/`                        | GET    | 获取会话列表  | query: directory, limit   | `Session.Info[]`             |
| `/session/:sessionID`              | GET    | 获取会话详情  | -                         | `Session.Info`               |
| `/session/:sessionID`              | DELETE | 删除会话      | -                         | `boolean`                    |
| `/session/:sessionID/message`      | GET    | 获取消息列表  | query: limit              | `MessageV2.WithParts[]`      |
| `/session/:sessionID/message`      | POST   | 发送消息      | `{ parts, model, agent }` | `MessageV2.WithParts` (流式) |
| `/session/:sessionID/prompt_async` | POST   | 异步发送消息  | `{ parts, model, agent }` | `204 No Content`             |
| `/session/:sessionID/abort`        | POST   | 中止会话      | -                         | `boolean`                    |
| `/session/:sessionID/fork`         | POST   | 分叉会话      | `{ messageID? }`          | `Session.Info`               |
| `/session/:sessionID/share`        | POST   | 分享会话      | -                         | `Session.Info`               |
| `/session/:sessionID/share`        | DELETE | 取消分享      | -                         | `Session.Info`               |
| `/session/:sessionID/revert`       | POST   | 回滚消息      | `{ messageID }`           | `Session.Info`               |
| `/session/:sessionID/unrevert`     | POST   | 恢复回滚      | -                         | `Session.Info`               |
| `/session/:sessionID/summarize`    | POST   | 会话摘要      | `{ providerID, modelID }` | `boolean`                    |
| `/session/:sessionID/diff`         | GET    | 获取消息 Diff | query: messageID          | `Snapshot.FileDiff[]`        |
| `/event`                           | GET    | SSE 事件流    | query: directory          | `SSE Stream`                 |

**其他核心端点**:

- `/permission/` - 权限管理
- `/provider/` - 提供商管理
- `/project/` - 项目管理
- `/file` - 文件操作
- `/mcp/` - MCP 管理
- `/config/` - 配置管理
- `/agent` - Agent 列表
- `/skill` - Skill 列表
- `/lsp` - LSP 状态
- `/command` - 命令列表

### 1.2 Flow 当前协议

**基础路径**: `/graph`

| 端点                          | 方法   | 功能               | 请求体                       | 响应                    |
| ----------------------------- | ------ | ------------------ | ---------------------------- | ----------------------- |
| `/graph/start`                | POST   | 启动图执行         | `{ sessionID, userInput }`   | `{ status, sessionID }` |
| `/graph/:sessionID/status`    | GET    | 获取图状态         | -                            | `{ running, status }`   |
| `/graph/:sessionID/history`   | GET    | 获取执行历史       | -                            | `{ checkpoints }`       |
| `/graph/:sessionID/feedback`  | POST   | 用户反馈           | `{ feedback, permissionID }` | `{ status }`            |
| `/graph/:sessionID/stop`      | POST   | 停止执行           | -                            | `{ status }`            |
| `/graph/:sessionID`           | DELETE | 删除图数据         | -                            | `{ status }`            |
| `/graph/:sessionID/stream`    | GET    | SSE 事件流         | -                            | `SSE Stream`            |
| `/graph/:sessionID/broadcast` | POST   | 广播事件           | `{ type, properties }`       | `{ success, sentTo }`   |
| `/webhook/opencode-event`     | POST   | 接收 OpenCode 事件 | `{ type, properties }`       | `{ status }`            |

**其他端点**:

- `/health` - 健康检查

---

## 二、协议差异分析

### 2.1 核心差异

| 维度         | OpenCode                                | Flow                       | 兼容性    |
| ------------ | --------------------------------------- | -------------------------- | --------- |
| **基础路径** | `/session`                              | `/graph`                   | ❌ 不兼容 |
| **资源模型** | Session + Message                       | Graph + Execution          | ❌ 不兼容 |
| **消息格式** | `MessageV2` 结构                        | 自定义结构                 | ❌ 不兼容 |
| **SSE 端点** | `/event`                                | `/graph/:sessionID/stream` | ❌ 不兼容 |
| **认证方式** | Basic Auth (`OPENCODE_SERVER_PASSWORD`) | 无                         | ⚠️ 需添加 |
| **CORS**     | 配置化                                  | 全局启用                   | ⚠️ 需配置 |
| **错误格式** | `NamedError` 格式                       | 简单错误                   | ⚠️ 需统一 |

### 2.2 功能差异

| 功能       | OpenCode    | Flow                   | 状态         |
| ---------- | ----------- | ---------------------- | ------------ |
| 会话管理   | ✅ 完整     | ❌ 无                  | 需实现       |
| 消息管理   | ✅ 完整     | ❌ 无                  | 需实现       |
| 权限管理   | ✅ 完整     | ⚠️ 简化版              | 需完善       |
| 提供商管理 | ✅ 完整     | ❌ 无                  | 需实现       |
| 文件操作   | ✅ 完整     | ❌ 无                  | 需实现       |
| 工具执行   | ✅ 完整     | ✅ 有                  | ✅ 兼容      |
| 事件推送   | ✅ `/event` | ✅ `/graph/:id/stream` | ⚠️ 路径不同  |
| 图执行     | ❌ 无       | ✅ 完整                | ✅ Flow 独有 |

---

## 三、兼容性设计

### 3.1 方案 A: 完全兼容 OpenCode 协议（推荐）

**目标**: Flow 完全兼容 OpenCode API，客户端可无缝切换

**实现方式**:

```typescript
// packages/flow/src/server/index.ts
import { SessionRoutes } from "./routes/session" // 复制 OpenCode 路由
import { ProviderRoutes } from "./routes/provider"
import { PermissionRoutes } from "./routes/permission"
import { FileRoutes } from "./routes/file"
import { GraphRoutes } from "./routes/graph" // Flow 独有

export function createServer() {
  const app = new Hono()

  // 中间件（与 OpenCode 一致）
  app.use("*", cors())
  app.use("*", basicAuthMiddleware) // 添加认证

  // OpenCode 兼容路由
  app.route("/session", SessionRoutes())
  app.route("/provider", ProviderRoutes())
  app.route("/permission", PermissionRoutes())
  app.route("/file", FileRoutes())
  app.route("/event", EventRoutes()) // SSE 端点

  // Flow 独有路由（前缀区分）
  app.route("/flow/graph", GraphRoutes())

  return app
}
```

**优点**:

- ✅ 客户端无需修改
- ✅ 可无缝切换
- ✅ 降低维护成本

**缺点**:

- ⚠️ 需要复制大量 OpenCode 代码
- ⚠️ 维护同步成本

### 3.2 方案 B: 双协议并存

**目标**: 同时支持 OpenCode 协议和 Flow 协议

**实现方式**:

```typescript
export function createServer() {
  const app = new Hono()

  // OpenCode 兼容模式（/api/v1）
  app.route("/api/v1/session", SessionRoutes())
  app.route("/api/v1/event", EventRoutes())

  // Flow 原生模式（/flow）
  app.route("/flow/graph", GraphRoutes())

  return app
}
```

**优点**:

- ✅ 向后兼容
- ✅ 支持新特性

**缺点**:

- ⚠️ 协议复杂
- ⚠️ 客户端需选择模式

### 3.3 方案 C: 网关适配层

**目标**: 通过网关转换协议

**实现方式**:

```
客户端 → 网关层 → Flow 后端
       ↓
    协议转换
```

**优点**:

- ✅ 后端独立
- ✅ 灵活适配

**缺点**:

- ⚠️ 增加架构复杂度
- ⚠️ 性能开销

---

## 四、推荐实施方案（方案 A）

### 4.1 第一阶段：复制核心路由

**需要复制的 OpenCode 路由**:

```
packages/opencode/src/server/routes/
├── session.ts          → packages/flow/src/server/routes/session.ts
├── permission.ts       → packages/flow/src/server/routes/permission.ts
├── provider.ts         → packages/flow/src/server/routes/provider.ts
├── file.ts             → packages/flow/src/server/routes/file.ts
├── event.ts            → packages/flow/src/server/routes/event.ts
├── project.ts          → packages/flow/src/server/routes/project.ts
├── config.ts           → packages/flow/src/server/routes/config.ts
├── agent.ts            → packages/flow/src/server/routes/agent.ts
└── skill.ts            → packages/flow/src/server/routes/skill.ts
```

**适配修改**:

1. 导入路径修改（指向复制的 opencode 模块）
2. 配置适配（使用 FlowConfig）
3. 存储路径适配（使用 FlowAdapter）

### 4.2 第二阶段：统一中间件

```typescript
// packages/flow/src/server/middleware.ts

// 1. 认证中间件（与 OpenCode 一致）
export const authMiddleware = (c: Context, next: Function) => {
  if (c.req.method === "OPTIONS") return next()

  const password = FlowConfig.server.password
  if (!password) return next()

  const username = FlowConfig.server.username ?? "opencode"
  return basicAuth({ username, password })(c, next)
}

// 2. CORS 中间件（与 OpenCode 一致）
export const corsMiddleware = cors({
  origin: (origin) => {
    if (origin.startsWith("http://localhost:")) return origin
    if (origin.startsWith("http://127.0.0.1:")) return origin
    if (origin === "tauri://localhost") return origin
    return undefined
  },
  credentials: true,
})

// 3. 错误处理中间件（与 OpenCode 一致）
export const errorMiddleware = (err: Error, c: Context) => {
  if (err instanceof NamedError) {
    let status: ContentfulStatusCode
    if (err instanceof NotFoundError) status = 404
    else if (err instanceof Provider.ModelNotFoundError) status = 400
    else status = 500
    return c.json(err.toObject(), { status })
  }
  return c.json({ error: err.message }, 500)
}
```

### 4.3 第三阶段：统一 SSE 事件

```typescript
// packages/flow/src/server/routes/event.ts

import { streamSSE } from "hono/streaming"
import { Bus } from "../opencode/bus"

export const EventRoutes = () =>
  new Hono().get("/event", async (c) => {
    return streamSSE(c, async (stream) => {
      // 发送连接事件（与 OpenCode 一致）
      await stream.writeSSE({
        data: JSON.stringify({ type: "server.connected" }),
      })

      // 订阅所有 Bus 事件（与 OpenCode 一致）
      const unsub = Bus.subscribeAll(async (event) => {
        await stream.writeSSE({
          data: JSON.stringify(event),
        })

        if (event.type === "global.disposed") {
          stream.close()
        }
      })

      // 心跳（与 OpenCode 一致）
      const heartbeat = setInterval(() => {
        stream.writeSSE({
          data: JSON.stringify({ type: "server.heartbeat" }),
        })
      }, 30000)

      stream.onAbort(() => {
        clearInterval(heartbeat)
        unsub()
      })
    })
  })
```

### 4.4 第四阶段：统一错误格式

```typescript
// packages/flow/src/server/error.ts

import { NamedError } from "./opencode/util/error"

export const errors = (status: number) =>
  ({
    [status]: {
      description: "Error response",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              data: { type: "object" },
            },
          },
        },
      },
    },
  })

    // 使用示例
    .get("/session/:id", async (c) => {
      try {
        const session = await Session.get(id)
        return c.json(session)
      } catch (err) {
        if (err instanceof NamedError) {
          return c.json(err.toObject(), { status: 500 })
        }
        throw err
      }
    })
```

---

## 五、实施检查清单

### 5.1 路由复制

- [ ] 复制 `session.ts` 并适配
- [ ] 复制 `permission.ts` 并适配
- [ ] 复制 `provider.ts` 并适配
- [ ] 复制 `file.ts` 并适配
- [ ] 复制 `event.ts` 并适配
- [ ] 复制 `project.ts` 并适配
- [ ] 复制 `config.ts` 并适配
- [ ] 复制 `agent.ts` 并适配
- [ ] 复制 `skill.ts` 并适配

### 5.2 中间件统一

- [ ] 实现认证中间件
- [ ] 实现 CORS 中间件
- [ ] 实现错误处理中间件
- [ ] 实现日志中间件

### 5.3 协议测试

- [ ] 测试 `/session` 端点
- [ ] 测试 `/session/:id/message` 端点
- [ ] 测试 `/event` SSE 端点
- [ ] 测试 `/permission` 端点
- [ ] 测试错误格式
- [ ] 测试认证流程

### 5.4 客户端验证

- [ ] opencode CLI 连接测试
- [ ] opencode Web 连接测试
- [ ] 会话创建测试
- [ ] 消息发送测试
- [ ] 事件推送测试

---

## 六、实施复杂度评估

| 任务       | 复杂度 | 工时   | 说明         |
| ---------- | ------ | ------ | ------------ |
| 路由复制   | ⭐⭐⭐ | 2-3 天 | 9 个路由文件 |
| 中间件统一 | ⭐⭐   | 1 天   | 4 个中间件   |
| 协议测试   | ⭐⭐⭐ | 2 天   | 完整测试套件 |
| 客户端验证 | ⭐⭐   | 1 天   | CLI + Web    |

**总工时**: 6-7 天

---

## 七、结论

### 当前状态

❌ **Flow 协议与 OpenCode 不兼容**

- 路径不同 (`/graph` vs `/session`)
- 资源模型不同
- 缺少核心端点
- 认证机制缺失

### 推荐方案

✅ **方案 A: 完全兼容 OpenCode 协议**

- 复制 OpenCode 核心路由
- 统一中间件和错误处理
- 保持 SSE 事件格式一致
- Flow 独有功能使用 `/flow` 前缀

### 实施建议

1. **优先级**: 高（影响客户端兼容性）
2. **工时**: 6-7 天
3. **风险**: 低（复制成熟代码）
4. **收益**: 高（无缝衔接客户端）

---

**报告生成时间**: 2026-03-02  
**版本**: 1.0  
**建议**: 立即实施方案 A
