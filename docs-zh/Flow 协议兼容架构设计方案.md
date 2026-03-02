# Flow 协议兼容架构设计方案

**设计日期**: 2026-03-02  
**设计目标**: 底层对外部客户端协议一致，支持 Flow 自定义节点和扩展

---

## 一、架构设计原则

### 1.1 核心原则

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ CLI      │  │ Web      │  │ Desktop  │                      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                      │
│       │             │             │                              │
│       └─────────────┴─────────────┘                              │
│                     │                                            │
│              统一协议层 (兼容 OpenCode)                           │
└─────────────────────┼────────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────────┐
│                      协议适配层                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              IProtocolAdapter 接口                        │  │
│  │  - handleSession()                                        │  │
│  │  - handleMessage()                                        │  │
│  │  - handleEvent()                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────┬────────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────────┐
│                      执行引擎层                                   │
│  ┌─────────────────┐          ┌─────────────────┐               │
│  │  OpenCode 引擎   │          │  Flow 图引擎    │               │
│  │  (固定流程)      │          │  (自定义节点)    │               │
│  └─────────────────┘          └─────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 设计目标

1. **协议一致性**: 客户端无需感知底层是 OpenCode 还是 Flow
2. **扩展性**: Flow 可自定义节点和流程，不影响客户端协议
3. **可切换性**: 可在运行时切换执行引擎
4. **向后兼容**: 保持与现有 OpenCode 客户端 100% 兼容

---

## 二、协议层设计

### 2.1 协议接口定义

```typescript
// packages/flow/src/protocol/types.ts

/**
 * 统一协议接口
 * 所有执行引擎必须实现此接口
 */
export interface IProtocolAdapter {
  /**
   * 获取适配器类型
   */
  getType(): "opencode" | "flow"

  /**
   * 会话管理
   */
  session: {
    list(query: SessionListQuery): Promise<Session.Info[]>
    get(id: string): Promise<Session.Info>
    create(input: SessionCreateInput): Promise<Session.Info>
    update(id: string, input: SessionUpdateInput): Promise<Session.Info>
    delete(id: string): Promise<void>
    fork(id: string, messageID?: string): Promise<Session.Info>
  }

  /**
   * 消息管理
   */
  message: {
    list(sessionID: string, options?: MessageListOptions): Promise<MessageV2.WithParts[]>
    get(sessionID: string, messageID: string): Promise<MessageV2.WithParts>
    create(sessionID: string, input: MessageCreateInput): AsyncIterable<MessageV2.WithParts>
    update(sessionID: string, messageID: string, input: MessageUpdateInput): Promise<MessageV2.WithParts>
    delete(sessionID: string, messageID: string): Promise<void>
  }

  /**
   * 事件订阅
   */
  events: {
    subscribe(sessionID?: string): AsyncIterable<BusEvent>
  }

  /**
   * 权限管理
   */
  permission: {
    list(): Promise<PermissionNext.Request[]>
    reply(requestID: string, reply: "once" | "always" | "reject"): Promise<void>
  }

  /**
   * 文件操作
   */
  file: {
    read(path: string): Promise<string>
    write(path: string, content: string): Promise<void>
    delete(path: string): Promise<void>
  }
}

/**
 * 协议响应格式（与 OpenCode 一致）
 */
export interface ProtocolResponse<T = any> {
  data?: T
  error?: {
    name: string
    message: string
    code?: number
  }
}
```

### 2.2 协议路由器

