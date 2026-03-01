import { Annotation } from "@langchain/langgraph"

export const GraphStateSchema = Annotation.Root({
  // 会话上下文
  sessionID: Annotation<string>(),
  messages: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),
  parts: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),

  // 流程控制
  nextNode: Annotation<string | undefined>(),
  loopCount: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
  shouldContinue: Annotation<boolean>({ default: () => true }),

  // LLM 相关
  llmResponse: Annotation<any>(),
  toolCalls: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),
  toolResults: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),

  // 用户交互
  pendingPermissions: Annotation<any[]>({ reducer: (a, b) => [...a, ...b] }),
  userInput: Annotation<string>(),
  userFeedback: Annotation<string | undefined>(),

  // 执行状态
  currentNode: Annotation<string | undefined>(),
  executionStatus: Annotation<"idle" | "running" | "completed" | "error">({ default: () => "idle" }),

  // 元数据
  timestamps: Annotation<{ started: number; lastUpdated: number; completed?: number }>({
    default: () => ({ started: 0, lastUpdated: 0 }),
  }),
})

export type GraphState = typeof GraphStateSchema.State
