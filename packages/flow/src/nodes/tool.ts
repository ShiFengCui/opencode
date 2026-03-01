import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { OpenCodeClient } from "../opencode-client"

export class ToolNode extends BaseNode {
  private client: OpenCodeClient

  constructor(config: NodeConfig, client: OpenCodeClient) {
    super({ ...config, type: "tool" })
    this.client = client
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { toolCalls = [], sessionID } = state
    const results: any[] = []

    console.log(`[ToolNode] Executing ${toolCalls.length} tools`)

    try {
      for (const toolCall of toolCalls) {
        // 通过 API 执行工具
        const result = await this.client.executeTool(toolCall.toolName, toolCall.input, sessionID)
        results.push(result)
        console.log(`[ToolNode] Tool ${toolCall.toolName} executed successfully`)
      }

      return {
        toolResults: results,
        nextNode: "llm", // 工具执行后返回 LLM 继续处理
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