```typescript
// packages/flow/src/protocol/router.ts

export class ProtocolRouter {
  private adapters: Map<string, IProtocolAdapter> = new Map()
  private defaultAdapter: string = "opencode"

  /**
   * 注册协议适配器
   */
  register(name: string, adapter: IProtocolAdapter): void {
    this.adapters.set(name, adapter)
  }

  /**
   * 获取适配器
   */
  get(name: string = this.defaultAdapter): IProtocolAdapter {
    const adapter = this.adapters.get(name)
    if (!adapter) {
      throw new Error(`Adapter not found: ${name}`)
    }
    return adapter
  }

  /**
   * 根据会话选择适配器
   */
  select(sessionID: string): IProtocolAdapter {
    // Flow 会话使用 Flow 引擎
    if (sessionID.startsWith("flow-")) {
      return this.get("flow")
    }
    // 默认使用 OpenCode 引擎
    return this.get("opencode")
  }

  /**
   * 设置默认适配器
   */
  setDefault(name: string): void {
    if (!this.adapters.has(name)) {
      throw new Error(`Adapter not found: ${name}`)
    }
    this.defaultAdapter = name
  }
}

// 全局路由实例
export const protocolRouter = new ProtocolRouter()
```

---

## 三、OpenCode 协议适配器

### 3.1 实现

```typescript
// packages/flow/src/protocol/opencode-adapter.ts

import { Session } from "./opencode/session"
import { MessageV2 } from "./opencode/session/message-v2"
import { Bus } from "./opencode/bus"
import type { IProtocolAdapter } from "./types"

export class OpenCodeAdapter implements IProtocolAdapter {
  getType(): "opencode" {
    return "opencode"
  }

  session = {
    async list(query: SessionListQuery): Promise<Session.Info[]> {
      const sessions: Session.Info[] = []
      for await (const session of Session.list(query)) {
        sessions.push(session)
      }
      return sessions
    },

    async get(id: string): Promise<Session.Info> {
      return Session.get(id)
    },

    async create(input: SessionCreateInput): Promise<Session.Info> {
      return Session.createNext(input)
    },

    async update(id: string, input: SessionUpdateInput): Promise<Session.Info> {
      return Session.update(id, (draft) => {
        Object.assign(draft, input)
      })
    },

    async delete(id: string): Promise<void> {
      await Session.delete(id)
    },

    async fork(id: string, messageID?: string): Promise<Session.Info> {
      return Session.fork({ sessionID: id, messageID })
    },
  }

  message = {
    async list(sessionID: string, options?: MessageListOptions): Promise<MessageV2.WithParts[]> {
      return MessageV2.list({ sessionID, ...options })
    },

    async get(sessionID: string, messageID: string): Promise<MessageV2.WithParts> {
      return MessageV2.load(messageID)
    },

    async *create(sessionID: string, input: MessageCreateInput): AsyncIterable<MessageV2.WithParts> {
      // 使用 OpenCode 的 prompt 流程
      const result = await SessionPrompt.prompt({
        sessionID,
        parts: input.parts,
        model: input.model,
        agent: input.agent,
      })
      yield result
    },

    async update(sessionID: string, messageID: string, input: MessageUpdateInput): Promise<MessageV2.WithParts> {
      return Session.updateMessage({
        ...input,
        id: messageID,
        sessionID,
      })
    },

    async delete(sessionID: string, messageID: string): Promise<void> {
      await Session.deleteMessage(sessionID, messageID)
    },
  }

  events = {
    async *subscribe(sessionID?: string): AsyncIterable<BusEvent> {
      // 使用 OpenCode 的事件总线
      const queue: BusEvent[] = []
      const listeners = new Set<(event: BusEvent) => void>()

      const unsubscribe = Bus.subscribeAll((event) => {
        if (sessionID && event.properties.sessionID !== sessionID) {
          return
        }
        queue.push(event)
        listeners.forEach((fn) => fn(event))
      })

      try {
        while (true) {
          yield await new Promise<BusEvent>((resolve) => {
            listeners.add(resolve)
          })
        }
      } finally {
        unsubscribe()
      }
    },
  }

  permission = {
    async list(): Promise<PermissionNext.Request[]> {
      return PermissionNext.list()
    },

    async reply(requestID: string, reply: "once" | "always" | "reject"): Promise<void> {
      await PermissionNext.reply({ requestID, reply })
    },
  }

  file = {
    async read(path: string): Promise<string> {
      return Bun.file(path).text()
    },

    async write(path: string, content: string): Promise<void> {
      await Bun.write(path, content)
    },

    async delete(path: string): Promise<void> {
      await fs.unlink(path)
    },
  }
}
```

