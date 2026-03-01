# OpenCode + LangGraph 可视化架构方案

> 本文档描述如何基于 LangGraph (TypeScript 版本) 将 OpenCode 后端处理流程定义为可可视化的节点图，为未来结合 React Flow 实现拖拽式流程定义奠定基础。
>
> **架构原则**: 不修改 `packages/opencode/` 现有代码，在 `packages/flow/` 独立实现 LangGraph 后端，通过复制必要代码和调用 OpenCode API 实现集成。

## 目录

- [一、方案概述](#一方案概述)
- [二、核心概念映射](#二核心概念映射)
- [三、节点设计](#三节点设计)
- [四、边与状态设计](#四边与状态设计)
- [五、架构实现方案](#五架构实现方案)
- [六、独立包架构设计](#六独立包架构设计)
- [七、React Flow 可视化集成](#七-react-flow-可视化集成)
- [八、实施路线图](#八实施路线图)

---

## 一、方案概述

### 1.1 目标

将 OpenCode 的会话处理流程使用 LangGraph 进行重构，实现：

1. **流程可视化**: 通过节点图清晰展示 AI 代理的工作流程
2. **可配置性**: 用户可通过拖拽方式自定义 Agent 流程
3. **状态可追踪**: 每个节点执行状态可监控和调试
4. **流程可复用**: 标准化的节点定义支持跨会话复用

### 1.2 技术选型

| 组件         | 技术                    | 说明                   |
| ------------ | ----------------------- | ---------------------- |
| **图框架**   | LangGraph (TypeScript)  | 基于状态机的图执行框架 |
| **可视化**   | React Flow              | 可拖拽的节点图编辑器   |
| **运行时**   | Bun + Hono              | OpenCode 现有后端      |
| **状态管理** | LangGraph State + Redis | 图状态持久化           |
| **通信协议** | SSE + WebSocket         | 实时状态推送           |

### 1.3 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        可视化编辑层                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React Flow 编辑器                           │   │
│  │  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐            │   │
│  │  │ Prompt│ → │ LLM  │ → │Tool  │ → │Result│            │   │
│  │  └──────┘   └──────┘   └──────┘   └──────┘            │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ JSON 图定义
┌────────────────────────▼────────────────────────────────────────┐
│                      LangGraph 执行层                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    StateGraph                          │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │    │
│  │  │ Prompt  │→ │  LLM    │→ │ Tool    │→ │ Output  │  │    │
│  │  │  Node   │  │  Node   │  │  Node   │  │  Node   │  │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    OpenCode 核心服务层                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  Session     │  │   Provider   │  │     Tool         │     │
│  │  Service     │  │   Service    │  │     Registry     │     │
│  └──────────────┘  └──────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、核心概念映射

### 2.1 OpenCode 流程 → LangGraph 节点

| OpenCode 组件                   | LangGraph 节点   | 职责                   |
| ------------------------------- | ---------------- | ---------------------- |
| `SessionPrompt.prompt()`        | `PromptNode`     | 处理用户输入，创建消息 |
| `LLM.stream()`                  | `LLMNode`        | 调用 AI 模型，流式处理 |
| `SessionProcessor.create()`     | `ProcessorNode`  | 处理流式响应           |
| `ToolRegistry.build()`          | `ToolNode`       | 执行工具调用           |
| `PermissionNext.ask()`          | `PermissionNode` | 权限检查               |
| `SessionCompaction.summarize()` | `CompactionNode` | 上下文压缩             |
| `Storage.write()`               | `StorageNode`    | 数据持久化             |
| `Bus.publish()`                 | `EventNode`      | 事件广播               |

### 2.2 OpenCode 状态 → LangGraph State

```typescript
// OpenCode 现有状态
interface OpenCodeState {
  sessionID: string
  messages: MessageV2[]
  parts: MessageV2.Part[]
  permissions: PermissionNext.Rule[]
}

// LangGraph State (扩展)
interface GraphState extends OpenCodeState {
  // 图执行状态
  currentNode?: string
  executionStatus: "idle" | "running" | "completed" | "error"

  // 流程控制
  nextNode?: string
  loopCount: number
  shouldContinue: boolean

  // LLM 相关
  llmResponse?: StreamTextResult
  toolCalls: ToolCall[]

  // 用户交互
  pendingPermissions: PermissionRequest[]
  userFeedback?: string

  // 元数据
  timestamps: {
    started: number
    lastUpdated: number
    completed?: number
  }
}
```

---

## 三、节点设计

### 3.1 节点基类定义

```typescript
// packages/opencode/src/graph/nodes/base.ts
import { StateGraph, Annotation } from "@langchain/langgraph"

export interface NodeConfig {
  id: string
  type: string
  name: string
  description?: string
  position?: { x: number; y: number } // React Flow 位置
}

export abstract class BaseNode {
  public readonly config: NodeConfig

  constructor(config: NodeConfig) {
    this.config = config
  }

  /**
   * 节点执行逻辑
   * @param state 当前图状态
   * @returns 更新后的状态
   */
  abstract execute(state: GraphState): Promise<Partial<GraphState>>

  /**
   * 节点错误处理
   */
  async onError(state: GraphState, error: Error): Promise<Partial<GraphState>> {
    return {
      executionStatus: "error",
      userFeedback: `Node ${this.config.id} failed: ${error.message}`,
    }
  }

  /**
   * 序列化节点配置（用于持久化和可视化）
   */
  toJSON(): object {
    return {
      id: this.config.id,
      type: this.config.type,
      name: this.config.name,
      description: this.config.description,
    }
  }
}
```

### 3.2 核心节点实现

#### 3.2.1 PromptNode - 提示词处理节点

```typescript
// packages/opencode/src/graph/nodes/prompt.ts
export class PromptNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "prompt" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, userInput } = state

    // 1. 获取会话
    const session = await Session.get(sessionID)

    // 2. 创建用户消息
    const message = await createUserMessage({
      sessionID,
      parts: [{ type: "text", text: userInput }],
      agent: session.agent,
    })

    // 3. 发布事件
    Bus.publish(MessageV2.Event.Created, { info: message })

    return {
      messages: [...state.messages, message],
      nextNode: "llm", // 下一个节点
      loopCount: state.loopCount + 1,
    }
  }
}
```

#### 3.2.2 LLMNode - AI 模型调用节点

```typescript
// packages/opencode/src/graph/nodes/llm.ts
export class LLMNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "llm" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, messages, model } = state

    // 1. 构建系统提示词
    const systemPrompt = await SystemPrompt.build({
      sessionID,
      agent: state.agent,
    })

    // 2. 获取工具定义
    const tools = await ToolRegistry.build({ sessionID })

    // 3. 调用 LLM
    const stream = await streamText({
      model,
      system: systemPrompt,
      messages: convertToAIMessages(messages),
      tools,
      maxSteps: 100,
    })

    return {
      llmResponse: stream,
      nextNode: "processor",
    }
  }
}
```

#### 3.2.3 ProcessorNode - 响应处理节点

```typescript
// packages/opencode/src/graph/nodes/processor.ts
export class ProcessorNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "processor" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { llmResponse, sessionID } = state
    const toolCalls: ToolCall[] = []

    // 处理流式响应
    for await (const value of llmResponse.fullStream) {
      switch (value.type) {
        case "text-delta":
          await this.handleTextDelta(state, value)
          break
        case "tool-call":
          toolCalls.push(value)
          break
        case "finish-step":
          await this.handleStepFinish(state, value)
          break
      }
    }

    return {
      toolCalls,
      nextNode: toolCalls.length > 0 ? "permission" : "output",
    }
  }

  private async handleTextDelta(state: GraphState, value: any) {
    // 保存文本增量并发布事件
    await Session.updatePart({
      part: state.currentTextPart,
      delta: value.text,
    })
    Bus.publish(MessageV2.Event.PartUpdated, {
      part: state.currentTextPart,
      delta: value.text,
    })
  }
}
```

#### 3.2.4 PermissionNode - 权限检查节点

```typescript
// packages/opencode/src/graph/nodes/permission.ts
export class PermissionNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "permission" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { toolCalls, sessionID } = state
    const pendingPermissions: PermissionRequest[] = []

    for (const toolCall of toolCalls) {
      // 检查权限
      const permission = await PermissionNext.ask({
        permission: toolCall.toolName,
        sessionID,
        metadata: toolCall.input,
      })

      if (permission.status === "pending") {
        pendingPermissions.push(permission)
      }
    }

    return {
      pendingPermissions,
      nextNode: pendingPermissions.length > 0 ? "wait_user" : "tool",
    }
  }
}
```

#### 3.2.5 ToolNode - 工具执行节点

```typescript
// packages/opencode/src/graph/nodes/tool.ts
export class ToolNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "tool" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { toolCalls, sessionID } = state
    const results: ToolResult[] = []

    for (const toolCall of toolCalls) {
      // 执行工具
      const tool = await ToolRegistry.get(toolCall.toolName)
      const result = await tool.execute(toolCall.input, { sessionID })
      results.push(result)

      // 发布事件
      Bus.publish(Tool.Event.Executed, {
        toolCallID: toolCall.id,
        result,
      })
    }

    return {
      toolResults: results,
      nextNode: "llm", // 返回 LLM 继续处理
      shouldContinue: true,
    }
  }
}
```

#### 3.2.6 OutputNode - 输出节点

```typescript
// packages/opencode/src/graph/nodes/output.ts
export class OutputNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "output" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, messages } = state

    // 保存最终消息
    await Session.updateMessage(state.assistantMessage)

    // 发布完成事件
    Bus.publish(MessageV2.Event.Completed, {
      sessionID,
      messageID: state.assistantMessage.id,
    })

    return {
      executionStatus: "completed",
      shouldContinue: false,
      timestamps: {
        ...state.timestamps,
        completed: Date.now(),
      },
    }
  }
}
```

### 3.3 条件边定义

```typescript
// packages/opencode/src/graph/edges.ts
export const EDGES = {
  // 固定边
  prompt: "llm",
  llm: "processor",
  processor: "permission",
  output: "__END__",

  // 条件边
  permission: (state: GraphState) => {
    if (state.pendingPermissions.length > 0) {
      return "wait_user"
    }
    if (state.toolCalls.length > 0) {
      return "tool"
    }
    return "output"
  },

  wait_user: (state: GraphState) => {
    if (state.userFeedback === "approve") {
      return "tool"
    }
    if (state.userFeedback === "reject") {
      return "output"
    }
    return null // 等待用户输入
  },

  tool: "llm", // 工具执行后返回 LLM

  // 循环控制
  llm: (state: GraphState) => {
    if (state.loopCount > 100) {
      return "output" // 防止无限循环
    }
    if (state.shouldContinue) {
      return "processor"
    }
    return "output"
  },
}
```

---

## 四、边与状态设计

### 4.1 图状态 Schema

```typescript
// packages/opencode/src/graph/state.ts
import { Annotation } from "@langchain/langgraph"

export const GraphStateSchema = Annotation.Root({
  // 会话上下文
  sessionID: Annotation<string>(),
  messages: Annotation<MessageV2[]>({
    reducer: (a, b) => [...a, ...b],
  }),
  parts: Annotation<MessageV2.Part[]>({
    reducer: (a, b) => [...a, ...b],
  }),

  // 流程控制
  nextNode: Annotation<string | undefined>(),
  loopCount: Annotation<number>({
    reducer: (a, b) => a + b,
    default: () => 0,
  }),
  shouldContinue: Annotation<boolean>({
    default: () => true,
  }),

  // LLM 相关
  llmResponse: Annotation<any>(),
  toolCalls: Annotation<ToolCall[]>({
    reducer: (a, b) => [...a, ...b],
  }),
  toolResults: Annotation<ToolResult[]>({
    reducer: (a, b) => [...a, ...b],
  }),

  // 用户交互
  pendingPermissions: Annotation<PermissionRequest[]>({
    reducer: (a, b) => [...a, ...b],
  }),
  userInput: Annotation<string>(),
  userFeedback: Annotation<string | undefined>(),

  // 执行状态
  currentNode: Annotation<string | undefined>(),
  executionStatus: Annotation<"idle" | "running" | "completed" | "error">({
    default: () => "idle",
  }),

  // 元数据
  timestamps: Annotation<{
    started: number
    lastUpdated: number
    completed?: number
  }>({
    default: () => ({ started: 0, lastUpdated: 0 }),
  }),
})

export type GraphState = typeof GraphStateSchema.State
```

### 4.2 状态持久化

```typescript
// packages/opencode/src/graph/persistence.ts
import { BaseCheckpointSaver } from "@langchain/langgraph"

export class RedisSaver extends BaseCheckpointSaver {
  private redis: Redis

  constructor(redisUrl: string) {
    super()
    this.redis = new Redis(redisUrl)
  }

  async get(namespace: string, key: string): Promise<any> {
    const data = await this.redis.get(`${namespace}:${key}`)
    return data ? JSON.parse(data) : null
  }

  async put(namespace: string, key: string, value: any): Promise<void> {
    await this.redis.set(`${namespace}:${key}`, JSON.stringify(value))
  }

  async delete(namespace: string, key: string): Promise<void> {
    await this.redis.del(`${namespace}:${key}`)
  }
}
```

---

## 五、架构实现方案

### 5.1 图状态 Schema

```typescript
// packages/flow/src/state.ts
import { Annotation } from "@langchain/langgraph"

export const GraphStateSchema = Annotation.Root({
  // 会话上下文
  sessionID: Annotation<string>(),
  messages: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),
  parts: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),

  // 流程控制
  nextNode: Annotation<string | undefined>(),
  loopCount: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
  shouldContinue: Annotation<boolean>({ default: () => true }),

  // LLM 相关
  llmResponse: Annotation<any>(),
  toolCalls: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),
  toolResults: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),

  // 用户交互
  pendingPermissions: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),
  userInput: Annotation<string>(),
  userFeedback: Annotation<string | undefined>(),

  // 执行状态
  currentNode: Annotation<string | undefined>(),
  executionStatus: Annotation<"idle" | "running" | "completed" | "error">({ default: () => "idle" }),

  // 元数据
  timestamps: Annotation<{ started: number; lastUpdated: number; completed?: number }>({
    default: () => ({ started: 0, lastUpdated: 0 }),
  }),
})

export type GraphState = typeof GraphStateSchema.State
```

---

## 六、独立包架构设计

### 6.1 设计原则

**核心原则**: 不修改 `packages/opencode/` 任何代码，通过以下方式实现集成：

1. **代码复制**: 将必要的类型定义、工具函数复制到 `packages/flow/`
2. **API 调用**: 通过 HTTP API 调用 OpenCode 现有服务（Session、Tool、Provider 等）
3. **事件总线**: 使用独立的 EventEmitter，通过 HTTP/SSE 与 OpenCode 事件系统对接
4. **配置隔离**: 独立的配置文件和数据库连接

### 6.2 目录结构

```
packages/
├── opencode/              # 原有核心包（不修改）
│   └── src/
├── flow/                  # 新建 LangGraph 包
│   ├── package.json
│   ├── tsconfig.json
│   ├── bunfig.toml
│   └── src/
│       ├── index.ts              # 导出
│       ├── state.ts              # GraphState Schema
│       ├── builder.ts            # 图构建器
│       ├── persistence.ts        # 状态持久化
│       ├── events.ts             # 图事件定义
│       ├── config.ts             # 配置管理
│       ├── opencode-client.ts    # OpenCode API 客户端
│       ├── nodes/
│       │   ├── base.ts           # 节点基类
│       │   ├── prompt.ts         # PromptNode
│       │   ├── llm.ts            # LLMNode
│       │   ├── processor.ts      # ProcessorNode
│       │   ├── permission.ts     # PermissionNode
│       │   ├── tool.ts           # ToolNode
│       │   └── output.ts         # OutputNode
│       ├── edges/
│       │   └── index.ts          # 边定义
│       ├── server/
│       │   ├── index.ts          # HTTP 服务器
│       │   └── routes/
│       │       ├── graph.ts      # 图相关路由
│       │       └── webhook.ts    # OpenCode 回调
│       └── copied/               # 从 OpenCode 复制的代码
│           ├── types.ts          # 类型定义（MessageV2, Tool 等）
│           └── utils.ts          # 工具函数
│   └── test/
│       └── nodes/
│           └── prompt.test.ts
└── web/                   # Web 前端
    └── src/
        └── components/
            └── graph/
```

### 6.3 package.json 配置

```json
{
  "name": "@opencode-ai/flow",
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "build": "bun build src/index.ts --outdir dist",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@langchain/langgraph": "^0.2.0",
    "@langchain/core": "^0.3.0",
    "@langchain/anthropic": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "hono": "^4.0.0",
    "zod": "^3.22.0",
    "redis": "^4.6.0",
    "@opencode-ai/util": "workspace:*"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

### 6.4 OpenCode API 客户端

```typescript
// packages/flow/src/opencode-client.ts
import { z } from "zod"

export interface OpenCodeClientConfig {
  baseUrl: string
  apiKey?: string
  username?: string
  password?: string
}

export class OpenCodeClient {
  private baseUrl: string
  private headers: HeadersInit

  constructor(config: OpenCodeClientConfig) {
    this.baseUrl = config.baseUrl
    this.headers = {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...(config.username && config.password
        ? { Authorization: `Basic ${btoa(`${config.username}:${config.password}`)}` }
        : {}),
    }
  }

  // 会话管理
  async getSession(sessionID: string) {
    const response = await fetch(`${this.baseUrl}/session/${sessionID}`, {
      headers: this.headers,
    })
    return response.json()
  }

  async createMessage(input: { sessionID: string; parts: any[] }) {
    const response = await fetch(`${this.baseUrl}/session/${input.sessionID}/message`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ parts: input.parts }),
    })
    return response.json()
  }

  async updatePart(part: any) {
    const response = await fetch(
      `${this.baseUrl}/session/${part.sessionID}/message/${part.messageID}/part/${part.id}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(part),
      },
    )
    return response.json()
  }

  // 工具执行
  async executeTool(toolName: string, input: any, sessionID: string) {
    // 通过 OpenCode 的工具 API 执行，或直接调用工具函数
    const response = await fetch(`${this.baseUrl}/tool/${toolName}/execute`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ input, sessionID }),
    })
    return response.json()
  }

  // 权限检查
  async checkPermission(input: { permission: string; patterns: string[]; sessionID: string }) {
    const response = await fetch(`${this.baseUrl}/permission`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(input),
    })
    return response.json()
  }

  // 事件订阅（SSE）
  subscribeEvents(
    sessionID: string,
    callbacks: {
      onNodeStarted?: (data: any) => void
      onNodeCompleted?: (data: any) => void
      onStateUpdated?: (data: any) => void
    },
  ) {
    const eventSource = new EventSource(`${this.baseUrl}/event?sessionID=${sessionID}`)

    eventSource.addEventListener("graph.node.started", (e) => {
      callbacks.onNodeStarted?.(JSON.parse(e.data))
    })

    eventSource.addEventListener("graph.node.completed", (e) => {
      callbacks.onNodeCompleted?.(JSON.parse(e.data))
    })

    return () => eventSource.close()
  }
}
```

### 6.5 节点实现（使用 API 客户端）

```typescript
// packages/flow/src/nodes/prompt.ts
import { BaseNode, NodeConfig } from "./base"
import { GraphState } from "../state"
import { OpenCodeClient } from "../opencode-client"

export class PromptNode extends BaseNode {
  private client: OpenCodeClient

  constructor(config: NodeConfig, client: OpenCodeClient) {
    super({ ...config, type: "prompt" })
    this.client = client
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, userInput } = state

    // 1. 获取会话
    const session = await this.client.getSession(sessionID)

    // 2. 创建用户消息
    const message = await this.client.createMessage({
      sessionID,
      parts: [{ type: "text", text: userInput }],
    })

    return {
      messages: [...state.messages, message],
      nextNode: "llm",
      loopCount: state.loopCount + 1,
    }
  }
}
```

```typescript
// packages/flow/src/nodes/tool.ts
import { BaseNode, NodeConfig } from "./base"
import { GraphState } from "../state"
import { OpenCodeClient } from "../opencode-client"

export class ToolNode extends BaseNode {
  private client: OpenCodeClient

  constructor(config: NodeConfig, client: OpenCodeClient) {
    super({ ...config, type: "tool" })
    this.client = client
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { toolCalls, sessionID } = state
    const results: any[] = []

    for (const toolCall of toolCalls) {
      // 通过 API 执行工具
      const result = await this.client.executeTool(toolCall.toolName, toolCall.input, sessionID)
      results.push(result)
    }

    return {
      toolResults: results,
      nextNode: "llm",
      shouldContinue: true,
    }
  }
}
```

### 6.6 图构建器

```typescript
// packages/flow/src/builder.ts
import { StateGraph, END } from "@langchain/langgraph"
import { GraphStateSchema, GraphState } from "./state"
import { BaseNode } from "./nodes/base"
import { OpenCodeClient } from "./opencode-client"

export class GraphBuilder {
  private nodes: Map<string, BaseNode> = new Map()
  private edges: Map<string, string | ((state: GraphState) => string | null)> = new Map()
  private client: OpenCodeClient

  constructor(client: OpenCodeClient) {
    this.client = client
  }

  addNode(node: BaseNode): this {
    this.nodes.set(node.config.id, node)
    return this
  }

  addEdge(from: string, to: string | ((state: GraphState) => string | null)): this {
    this.edges.set(from, to)
    return this
  }

  build(): any {
    const workflow = new StateGraph(GraphStateSchema)

    // 添加节点
    for (const [id, node] of this.nodes.entries()) {
      workflow.addNode(id, async (state) => {
        try {
          return await node.execute(state as GraphState)
        } catch (error) {
          return await node.onError(state as GraphState, error as Error)
        }
      })
    }

    // 添加边
    for (const [from, to] of this.edges.entries()) {
      if (typeof to === "function") {
        workflow.addConditionalEdges(from, to)
      } else if (to === "__END__") {
        workflow.addEdge(from, END)
      } else {
        workflow.addEdge(from, to)
      }
    }

    workflow.setEntryPoint("prompt")
    return workflow.compile()
  }
}

// 创建默认图
export function createDefaultGraph(client: OpenCodeClient): any {
  return new GraphBuilder(client)
    .addNode(new PromptNode({ id: "prompt", name: "提示词处理" }, client))
    .addNode(new LLMNode({ id: "llm", name: "AI 模型调用" }, client))
    .addNode(new ProcessorNode({ id: "processor", name: "响应处理" }, client))
    .addNode(new PermissionNode({ id: "permission", name: "权限检查" }, client))
    .addNode(new ToolNode({ id: "tool", name: "工具执行" }, client))
    .addNode(new OutputNode({ id: "output", name: "结果输出" }, client))
    .addEdge("prompt", "llm")
    .addEdge("llm", "processor")
    .addEdge("processor", "permission")
    .addEdge("permission", (state) =>
      state.pendingPermissions.length > 0 ? "wait_user" : state.toolCalls.length > 0 ? "tool" : "output",
    )
    .addEdge("tool", "llm")
    .addEdge("output", "__END__")
    .build()
}
```

### 6.7 HTTP 服务器

```typescript
// packages/flow/src/server/index.ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import { GraphRoutes } from "./routes/graph"
import { WebhookRoutes } from "./routes/webhook"

export function createServer() {
  const app = new Hono()

  // 中间件
  app.use("*", cors())

  // 路由
  app.route("/graph", GraphRoutes())
  app.route("/webhook", WebhookRoutes())

  // 健康检查
  app.get("/health", (c) => c.json({ status: "ok" }))

  return app
}

// 启动服务器
const app = createServer()

export default {
  port: process.env.PORT || 4097, // 使用不同端口，避免冲突
  fetch: app.fetch,
}
```

### 6.8 从 OpenCode 复制的代码

需要复制的类型和工具函数：

```typescript
// packages/flow/src/copied/types.ts
// 从 packages/opencode/src/session/message-v2.ts 复制
export type MessageV2 = {
  id: string
  sessionID: string
  role: "user" | "assistant"
  // ... 其他字段
}

// 从 packages/opencode/src/tool/tool.ts 复制
export type ToolInfo = {
  name: string
  description: string
  parameters: any
}

// 从 packages/opencode/src/permission/next.ts 复制
export type PermissionRequest = {
  id: string
  permission: string
  metadata?: Record<string, any>
}
```

```typescript
// packages/flow/src/copied/utils.ts
// 从 packages/opencode/src/util 复制必要的工具函数
export function convertToAIMessages(messages: any[]): any[] {
  // 转换逻辑
}

export function createDefaultTitle(isFork: boolean): string {
  return isFork ? "New Session (fork)" : "New Session"
}
```

### 6.9 配置管理

```typescript
// packages/flow/src/config.ts
import { z } from "zod"

const ConfigSchema = z.object({
  opencode: z.object({
    baseUrl: z.string().default("http://localhost:4096"),
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }),
  server: z.object({
    port: z.number().default(4097),
    hostname: z.string().default("0.0.0.0"),
  }),
  redis: z.object({
    url: z.string().optional(),
  }),
})

export type Config = z.infer<typeof ConfigSchema>

export async function loadConfig(): Promise<Config> {
  // 从环境变量或配置文件加载
  return {
    opencode: {
      baseUrl: process.env.OPENCODE_BASE_URL || "http://localhost:4096",
      apiKey: process.env.OPENCODE_API_KEY,
      username: process.env.OPENCODE_SERVER_USERNAME,
      password: process.env.OPENCODE_SERVER_PASSWORD,
    },
    server: {
      port: parseInt(process.env.PORT || "4097"),
      hostname: "0.0.0.0",
    },
    redis: {
      url: process.env.REDIS_URL,
    },
  }
}
```

### 6.10 与 OpenCode 的集成方式

```
┌─────────────────────────────────────────────────────────────────┐
│                         packages/flow/                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │  Graph API    │←─┤  OpenCode     │←─┤ HTTP Client       │   │
│  │  (port:4097)  │  │   Client      │  │ (port:4096)       │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                                              │
         │                                              │
         ▼                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         packages/web/                            │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │  Graph UI     │  │  OpenCode UI  │                           │
│  │  (React Flow) │  │               │                           │
│  └───────────────┘  └───────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

**集成要点**:

1. **独立端口**: Flow 服务运行在 4097 端口，OpenCode 运行在 4096
2. **API 调用**: Flow 通过 HTTP 调用 OpenCode 的 Session、Tool、Permission API
3. **事件同步**: 通过 Webhook 或 SSE 订阅 OpenCode 事件
4. **数据同步**: 共享同一个数据库/文件系统存储

### 6.11 部署配置

```yaml
# docker-compose.yml
version: "3.8"
services:
  opencode:
    build:
      context: .
      dockerfile: packages/opencode/Dockerfile
    ports:
      - "4096:4096"
    environment:
      - OPENCODE_SERVER_PASSWORD=xxx

  flow:
    build:
      context: .
      dockerfile: packages/flow/Dockerfile
    ports:
      - "4097:4097"
    environment:
      - OPENCODE_BASE_URL=http://opencode:4096
      - PORT=4097
    depends_on:
      - opencode

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

---

## 七、React Flow 可视化集成

### 7.1 节点类型定义

```typescript
// packages/web/src/graph/node-types.ts
export interface GraphNode {
  id: string
  type: "prompt" | "llm" | "processor" | "permission" | "tool" | "output"
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    status?: "idle" | "running" | "completed" | "error"
    config?: Record<string, any>
  }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: "default" | "conditional"
  label?: string
  animated?: boolean
}

// 节点类型映射
export const NODE_TYPES: Record<string, ComponentType> = {
  prompt: PromptNodeComponent,
  llm: LLMNodeComponent,
  processor: ProcessorNodeComponent,
  permission: PermissionNodeComponent,
  tool: ToolNodeComponent,
  output: OutputNodeComponent,
}
```

### 7.2 自定义节点组件

### 7.3 图编辑器组件

### 7.4 实时状态同步

### 7.5 图配置持久化

---

## 八、实施路线图

### 8.1 第一阶段：独立包基础架构 (2 周)

**目标**: 创建 `packages/flow/` 包，完成 LangGraph 基础集成

- [ ] 创建 `packages/flow/` 目录结构和 package.json
- [ ] 安装 LangGraph TypeScript 包
- [ ] 定义 GraphState Schema
- [ ] 实现 OpenCode API 客户端 (`opencode-client.ts`)
- [ ] 从 OpenCode 复制必要的类型和工具函数
- [ ] 实现核心节点（Prompt, LLM, Processor, Output）
- [ ] 创建默认图构建器
- [ ] 实现独立 HTTP 服务器（端口 4097）

**交付物**:

- `packages/flow/` 独立包
- 可通过 API 启动图执行
- 通过 HTTP 调用 OpenCode 服务

**代码复制清单**:
| 源文件 | 目标文件 | 说明 |
|--------|----------|------|
| `packages/opencode/src/session/message-v2.ts` | `packages/flow/src/copied/types.ts` | 消息类型 |
| `packages/opencode/src/tool/tool.ts` | `packages/flow/src/copied/types.ts` | 工具类型 |
| `packages/opencode/src/permission/next.ts` | `packages/flow/src/copied/types.ts` | 权限类型 |
| `packages/opencode/src/session/utils.ts` | `packages/flow/src/copied/utils.ts` | 工具函数 |

### 8.2 第二阶段：完整流程 (2 周)

**目标**: 实现完整会话处理流程

- [ ] 实现 PermissionNode 和 ToolNode
- [ ] 添加条件边逻辑
- [ ] 实现循环控制（loop）
- [ ] 集成状态持久化（Redis）
- [ ] 添加图执行监控
- [ ] 实现 Webhook 接收 OpenCode 事件

**交付物**:

- 完整的会话处理图
- 状态持久化支持
- OpenCode 事件集成

### 8.3 第三阶段：可视化基础 (3 周)

**目标**: React Flow 基础集成

- [ ] 在 `packages/web/` 中安装 React Flow
- [ ] 创建节点组件库
- [ ] 实现图编辑器基础功能
- [ ] 添加节点拖拽支持
- [ ] 实现边连接功能
- [ ] 连接 Flow 后端 API

**交付物**:

- `packages/web/src/components/graph/` 可视化组件
- 可拖拽的图编辑器
- 与 Flow 后端通信

### 8.4 第四阶段：实时同步 (2 周)

**目标**: 实时状态同步

- [ ] 实现 SSE 状态推送（Flow → Web）
- [ ] 添加节点状态更新
- [ ] 实现执行进度可视化
- [ ] 添加错误状态显示
- [ ] 优化性能（防抖、节流）

**交付物**:

- 实时状态同步
- 执行进度可视化

### 8.5 第五阶段：高级功能 (3 周)

**目标**: 高级编辑功能

- [ ] 节点配置面板
- [ ] 图导入/导出
- [ ] 图模板系统
- [ ] 版本控制
- [ ] 协作编辑（可选）

**交付物**:

- 完整的图编辑功能
- 图模板系统

### 8.6 技术债务与优化

- **性能优化**: 大图性能、虚拟滚动
- **错误处理**: 完善的错误边界
- **测试覆盖**: 单元测试 + E2E 测试
- **文档**: API 文档 + 用户指南

---

## 九、文件结构

```
packages/
├── opencode/              # 原有核心包（不修改）
│   └── src/
├── flow/                  # 新建 LangGraph 包
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # 导出
│       ├── state.ts              # GraphState Schema
│       ├── builder.ts            # 图构建器
│       ├── persistence.ts        # 状态持久化
│       ├── events.ts             # 图事件定义
│       ├── config.ts             # 配置管理
│       ├── opencode-client.ts    # OpenCode API 客户端
│       ├── nodes/
│       │   ├── base.ts           # 节点基类
│       │   ├── prompt.ts         # PromptNode
│       │   ├── llm.ts            # LLMNode
│       │   ├── processor.ts      # ProcessorNode
│       │   ├── permission.ts     # PermissionNode
│       │   ├── tool.ts           # ToolNode
│       │   └── output.ts         # OutputNode
│       ├── edges/
│       │   └── index.ts          # 边定义
│       ├── server/
│       │   ├── index.ts          # HTTP 服务器
│       │   └── routes/
│       ├── copied/               # 从 OpenCode 复制的代码
│       │   ├── types.ts          # 类型定义
│       │   └── utils.ts          # 工具函数
│       └── test/
└── web/                   # Web 前端
    └── src/
        └── components/
            └── graph/
```

---

## 十、依赖包

### 10.1 packages/flow 依赖

```json
{
  "dependencies": {
    "@langchain/langgraph": "^0.2.0",
    "@langchain/core": "^0.3.0",
    "@langchain/anthropic": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "hono": "^4.0.0",
    "zod": "^3.22.0",
    "redis": "^4.6.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
```

### 10.2 packages/web 依赖（React Flow）

```json
{
  "dependencies": {
    "reactflow": "^11.10.0",
    "@xyflow/react": "^12.0.0"
  }
}
```

---

## 十一、风险与挑战

### 11.1 技术风险

| 风险                    | 影响 | 缓解措施                  |
| ----------------------- | ---- | ------------------------- |
| LangGraph TS 版本不成熟 | 高   | 评估替代方案（如 XState） |
| React Flow 性能问题     | 中   | 虚拟滚动、懒加载          |
| 状态同步延迟            | 中   | 优化 SSE、使用 WebSocket  |
| 代码复制维护成本高      | 中   | 建立自动化同步脚本        |

### 11.2 实施挑战

1. **代码同步**: OpenCode 类型变更时需手动同步到 flow 包
2. **状态管理复杂性**: 图状态与现有 Session 状态同步
3. **可视化性能**: 大图渲染性能优化
4. **API 兼容性**: 确保 OpenCode API 向后兼容

### 11.3 成功标准

- ✅ 完整会话流程可用 LangGraph 执行
- ✅ 可视化编辑器可拖拽定义流程
- ✅ 实时状态同步延迟 < 500ms
- ✅ 支持至少 50 个节点的图
- ✅ 不修改 packages/opencode 任何代码

---

## 附录

### A. 相关资源

- [LangGraph 文档](https://langchain-ai.github.io/langgraph/)
- [React Flow 文档](https://reactflow.dev/docs)
- [OpenCode 系统架构](./系统架构.md)
- [OpenCode 实现原理](./实现原理.md)

### B. 更新日志

| 版本 | 日期       | 更新内容                               |
| ---- | ---------- | -------------------------------------- |
| 1.1  | 2026-03-01 | 更新为独立包架构，不修改 opencode 代码 |
| 1.0  | 2026-03-01 | 初始版本                               |

本文档版本：1.1  
创建日期：2026-03-01  
作者：AI Assistant
