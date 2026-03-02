import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { PermissionNext } from "../opencode/permission/next"

export class PermissionNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "permission" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { toolCalls = [], sessionID } = state
    const pendingPermissions: any[] = []

    console.log(`[Flow:PermissionNode] Checking permissions for ${toolCalls.length} tool calls`)

    try {
      // 检查每个工具调用的权限（直接调用复制的代码）
      for (const toolCall of toolCalls) {
        try {
          await PermissionNext.ask({
            permission: toolCall.toolName,
            sessionID,
            metadata: toolCall.input,
          })
        } catch (error: any) {
          if (error.name === "PermissionDeniedError") {
            pendingPermissions.push({
              toolCallID: toolCall.id,
              permission: toolCall.toolName,
              error: error.message,
            })
          } else {
            throw error
          }
        }
      }

      return {
        pendingPermissions,
        nextNode: pendingPermissions.length > 0 ? "wait_user" : "tool",
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      console.error("[Flow:PermissionNode] Error:", error)
      return this.onError(state, error as Error)
    }
  }
}