---

## 四、Flow 协议适配器

### 4.1 实现

```typescript
// packages/flow/src/protocol/flow-adapter.ts

import { GraphExecutor } from "../graph/executor"
import { FileSaver } from "../persistence"
import { Bus } from "../opencode/bus"
import type { IProtocolAdapter } from "./types"

export class FlowAdapter implements IProtocolAdapter {
  private executor: GraphExecutor
  private fileSaver: FileSaver

  constructor() {
    this.executor = new GraphExecutor()
    this.fileSaver = new FileSaver({ directory: "./.flow-state" })
  }

  getType(): "flow" {
    return "flow"
  }

  session = {
    async list(query: SessionListQuery): Promise<Session.Info[]> {
      // 从文件存储加载 Flow 会话
      const sessions = await this.fileSaver.list("session")
      return sessions.filter((s) => {
        if (query.directory && s.directory !== query.directory) return false
        if (query.roots && s.parentID) return false
        return true
      })
    },

    async get(id: string): Promise<Session.Info> {
      const session = await this.fileSaver.get(["session", id])
      if (!session) {
        throw new Error(`Session not found: ${id}`)
      }
      return session
    },

    async create(input: SessionCreateInput): Promise<Session.Info> {
      const session: Session.Info = {
        id: `flow-${Date.now()}`,
        slug: this.generateSlug(),
        version: "0.0.1",
        projectID: "flow-project",
        directory: input.directory || process.cwd(),
        title: input.title || "Flow Session",
        agent: "flow",
        time: {
          created: Date.now(),
          updated: Date.now(),
        },
      }

      await this.fileSaver.put(["session", session.id], session)
      return session
    },

    async update(id: string, input: SessionUpdateInput): Promise<Session.Info> {
      const session = await this.get(id)
      const updated = { ...session, ...input, time: { ...session.time, updated: Date.now() } }
      await this.fileSaver.put(["session", id], updated)
      return updated
    },

    async delete(id: string): Promise<void> {
      await this.fileSaver.remove(["session", id])
    },

    async fork(id: string, messageID?: string): Promise<Session.Info> {
      const original = await this.get(id)
      return this.create({
        title: `${original.title} (fork)`,
        directory: original.directory,
      })
    },
  }

  message = {
    async list(sessionID: string, options?: MessageListOptions): Promise<MessageV2.WithParts[]> {
      const messages = await this.fileSaver.list(["message", sessionID])
      return messages.slice(0, options?.limit || 100)
    },

    async get(sessionID: string, messageID: string): Promise<MessageV2.WithParts> {
      const message = await this.fileSaver.get(["message", sessionID, messageID])
      if (!message) {
        throw new Error(`Message not found: ${messageID}`)
      }
      return message
    },

    async *create(sessionID: string, input: MessageCreateInput): AsyncIterable<MessageV2.WithParts> {
      // 使用 Flow 图引擎执行
      const graph = await this.executor.loadGraph(sessionID)

      // 执行图
      for await (const step of graph.execute({
        sessionID,
        userInput: input.parts[0]?.text || "",
        model: input.model,
      })) {
        // 流式返回结果
        yield step
      }
    },

    async update(sessionID: string, messageID: string, input: MessageUpdateInput): Promise<MessageV2.WithParts> {
      const message = await this.get(sessionID, messageID)
      const updated = { ...message, ...input }
      await this.fileSaver.put(["message", sessionID, messageID], updated)
      return updated
    },

    async delete(sessionID: string, messageID: string): Promise<void> {
      await this.fileSaver.remove(["message", sessionID, messageID])
    },
  }

  events = {
    async *subscribe(sessionID?: string): AsyncIterable<BusEvent> {
      // Flow 使用独立的事件系统
      const queue: BusEvent[] = []

      const handler = (event: BusEvent) => {
        if (sessionID && event.properties.sessionID !== sessionID) {
          return
        }
        queue.push(event)
      }

      // 订阅 Flow 事件
      const unsubscribe = this.executor.subscribe(handler)

      try {
        while (true) {
          if (queue.length > 0) {
            yield queue.shift()!
          } else {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
      } finally {
        unsubscribe()
      }
    },
  }

  permission = {
    async list(): Promise<PermissionNext.Request[]> {
      return this.executor.getPendingPermissions()
    },

    async reply(requestID: string, reply: "once" | "always" | "reject"): Promise<void> {
      await this.executor.replyPermission(requestID, reply)
    },
  }

  file = {
    async read(path: string): Promise<string> {
      return Bun.file(path).text()
    },

    async write(path: string, content: string): Promise<void> {
      await Bun.write(path, content)
    },

    async delete(path: string): Promise<void> {
      await fs.unlink(path)
    },
  }

  private generateSlug(): string {
    return Math.random().toString(36).substring(2, 10)
  }
}
```

