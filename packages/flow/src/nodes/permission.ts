import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { OpenCodeClient } from "../opencode-client"

export class PermissionNode extends BaseNode {
  private client: OpenCodeClient

  constructor(config: NodeConfig, client: OpenCodeClient) {
    super({ ...config, type: "permission" })
    this.client = client
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { toolCalls = [], sessionID } = state
    const pendingPermissions: any[] = []

    console.log(`[PermissionNode] Checking permissions for ${toolCalls.length} tool calls`)

    try {
      // 检查每个工具调用的权限
      for (const toolCall of toolCalls) {
        // TODO: 实际权限检查逻辑
        // 目前假设所有权限都已批准
        // 未来需要集成 OpenCode 的权限系统
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
      return this.onError(state, error as Error)
    }
  }
}
