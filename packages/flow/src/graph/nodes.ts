import { nodeRegistry } from "./node-registry"
import type { GraphState } from "../state"

/**
 * 基础节点类
 * 提供通用的节点功能
 */
export abstract class BaseNode {
  id: string = "base"
  type: string = "base"
  config?: Record<string, any>

  constructor(config?: Record<string, any>) {
    this.config = config
  }

  /**
   * 执行节点逻辑（子类必须实现）
   */
  abstract execute(state: GraphState): Promise<Partial<GraphState>>

  /**
   * 错误处理
   */
  async onError(state: GraphState, error: Error): Promise<Partial<GraphState>> {
    console.error(`[BaseNode] ${this.id} error:`, error)
    return {
      executionStatus: "error",
      userFeedback: `Node ${this.id} failed: ${error.message}`,
      timestamps: {
        ...state.timestamps,
        lastUpdated: Date.now(),
      },
    }
  }

  /**
   * 序列化为 JSON
   */
  toJSON(): object {
    return {
      id: this.id,
      type: this.type,
      config: this.config,
    }
  }
}

/**
 * 提示词节点
 */
export class PromptNode extends BaseNode {
  id = "prompt"
  type = "prompt"

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    try {
      console.log("[PromptNode] Executing...")

      return {
        nextNode: "llm",
        loopCount: state.loopCount + 1,
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      return this.onError(state, error as Error)
    }
  }
}

/**
 * LLM 节点
 */
export class LLMNode extends BaseNode {
  id = "llm"
  type = "llm"

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    try {
      console.log("[LLMNode] Executing...")

      return {
        nextNode: "processor",
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      return this.onError(state, error as Error)
    }
  }
}

/**
 * 处理器节点
 */
export class ProcessorNode extends BaseNode {
  id = "processor"
  type = "processor"

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    try {
      console.log("[ProcessorNode] Executing...")

      const hasToolCalls = state.toolCalls && state.toolCalls.length > 0

      return {
        nextNode: hasToolCalls ? "permission" : "output",
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      return this.onError(state, error as Error)
    }
  }
}

/**
 * 权限节点
 */
export class PermissionNode extends BaseNode {
  id = "permission"
  type = "permission"

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    try {
      console.log("[PermissionNode] Executing...")

      const hasPending = state.pendingPermissions && state.pendingPermissions.length > 0

      return {
        nextNode: hasPending ? "wait_user" : "tool",
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      return this.onError(state, error as Error)
    }
  }
}

/**
 * 工具节点
 */
export class ToolNode extends BaseNode {
  id = "tool"
  type = "tool"

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    try {
      console.log("[ToolNode] Executing...")

      return {
        toolResults: state.toolResults || [],
        nextNode: "llm",
        shouldContinue: true,
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      return this.onError(state, error as Error)
    }
  }
}

/**
 * 输出节点
 */
export class OutputNode extends BaseNode {
  id = "output"
  type = "output"

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    try {
      console.log("[OutputNode] Executing...")

      return {
        executionStatus: "completed",
        shouldContinue: false,
        timestamps: {
          ...state.timestamps,
          completed: Date.now(),
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      return this.onError(state, error as Error)
    }
  }
}

/**
 * 注册内置节点
 */
export function registerBuiltInNodes() {
  nodeRegistry.register("prompt", PromptNode)
  nodeRegistry.register("llm", LLMNode)
  nodeRegistry.register("processor", ProcessorNode)
  nodeRegistry.register("permission", PermissionNode)
  nodeRegistry.register("tool", ToolNode)
  nodeRegistry.register("output", OutputNode)

  console.log("[NodeRegistry] Built-in nodes registered")
}