---

## 五、HTTP 路由层设计

### 5.1 统一路由

```typescript
// packages/flow/src/server/routes/protocol.ts

import { Hono } from "hono"
import { protocolRouter } from "../../protocol/router"
import { streamSSE } from "hono/streaming"

export function ProtocolRoutes() {
  const router = new Hono()

  // ==================== 会话管理 ====================
  router
    .get("/", async (c) => {
      const query = c.req.query()
      const adapter = protocolRouter.select(query.sessionID || "default")
      const sessions = await adapter.session.list(query)
      return c.json(sessions)
    })
    .get("/:sessionID", async (c) => {
      const sessionID = c.req.param("sessionID")
      const adapter = protocolRouter.select(sessionID)
      const session = await adapter.session.get(sessionID)
      return c.json(session)
    })
    .post("/", async (c) => {
      const input = await c.req.json()
      const adapter = protocolRouter.get("opencode") // 默认使用 OpenCode
      const session = await adapter.session.create(input)
      return c.json(session)
    })
    .delete("/:sessionID", async (c) => {
      const sessionID = c.req.param("sessionID")
      const adapter = protocolRouter.select(sessionID)
      await adapter.session.delete(sessionID)
      return c.json({ success: true })
    })
    .post("/:sessionID/fork", async (c) => {
      const sessionID = c.req.param("sessionID")
      const { messageID } = await c.req.json()
      const adapter = protocolRouter.select(sessionID)
      const session = await adapter.session.fork(sessionID, messageID)
      return c.json(session)
    })

  // ==================== 消息管理 ====================
  router
    .get("/:sessionID/message", async (c) => {
      const sessionID = c.req.param("sessionID")
      const adapter = protocolRouter.select(sessionID)
      const messages = await adapter.message.list(sessionID, c.req.query())
      return c.json(messages)
    })
    .get("/:sessionID/message/:messageID", async (c) => {
      const { sessionID, messageID } = c.req.param()
      const adapter = protocolRouter.select(sessionID)
      const message = await adapter.message.get(sessionID, messageID)
      return c.json(message)
    })
    .post("/:sessionID/message", async (c) => {
      const sessionID = c.req.param("sessionID")
      const input = await c.req.json()
      const adapter = protocolRouter.select(sessionID)

      // 流式响应
      return streamSSE(c, async (stream) => {
        for await (const message of adapter.message.create(sessionID, input)) {
          await stream.writeSSE({
            data: JSON.stringify({
              type: "message.part.updated",
              properties: { message },
            }),
          })
        }
      })
    })

  // ==================== 事件订阅 ====================
  router.get("/event", async (c) => {
    const sessionID = c.req.query("sessionID")
    const adapter = protocolRouter.select(sessionID || "default")

    return streamSSE(c, async (stream) => {
      // 发送连接事件
      await stream.writeSSE({
        data: JSON.stringify({ type: "server.connected" }),
      })

      // 订阅事件
      for await (const event of adapter.events.subscribe(sessionID)) {
        await stream.writeSSE({
          data: JSON.stringify(event),
        })
      }
    })
  })

  // ==================== 权限管理 ====================
  router
    .get("/permission", async (c) => {
      const adapter = protocolRouter.get("opencode") // 权限统一管理
      const permissions = await adapter.permission.list()
      return c.json(permissions)
    })
    .post("/permission/:requestID/reply", async (c) => {
      const { requestID } = c.req.param()
      const { reply } = await c.req.json()
      const adapter = protocolRouter.get("opencode")
      await adapter.permission.reply(requestID, reply)
      return c.json({ success: true })
    })

  // ==================== 文件操作 ====================
  router
    .get("/file", async (c) => {
      const path = c.req.query("path")
      if (!path) return c.json({ error: "path required" }, 400)

      const adapter = protocolRouter.get("opencode") // 文件操作统一管理
      const content = await adapter.file.read(path)
      return c.text(content)
    })
    .post("/file", async (c) => {
      const { path, content } = await c.req.json()
      const adapter = protocolRouter.get("opencode")
      await adapter.file.write(path, content)
      return c.json({ success: true })
    })
    .delete("/file", async (c) => {
      const { path } = await c.req.json()
      const adapter = protocolRouter.get("opencode")
      await adapter.file.delete(path)
      return c.json({ success: true })
    })

  return router
}
```

