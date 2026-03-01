import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { OpenCodeClient } from "../opencode-client"

export class OutputNode extends BaseNode {
  private client: OpenCodeClient

  constructor(config: NodeConfig, client: OpenCodeClient) {
    super({ ...config, type: "output" })
    this.client = client
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID } = state

    console.log(`[OutputNode] Completing session ${sessionID}`)

    try {
      // 发布完成事件（通过客户端或其他方式）
      // 这里只是标记完成，实际消息保存由 OpenCode 处理

      return {
        executionStatus: "completed" as const,
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
