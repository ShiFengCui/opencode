# OpenCode + LangGraph 可视化架构方案（优化版）

> **核心目标**: 基于 LangGraph 框架，建设可拖拽的可视化编码产品，节点封装 OpenCode 全部能力，支持完全复刻 OpenCode 功能。
>
> **架构原则**:
>
> 1. 复制 OpenCode 核心代码到 `packages/flow/`，直接调用而非 HTTP
> 2. 节点完整封装 OpenCode 能力（Session、Tool、Permission、Provider）
> 3. 可视化流程能完全复刻 OpenCode 所有功能
> 4. 保持 `packages/opencode/` 不变，flow 作为独立产品运行

---

## 一、方案概述

### 1.1 产品定位

**Flow** 是 OpenCode 的可视化版本，提供：

- 🎨 **可视化编辑**: 拖拽节点定义 AI 工作流
- 🔧 **完整能力**: 100% 复刻 OpenCode 所有功能
- 📦 **独立运行**: 不依赖 OpenCode 运行时
- 🚀 **性能优化**: 本地调用，无 HTTP 开销

### 1.2 核心差异

| 特性     | OpenCode       | Flow                    |
| -------- | -------------- | ----------------------- |
| 交互方式 | CLI / Web 对话 | 可视化拖拽              |
| 流程定义 | 固定会话循环   | 可自定义节点图          |
| 代码复用 | 原始实现       | 复制到 flow 包          |
| 调用方式 | 直接调用       | 直接调用（同左）        |
| 运行时   | 独立           | 独立（不依赖 OpenCode） |

### 1.3 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        可视化编辑层 (React Flow)                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  节点库  │  画布编辑器  │  配置面板  │  模板管理       │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ 图定义 (JSON)
┌────────────────────────▼────────────────────────────────────────┐
│                      LangGraph 执行层 (packages/flow)            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  StateGraph + Nodes + Edges                            │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │    │
│  │  │ Prompt  │→ │  LLM    │→ │  Tool   │→ │ Output  │  │    │
│  │  │  Node   │  │  Node   │  │  Node   │  │  Node   │  │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────┘
                         │ 直接调用（无 HTTP）
┌────────────────────────▼────────────────────────────────────────┐
│                  OpenCode 核心代码 (已复制到 flow)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  Session     │  │   Provider   │  │     Tool         │     │
│  │  (复制)      │  │   (复制)     │  │     (复制)       │     │
│  └──────────────┘  └──────────────┘  └──────────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  Permission  │  │    Storage   │  │      Bus         │     │
│  │  (复制)      │  │   (复制)     │  │    (复制)        │     │
│  └──────────────┘  └──────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、代码复制策略

### 2.1 需要复制的核心模块

```
packages/opencode/src/          →      packages/flow/src/opencode/
├── session/                    →      ├── session/
│   ├── index.ts                →      │   ├── index.ts          # 会话管理
│   ├── message-v2.ts           →      │   ├── message-v2.ts     # 消息模型
│   ├── prompt.ts               →      │   ├── prompt.ts         # 提示词处理
│   ├── processor.ts            →      │   ├── processor.ts      # 消息处理
│   ├── llm.ts                  →      │   ├── llm.ts            # LLM 调用
│   └── compaction.ts           →      │   └── compaction.ts     # 上下文压缩
├── tool/                       →      ├── tool/
│   ├── tool.ts                 →      │   ├── tool.ts           # 工具定义
│   ├── registry.ts             →      │   ├── registry.ts       # 工具注册表
│   ├── read.ts                 →      │   ├── read.ts           # 读文件
│   ├── write.ts                →      │   ├── write.ts          # 写文件
│   ├── edit.ts                 →      │   ├── edit.ts           # 编辑文件
│   ├── bash.ts                 →      │   ├── bash.ts           # 执行命令
│   ├── grep.ts                 →      │   ├── grep.ts           # 搜索
│   └── ...                     →      │   └── ...
├── permission/                 →      ├── permission/
│   └── next.ts                 →      │   └── next.ts           # 权限控制
├── provider/                   →      ├── provider/
│   ├── provider.ts             →      │   ├── provider.ts       # 提供商管理
│   └── models.ts               →      │   └── models.ts         # 模型配置
├── storage/                    →      ├── storage/
│   └── storage.ts              →      │   └── storage.ts        # 文件存储
├── bus/                        →      ├── bus/
│   ├── index.ts                →      │   ├── index.ts          # 事件总线
│   └── bus-event.ts            →      │   └── bus-event.ts      # 事件定义
└── util/                       →      ├── util/
    ├── filesystem.ts           →      │   ├── filesystem.ts     # 文件系统
    └── log.ts                  →      │   └── log.ts            # 日志
```