---

## 六、Flow 自定义扩展设计

### 6.1 自定义节点注册

```typescript
// packages/flow/src/graph/registry.ts

export interface IFlowNode {
  id: string
  type: string
  execute(state: GraphState): Promise<Partial<GraphState>>
  toJSON(): object
}

export class NodeRegistry {
  private nodes: Map<string, new () => IFlowNode> = new Map()

  /**
   * 注册自定义节点
   */
  register<T extends IFlowNode>(type: string, NodeClass: new () => T): void {
    this.nodes.set(type, NodeClass as any)
  }

  /**
   * 创建节点实例
   */
  create(type: string): IFlowNode {
    const NodeClass = this.nodes.get(type)
    if (!NodeClass) {
      throw new Error(`Node type not found: ${type}`)
    }
    return new NodeClass()
  }

  /**
   * 获取所有注册的节点类型
   */
  getTypes(): string[] {
    return Array.from(this.nodes.keys())
  }
}

// 全局节点注册表
export const nodeRegistry = new NodeRegistry()

// 注册内置节点
nodeRegistry.register("prompt", PromptNode)
nodeRegistry.register("llm", LLMNode)
nodeRegistry.register("tool", ToolNode)
nodeRegistry.register("output", OutputNode)
```

### 6.2 插件系统

```typescript
// packages/flow/src/plugin/types.ts

export interface FlowPlugin {
  name: string
  version: string

  /**
   * 插件初始化
   */
  initialize(context: PluginContext): Promise<void>

  /**
   * 注册自定义节点
   */
  registerNodes?(registry: NodeRegistry): void

  /**
   * 注册自定义工具
   */
  registerTools?(registry: ToolRegistry): void

  /**
   * 插件卸载
   */
  dispose?(): Promise<void>
}

export interface PluginContext {
  config: Record<string, any>
  storage: Storage
  events: EventEmitter
}

// 插件管理器
export class PluginManager {
  private plugins: Map<string, FlowPlugin> = new Map()

  async register(plugin: FlowPlugin): Promise<void> {
    const context: PluginContext = {
      config: plugin.name,
      storage: new PluginStorage(plugin.name),
      events: new EventEmitter(),
    }

    await plugin.initialize(context)

    if (plugin.registerNodes) {
      plugin.registerNodes(nodeRegistry)
    }

    if (plugin.registerTools) {
      plugin.registerTools(toolRegistry)
    }

    this.plugins.set(plugin.name, plugin)
  }

  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (plugin?.dispose) {
      await plugin.dispose()
    }
    this.plugins.delete(name)
  }
}
```

### 6.3 自定义图定义

