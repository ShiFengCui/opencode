import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { OpenCodeClient } from "../opencode-client"

export class LLMNode extends BaseNode {
  private client: OpenCodeClient

  constructor(config: NodeConfig, client: OpenCodeClient) {
    super({ ...config, type: "llm" })
    this.client = client
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, messages } = state

    console.log(`[LLMNode] Calling LLM for session ${sessionID}`)

    try {
      // TODO: 集成 LangChain AI SDK
      // 目前通过 OpenCode 的 API 间接调用
      // 未来可以直接调用 AI SDK

      // 模拟 LLM 响应（实际由 OpenCode 处理）
      // 这里只是传递状态到下一个节点

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
