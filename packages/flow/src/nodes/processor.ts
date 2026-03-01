import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { OpenCodeClient } from "../opencode-client"

export class ProcessorNode extends BaseNode {
  private client: OpenCodeClient

  constructor(config: NodeConfig, client: OpenCodeClient) {
    super({ ...config, type: "processor" })
    this.client = client
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { toolCalls = [] } = state

    console.log(`[ProcessorNode] Processing response, toolCalls: ${toolCalls.length}`)

    try {
      // 判断是否有工具调用
      if (toolCalls.length > 0) {
        return {
          nextNode: "permission",
          timestamps: {
            ...state.timestamps,
            lastUpdated: Date.now(),
          },
        }
      }

      // 没有工具调用，直接输出
      return {
        nextNode: "output",
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