### 2.2 复制后的调用方式

**之前（HTTP 调用 - 不推荐）**:

```typescript
// packages/flow/src/opencode-client.ts
async getSession(sessionID: string) {
  const response = await fetch(`http://localhost:4096/session/${sessionID}`)
  return response.json()
}
```

**优化后（直接调用 - 推荐）**:

```typescript
// packages/flow/src/nodes/prompt.ts
import { Session } from '../opencode/session'
import { Bus } from '../opencode/bus'

async execute(state: GraphState) {
  // 直接调用复制过来的代码
  const session = await Session.get(state.sessionID)
  const message = await Session.createMessage({ ... })
  Bus.publish(MessageV2.Event.Created, { info: message })
}
```

### 2.3 代码适配层

部分代码需要适配才能独立运行：

```typescript
// packages/flow/src/opencode-adapter.ts

/**
 * 配置适配器 - 使用 flow 的配置而非 opencode
 */
export const ConfigAdapter = {
  get: (key: string) => {
    return process.env[`FLOW_${key}`] || process.env[key]
  },
  getStateDir: () => {
    return process.env.FLOW_STATE_DIR || "./.flow-state"
  },
}

/**
 * 日志适配器 - 使用 flow 的日志前缀
 */
export const LogAdapter = {
  info: (service: string, message: string, extra?: any) => {
    console.log(`[Flow:${service}] ${message}`, extra || "")
  },
  error: (service: string, message: string, error?: any) => {
    console.error(`[Flow:${service}] ${message}`, error || "")
  },
}

/**
 * 存储路径适配器
 */
export function adaptStoragePath(originalPath: string): string {
  const stateDir = ConfigAdapter.getStateDir()
  return originalPath.replace("~/.opencode", stateDir)
}
```

---

## 三、节点设计（完整封装）

### 3.1 节点分类

| 分类     | 节点           | 封装的 OpenCode 能力   |
| -------- | -------------- | ---------------------- |
| **输入** | PromptNode     | Session.createMessage  |
| **处理** | LLMNode        | LLM.stream, Provider   |
| **处理** | ProcessorNode  | SessionProcessor       |
| **工具** | ToolNode       | ToolRegistry, 所有工具 |
| **控制** | PermissionNode | PermissionNext.ask     |
| **控制** | ConditionNode  | 条件判断               |
| **控制** | LoopNode       | 循环控制               |
| **输出** | OutputNode     | Session.updateMessage  |
| **输出** | FileNode       | File.write             |

### 3.2 完整节点实现示例

```typescript
// packages/flow/src/nodes/ToolNode.ts
import { BaseNode } from "./base"
import { ToolRegistry } from "../opencode/tool/registry"
import { PermissionNext } from "../opencode/permission/next"
import { Bus } from "../opencode/bus"

export class ToolNode extends BaseNode {
  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { toolCalls, sessionID } = state
    const results: any[] = []

    for (const toolCall of toolCalls) {
      // 1. 权限检查（直接调用复制的代码）
      await PermissionNext.ask({
        permission: toolCall.toolName,
        sessionID,
        metadata: toolCall.input,
      })

      // 2. 获取工具（直接调用复制的代码）
      const tool = await ToolRegistry.get(toolCall.toolName)

      // 3. 执行工具
      const result = await tool.execute(toolCall.input, { sessionID })
      results.push(result)

      // 4. 发布事件（直接调用复制的代码）
      Bus.publish(Tool.Event.Executed, {
        toolCallID: toolCall.id,
        result,
      })
    }

