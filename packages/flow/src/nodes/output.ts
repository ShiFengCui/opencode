import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { Session } from "../opencode/session"
import { MessageV2 } from "../opencode/session/message-v2"
import { Bus } from "../opencode/bus"

export class OutputNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "output" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, messages } = state

    console.log(`[Flow:OutputNode] Completing session ${sessionID}`)

    try {
      // 1. 保存最终消息（直接调用复制的代码）
      if (state.assistantMessage) {
        await Session.updateMessage(state.assistantMessage)
      }

      // 2. 发布完成事件（直接调用复制的代码）
      Bus.publish(MessageV2.Event.Completed as any, {
        sessionID,
        messageID: state.assistantMessage?.id,
      })

      console.log(`[Flow:OutputNode] Session ${sessionID} completed`)

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
      console.error("[Flow:OutputNode] Error:", error)
      return this.onError(state, error as Error)
    }
  }
}