```typescript
// packages/flow/src/graph/definition.ts

export interface GraphDefinition {
  id: string
  name: string
  version: string

  /**
   * 节点定义
   */
  nodes: NodeDefinition[]

  /**
   * 边定义
   */
  edges: EdgeDefinition[]

  /**
   * 输入定义
   */
  inputs?: InputDefinition[]

  /**
   * 输出定义
   */
  outputs?: OutputDefinition[]
}

export interface NodeDefinition {
  id: string
  type: string
  config?: Record<string, any>
  position?: { x: number; y: number }
}

export interface EdgeDefinition {
  id: string
  source: string
  target: string
  condition?: string // 条件表达式
}

// 图执行器
export class GraphExecutor {
  async execute(definition: GraphDefinition, input: any): AsyncIterable<any> {
    // 根据图定义执行
    const state = { ...input, loopCount: 0 }

    // 从入口节点开始执行
    const entryNode = definition.nodes.find(n => n.id === 'entry') || definition.nodes[0]

    let currentNode: NodeDefinition | undefined = entryNode

    while (currentNode) {
      // 创建节点实例
      const node = nodeRegistry.create(currentNode.type)

      // 执行节点
      const result = await node.execute(state)

      // 产生输出
      yield {
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        result,
      }

      // 更新状态
      Object.assign(state, result)

      // 查找下一个节点
      currentNode = this.findNextNode(definition, currentNode.id, state)
    }
  }

  private findNextNode(
    definition: GraphDefinition,
    currentID: string,
    state: any
  ): NodeDefinition | undefined {
    const edge = definition.edges.find(e => e.source === currentID)
    if (!edge) return undefined

    // 检查条件
    if (edge.condition) {
      const shouldFollow = this.evaluateCondition(edge.condition, state)
      if (!shouldFollow) return undefined
    }

    return definition.nodes.find(n => n.id === edge.target)
  }

  private evaluateCondition(condition: string, state: any): boolean {
    // 简单的条件求值（可使用更复杂的表达式引擎）
    return new Function('state', `return ${condition}`)(state)
  }
}
```

---

## 七、中间件设计

### 7.1 认证中间件

```typescript
// packages/flow/src/server/middleware/auth.ts

import { basicAuth } from "hono/basic-auth"
import { FlowConfig } from "../../flow-config"

export const authMiddleware = basicAuth({
  username: FlowConfig.server.username || "opencode",
  password: FlowConfig.server.password || "",
  realm: "Flow",
  hashType: "sha-256",
})
```

### 7.2 CORS 中间件

```typescript
// packages/flow/src/server/middleware/cors.ts

import { cors } from "hono/cors"

export const corsMiddleware = cors({
  origin: (origin) => {
    // 允许 localhost
    if (origin.startsWith("http://localhost:")) return origin
    if (origin.startsWith("http://127.0.0.1:")) return origin

    // 允许 tauri
    if (origin === "tauri://localhost") return origin
    if (origin === "http://tauri.localhost") return origin

    // 允许配置的白名单
    const whitelist = FlowConfig.server.corsWhitelist || []
    if (whitelist.includes(origin)) return origin

    return undefined
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["X-Session-ID"],
  maxAge: 86400,
})
```

### 7.3 错误处理中间件

```typescript
// packages/flow/src/server/middleware/error.ts

import { NamedError } from "../../opencode/util/error"
import type { ContentfulStatusCode } from "hono/utils/http-status"

export const errorMiddleware = (err: Error, c: Context) => {
  if (err instanceof NamedError) {
    let status: ContentfulStatusCode
    if (err instanceof NotFoundError) status = 404
    else if (err instanceof Provider.ModelNotFoundError) status = 400
    else if (err.name.startsWith("Worktree")) status = 400
    else status = 500

    return c.json(err.toObject(), { status })
  }

  // 未知错误
  return c.json(
    {
      name: "UnknownError",
      data: {
        message: err.message,
        stack: err.stack,
      },
    },
    { status: 500 },
  )
}
```

---

## 八、服务器整合

### 8.1 统一服务器