    return {
      toolResults: results,
      nextNode: "llm",
      shouldContinue: true,
    }
  }
}
```

### 3.3 可配置节点参数

```typescript
// LLM 节点配置
interface LLMNodeConfig {
  provider: "anthropic" | "openai" | "google"
  model: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
}

// Tool 节点配置
interface ToolNodeConfig {
  allowedTools: string[]
  defaultTimeout: number
  requirePermission: boolean
}

// Permission 节点配置
interface PermissionNodeConfig {
  autoApprove: string[]
  autoReject: string[]
  requireApproval: string[]
}
```

---

## 四、架构实现

### 4.1 目录结构（完整版）

```
packages/flow/
├── package.json
├── tsconfig.json
├── bunfig.toml
├── README.md
├── .env.example
├── src/
│   ├── index.ts                    # 入口
│   ├── server/
│   │   ├── index.ts                # HTTP 服务器（仅用于 Web UI）
│   │   └── routes/
│   │       ├── graph.ts            # 图执行 API
│   │       └── sse.ts              # SSE 推送
│   ├── graph/
│   │   ├── state.ts                # GraphState Schema
│   │   ├── builder.ts              # 图构建器
│   │   ├── persistence.ts          # 文件存储
│   │   └── events.ts               # 图事件
│   ├── nodes/
│   │   ├── base.ts                 # 节点基类
│   │   ├── PromptNode.ts           # 提示词节点
│   │   ├── LLMNode.ts              # LLM 节点
│   │   ├── ProcessorNode.ts        # 处理器节点
│   │   ├── ToolNode.ts             # 工具节点
│   │   ├── PermissionNode.ts       # 权限节点
│   │   ├── ConditionNode.ts        # 条件节点
│   │   └── OutputNode.ts           # 输出节点
│   └── opencode/                   # 复制的 OpenCode 代码
│       ├── session/
│       ├── tool/
│       ├── permission/
│       ├── provider/
│       ├── storage/
│       ├── bus/
│       └── util/
└── test/
    ├── nodes/
    └── graph/
```

### 4.2 独立运行配置

```typescript
// packages/flow/src/config.ts
export const FlowConfig = {
  // 独立的状态目录
  stateDir: process.env.FLOW_STATE_DIR || "./.flow-state",

  // 独立的配置
  providers: {
    anthropic: { apiKey: process.env.FLOW_ANTHROPIC_API_KEY },
    openai: { apiKey: process.env.FLOW_OPENAI_API_KEY },
  },

  // 工具配置
  tools: {
    bash: { enabled: true, timeout: 120000 },
    read: { enabled: true, maxLines: 2000 },
    // ...
  },

  // 权限配置
  permissions: {
    default: "ask", // ask | allow | deny
    rules: [],
  },
}
```

### 4.3 与 OpenCode 的关系

```
┌─────────────────────────────────────────────────────────┐
│                    代码关系                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  packages/opencode/          packages/flow/            │
│  ┌─────────────┐            ┌─────────────┐           │
│  │  原始代码   │  ──────→   │  复制代码   │           │
│  │  (不修改)   │   复制     │  (可适配)   │           │
│  └─────────────┘            └─────────────┘           │
│                                                         │
│  变更同步：手动或脚本定期同步                             │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   运行时关系                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  OpenCode 运行时          Flow 运行时                   │
│  ┌─────────────┐         ┌─────────────┐              │
│  │   CLI       │         │  Graph API  │              │
│  │   Web       │         │  + Web UI   │              │
│  └─────────────┘         └─────────────┘              │
│                                                         │
│  独立运行，互不依赖                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 五、实施路线图（优化版）

### 阶段 1: 代码复制与适配 (Week 1-3)

**Week 1: 核心模块复制**

