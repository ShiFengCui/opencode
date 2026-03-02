import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { ToolRegistry } from "../opencode/tool/registry"
import { PermissionNext } from "../opencode/permission/next"
import { Bus } from "../opencode/bus"

export class ToolNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "tool" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { toolCalls = [], sessionID } = state
    const results: any[] = []

    console.log(`[Flow:ToolNode] Executing ${toolCalls.length} tools`)

    try {
      for (const toolCall of toolCalls) {
        // 1. 权限检查（直接调用复制的代码）
        await PermissionNext.ask({
          permission: toolCall.toolName,
          sessionID,
          metadata: toolCall.input,
        })

        // 2. 获取工具（直接调用复制的代码）
        const tool = await ToolRegistry.get(toolCall.toolName)

        if (!tool) {
          console.error(`[Flow:ToolNode] Tool not found: ${toolCall.toolName}`)
          continue
        }

        // 3. 执行工具（直接调用复制的代码）
        const result = await tool.execute(toolCall.input, { sessionID })
        results.push(result)

        console.log(`[Flow:ToolNode] Tool ${toolCall.toolName} executed successfully`)

        // 4. 发布事件（直接调用复制的代码）
        Bus.publish("tool.executed" as any, {
          toolCallID: toolCall.id,
          result,
        })
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
      console.error("[Flow:ToolNode] Error:", error)
      return this.onError(state, error as Error)
    }
  }
}
