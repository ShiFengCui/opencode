import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { OpenCodeClient } from "../opencode-client"
import { ascendingID } from "../copied/utils"

export class PromptNode extends BaseNode {
  private client: OpenCodeClient

  constructor(config: NodeConfig, client: OpenCodeClient) {
    super({ ...config, type: "prompt" })
    this.client = client
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, userInput } = state

    console.log(`[PromptNode] Processing input for session ${sessionID}`)

    try {
      // 1. 获取会话
      const session = await this.client.getSession(sessionID)

      // 2. 创建用户消息
      const message = await this.client.createMessage({
        sessionID,
        parts: [{ type: "text", text: userInput }],
      })

      console.log(`[PromptNode] Created message: ${message.id}`)

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
      return this.onError(state, error as Error)
    }
  }
}
