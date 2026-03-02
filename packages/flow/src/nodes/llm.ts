import { BaseNode, type NodeConfig } from "./base"
import type { GraphState } from "../state"
import { streamText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { ToolRegistry } from "../opencode/tool/registry"
import { SystemPrompt } from "../opencode/session/system-prompt"

export class LLMNode extends BaseNode {
  constructor(config: NodeConfig) {
    super({ ...config, type: "llm" })
  }

  async execute(state: GraphState): Promise<Partial<GraphState>> {
    const { sessionID, messages, userInput } = state

    console.log(`[Flow:LLMNode] Calling LLM for session ${sessionID}`)

    try {
      // 1. 获取 AI 提供商配置
      const provider = process.env.FLOW_LLM_DEFAULT_PROVIDER || "aliyun"
      const model = process.env.FLOW_LLM_DEFAULT_MODEL || "qwen-plus"
      const apiKey =
        process.env[`FLOW_${provider.toUpperCase()}_API_KEY`] || process.env[`${provider.toUpperCase()}_API_KEY`]

      if (!apiKey) {
        console.warn("[Flow:LLMNode] API key not found, using mock response")
        return {
          nextNode: "processor",
          toolCalls: [],
          timestamps: {
            ...state.timestamps,
            lastUpdated: Date.now(),
          },
        }
      }

      // 2. 创建模型实例
      let modelInstance: any
      if (provider === "anthropic") {
        const anthropic = createAnthropic({ apiKey })
        modelInstance = anthropic(model)
      } else if (provider === "openai") {
        const openai = createOpenAI({ apiKey })
        modelInstance = openai(model)
      } else if (provider === "aliyun" || provider === "qwen") {
        // 阿里云 Qwen 模型（兼容 OpenAI 格式）
        const openai = createOpenAI({
          apiKey,
          baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        })
        modelInstance = openai(model || "qwen-plus")
      } else {
        throw new Error(`Unsupported provider: ${provider}`)
      }

      // 3. 构建系统提示词（直接调用复制的代码）
      const systemPrompt = await SystemPrompt.build({
        sessionID,
        agent: state.agent || "build",
      })

      // 4. 获取工具定义（直接调用复制的代码）
      const tools = await ToolRegistry.build({
        sessionID,
        agent: state.agent || "build",
      })

      // 5. 调用 LLM
      const result = await streamText({
        model: modelInstance,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userInput || "Hello",
          },
        ],
        tools: Object.keys(tools).length > 0 ? tools : undefined,
        maxSteps: 10,
      })

      // 6. 处理工具调用
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

      console.log(`[Flow:LLMNode] LLM response received, toolCalls: ${toolCalls.length}`)

      return {
        nextNode: "processor",
        toolCalls,
        timestamps: {
          ...state.timestamps,
          lastUpdated: Date.now(),
        },
      }
    } catch (error) {
      console.error("[Flow:LLMNode] Error:", error)
      return this.onError(state, error as Error)
    }
  }
}
