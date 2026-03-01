import type { GraphState } from "../state"

export interface NodeConfig {
  id: string
  type: string
  name: string
  description?: string
  position?: { x: number; y: number }
}

export abstract class BaseNode {
  public readonly config: NodeConfig

  constructor(config: NodeConfig) {
    this.config = config
  }

  /**
   * 节点执行逻辑
   */
  abstract execute(state: GraphState): Promise<Partial<GraphState>>

  /**
   * 节点错误处理
   */
  async onError(state: GraphState, error: Error): Promise<Partial<GraphState>> {
    console.error(`Node ${this.config.id} error:`, error)
    return {
      executionStatus: "error" as const,
      userFeedback: `Node ${this.config.id} failed: ${error.message}`,
      timestamps: {
        ...state.timestamps,
        lastUpdated: Date.now(),
      },
    }
  }

  /**
   * 序列化节点配置
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