- [ ] 复制 `session/` 模块
- [ ] 复制 `tool/` 模块（所有工具）
- [ ] 复制 `permission/` 模块
- [ ] 适配配置系统

**Week 2: 基础设施复制**

- [ ] 复制 `storage/` 模块
- [ ] 复制 `bus/` 模块
- [ ] 复制 `util/` 模块
- [ ] 复制 `provider/` 模块

**Week 3: 节点实现**

- [ ] 实现节点基类
- [ ] 实现 PromptNode
- [ ] 实现 LLMNode
- [ ] 实现 ToolNode
- [ ] 实现 PermissionNode
- [ ] 实现 OutputNode

**交付物**: 可独立运行的 flow 后端

### 阶段 2: 可视化前端 (Week 4-6)

**Week 4: React Flow 基础**

- [ ] 安装 React Flow
- [ ] 实现节点组件
- [ ] 实现拖拽功能

**Week 5: 图编辑器**

- [ ] 实现 GraphEditor
- [ ] 实现边连接
- [ ] 实现配置面板

**Week 6: API 集成**

- [ ] 实现 Flow API 客户端
- [ ] 图执行控制
- [ ] 状态同步

**交付物**: 可视化编辑器 MVP

### 阶段 3: 实时与优化 (Week 7-9)

**Week 7: SSE 推送**

- [ ] 实现 SSE 服务端
- [ ] 实现 SSE 客户端
- [ ] 节点状态实时更新

**Week 8: 性能优化**

- [ ] 防抖/节流
- [ ] 大图性能优化
- [ ] 错误处理

**Week 9: 高级功能**

- [ ] 节点配置面板
- [ ] 模板系统
- [ ] 版本控制

**交付物**: 完整可视化产品

---

## 六、使用方式

### 6.1 启动 Flow

```bash
# 1. 设置环境变量
export FLOW_ANTHROPIC_API_KEY=sk-ant-xxx
export FLOW_STATE_DIR=./.flow-state
export PORT=4097

# 2. 启动服务
cd packages/flow
bun run dev

# 3. 访问 Web UI
open http://localhost:3000
```

### 6.2 创建可视化流程

1. 从节点库拖拽节点到画布
2. 连接节点定义流程
3. 配置节点参数
4. 保存为模板
5. 执行流程

### 6.3 复刻 OpenCode 功能

任何 OpenCode 能做的任务，Flow 都能通过可视化流程完成：

| OpenCode 功能 | Flow 实现方式                         |
| ------------- | ------------------------------------- |
| 对话          | Prompt → LLM → Output                 |
| 工具调用      | Prompt → LLM → Tool → LLM → Output    |
| 权限控制      | Tool → Permission → Tool              |
| 文件编辑      | Tool(Read) → Tool(Edit) → Tool(Write) |
| 多轮对话      | Loop 节点 + 条件判断                  |

---

## 七、风险与缓解

| 风险         | 影响 | 缓解措施               |
| ------------ | ---- | ---------------------- |
| 代码同步困难 | 高   | 建立自动化同步脚本     |
| 适配工作量大 | 中   | 优先复制核心模块       |
| 性能问题     | 中   | 本地调用，无 HTTP 开销 |
| 维护成本高   | 中   | 明确 flow 为独立产品   |

---

## 八、成功标准

- ✅ flow 可独立运行，不依赖 opencode
- ✅ 所有节点直接调用本地代码，无 HTTP
- ✅ 100% 复刻 opencode 功能
- ✅ 可视化流程可定义任意 AI 工作流
- ✅ 性能优于或等于 opencode

---

## 更新日志

| 版本 | 日期       | 更新内容                               |
| ---- | ---------- | -------------------------------------- |
| 2.0  | 2026-03-02 | 优化为直接调用复制代码，移除 HTTP 依赖 |
| 1.2  | 2026-03-01 | 添加详细开发步骤                       |
| 1.1  | 2026-03-01 | 更新为独立包架构                       |
| 1.0  | 2026-03-01 | 初始版本                               |
