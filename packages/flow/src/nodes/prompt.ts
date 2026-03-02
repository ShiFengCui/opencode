import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { Session } from "../opencode/session"
import { MessageV2 } from "../opencode/session/message-v2"
import { Bus } from "../opencode/bus"
import { Identifier } from "../opencode/id/id"

export class PromptNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "prompt" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, userInput } = state

    console.log(`[Flow:PromptNode] Processing input for session ${sessionID}`)

    try {
      // 1. 获取会话（直接调用复制的代码）
      const session = await Session.get(sessionID)

      // 2. 创建用户消息（直接调用复制的代码）
      const messageID = Identifier.ascending("message")
      const message: MessageV2.User = {
        id: messageID,
        sessionID,
        role: "user",
        time: { created: Date.now() },
      }

      await Session.updateMessage(message)

      // 3. 保存消息部分
      if (userInput) {
        const partID = Identifier.ascending("part")
        const part: MessageV2.TextPart = {
          id: partID,
          sessionID,
          messageID,
          type: "text",
          text: userInput,
          time: { start: Date.now() },
        }
        await Session.updatePart(part)
      }

      // 4. 更新会话时间戳
      await Session.touch(sessionID)

      // 5. 发布事件（直接调用复制的代码）
      Bus.publish(MessageV2.Event.Created, { info: message })

      console.log(`[Flow:PromptNode] Created message: ${messageID}`)

      return {
        messages: [...(state.messages || []), message],
        nextNode: "llm",
        loopCount: state.loopCount + 1,
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      console.error("[Flow:PromptNode] Error:", error)
      return this.onError(state, error as Error)
    }
  }
}
