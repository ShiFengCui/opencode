import type { GraphState } from "../state"

/**
 * 条件边定义
 */
export const EDGES = {
  // 固定边
  prompt: "llm",
  llm: "processor",
  processor: "permission",
  output: "__END__",

  // 条件边
  permission: (state: GraphState): string | null => {
    if (state.pendingPermissions && state.pendingPermissions.length > 0) {
      return "wait_user"
    }
    if (state.toolCalls && state.toolCalls.length > 0) {
      return "tool"
    }
    return "output"
  },

  wait_user: (state: GraphState): string | null => {
    if (state.userFeedback === "approve") {
      return "tool"
    }
    if (state.userFeedback === "reject") {
      return "output"
    }
    return null // 等待用户输入
  },

  tool: "llm", // 工具执行后返回 LLM

  // 循环控制
  llm: (state: GraphState): string => {
    if (state.loopCount > 100) {
      return "output" // 防止无限循环
    }
    if (state.shouldContinue) {
      return "processor"
    }
    return "output"
  },
}