```typescript
// packages/flow/src/server/index.ts

import { Hono } from "hono"
import { corsMiddleware } from "./middleware/cors"
import { authMiddleware } from "./middleware/auth"
import { errorMiddleware } from "./middleware/error"
import { ProtocolRoutes } from "./routes/protocol"
import { FlowRoutes } from "./routes/flow"
import { protocolRouter } from "../protocol/router"
import { OpenCodeAdapter } from "../protocol/opencode-adapter"
import { FlowAdapter } from "../protocol/flow-adapter"

export function createServer() {
  const app = new Hono()

  // 注册协议适配器
  protocolRouter.register("opencode", new OpenCodeAdapter())
  protocolRouter.register("flow", new FlowAdapter())

  // 中间件
  app.use("*", corsMiddleware)
  app.use("*", authMiddleware)

  // 协议路由（兼容 OpenCode）
  app.route("/", ProtocolRoutes())

  // Flow 独有路由（自定义功能）
  app.route("/flow", FlowRoutes())

  // 健康检查
  app.get("/health", (c) =>
    c.json({
      status: "ok",
      timestamp: Date.now(),
      adapters: ["opencode", "flow"],
    }),
  )

  // 错误处理
  app.onError(errorMiddleware)

  return app
}
```

---

## 九、使用示例

### 9.1 客户端使用（无需修改）

```typescript
// opencode CLI 或 Web 客户端代码

// 连接服务器
const client = createClient({
  baseUrl: "http://localhost:4097",
  auth: { username: "opencode", password: "xxx" },
})

// 创建会话（自动使用 OpenCode 引擎）
const session = await client.session.create({
  title: "My Session",
})

// 发送消息（自动使用 OpenCode 引擎）
for await (const message of client.session.message.create(session.id, {
  parts: [{ type: "text", text: "Hello" }],
})) {
  console.log(message)
}

// 创建 Flow 会话（使用 Flow 引擎）
const flowSession = await client.session.create({
  title: "Flow Session",
  agent: "flow", // 指定使用 Flow 引擎
})

// 发送消息到 Flow 会话（自动使用 Flow 引擎）
for await (const message of client.session.message.create(flowSession.id, {
  parts: [{ type: "text", text: "Hello with Flow" }],
  model: { providerID: "aliyun", modelID: "qwen-plus" },
})) {
  console.log(message)
}
```

### 9.2 自定义 Flow 节点

```typescript
// 用户自定义节点

import { nodeRegistry } from "@opencode-ai/flow"

// 定义自定义节点
class MyCustomNode implements IFlowNode {
  id = "my-custom"
  type = "my-custom"

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    // 自定义逻辑
    console.log("Executing custom node")
    return { nextNode: "output" }
  }

  toJSON() {
    return { id: this.id, type: this.type }
  }
}

// 注册节点
nodeRegistry.register("my-custom", MyCustomNode)

// 现在可以在 Flow 中使用自定义节点
```

---

## 十、实施检查清单

### 10.1 协议层

- [ ] 定义 IProtocolAdapter 接口
- [ ] 实现 ProtocolRouter
- [ ] 实现 OpenCodeAdapter
- [ ] 实现 FlowAdapter

### 10.2 路由层

- [ ] 实现 ProtocolRoutes（兼容 OpenCode）
- [ ] 实现 FlowRoutes（Flow 独有）
- [ ] 配置中间件（CORS、认证、错误）

### 10.3 Flow 扩展

- [ ] 实现 NodeRegistry
- [ ] 实现 PluginManager
- [ ] 实现 GraphDefinition
- [ ] 实现 GraphExecutor

### 10.4 测试

- [ ] 协议兼容性测试
- [ ] 客户端连接测试
- [ ] 自定义节点测试
- [ ] 插件系统测试

---

## 十一、总结

### 设计优势

1. **协议一致性**: 客户端无需感知底层引擎
2. **扩展性**: 支持自定义节点和插件
3. **可切换性**: 运行时选择执行引擎
4. **向后兼容**: 100% 兼容 OpenCode 客户端

### 实施路径

```
Week 1: 协议层实现
Week 2: 路由层实现
Week 3: Flow 扩展系统
Week 4: 测试和优化
```

---

**设计文档版本**: 1.0  
**生成时间**: 2026-03-02  
**状态**: 待实施
