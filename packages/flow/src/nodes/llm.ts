import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { OpenCodeClient } from "../opencode-client"
import { streamText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"

export class LLMNode extends BaseNode {
  private client: OpenCodeClient

  constructor(config: NodeConfig, client: OpenCodeClient) {
    super({ ...config, type: "llm" })
    this.client = client
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, messages, userInput } = state

    console.log(`[LLMNode] Calling LLM for session ${sessionID}`)

    try {
      // 获取 AI 提供商配置
      const provider = process.env.AI_PROVIDER || "anthropic"
      const model = process.env.AI_MODEL || "claude-sonnet-4-20250514"
      const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`]

      if (!apiKey) {
        console.warn("[LLMNode] API key not found, using mock response")
        return {
          nextNode: "processor",
          toolCalls: [],
          timestamps: {
            ...state.timestamps,
            lastUpdated: Date.now(),
          },
        }
      }

      // 创建模型实例
      let modelInstance: any
      if (provider === "anthropic") {
        const anthropic = createAnthropic({ apiKey })
        modelInstance = anthropic(model)
      } else if (provider === "openai") {
        const openai = createOpenAI({ apiKey })
        modelInstance = openai(model)
      } else {
        throw new Error(`Unsupported provider: ${provider}`)
      }

      // 构建系统提示词
      const systemPrompt = this.buildSystemPrompt(state)

      // 调用 LLM
      const result = await streamText({
        model: modelInstance,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userInput || "Hello",
          },
        ],
        tools: this.getTools(),
        maxSteps: 10,
      })

      // 处理工具调用
      const toolCalls: any[] = []
      for await (const chunk of result.fullStream) {
        if (chunk.type === "tool-call") {
          toolCalls.push({
            id: chunk.toolCallId,
            toolName: chunk.toolName,
            input: chunk.input,
          })
        }
      }

      console.log(`[LLMNode] LLM response received, toolCalls: ${toolCalls.length}`)

      return {
        nextNode: "processor",
        toolCalls,
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      console.error("[LLMNode] Error:", error)
      return this.onError(state, error as Error)
    }
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(state: GraphState): string {
    return `You are OpenCode, an interactive CLI tool that helps users with software engineering tasks.

# Professional objectivity
Prioritize technical accuracy and truthfulness. Admit when you're uncertain.

# Tool usage policy
- Use specialized tools instead of bash commands when possible
- Use read/edit tools for file operations
- Use glob/grep for searching

# Current environment
Working directory: ${process.cwd()}
Platform: ${process.platform}
Today's date: ${new Date().toISOString()}

Be concise and professional. Focus on helping the user complete their task efficiently.`
  }

  /**
   * 获取工具定义
   */
  private getTools(): Record<string, any> {
    // TODO: 从 OpenCode 获取工具定义
    return {}
  }
}
