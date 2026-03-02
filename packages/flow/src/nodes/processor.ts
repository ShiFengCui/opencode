import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { Session } from "../opencode/session"
import { MessageV2 } from "../opencode/session/message-v2"
import { Bus } from "../opencode/bus"

export class ProcessorNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "processor" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { llmResponse, sessionID, toolCalls = [] } = state

    console.log(`[Flow:ProcessorNode] Processing response, toolCalls: ${toolCalls.length}`)

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
      console.error("[Flow:ProcessorNode] Error:", error)
      return this.onError(state, error as Error)
    }
  }
}
