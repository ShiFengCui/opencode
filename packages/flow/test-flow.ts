#!/usr/bin/env bun
/**
 * Flow 完整流程测试脚本
 *
 * 测试从 Prompt → LLM → Processor → Output 的完整流程
 */

import { GraphBuilder } from "./src/builder"
import { PromptNode } from "./src/nodes/prompt"
import { LLMNode } from "./src/nodes/llm"
import { ProcessorNode } from "./src/nodes/processor"
import { OutputNode } from "./src/nodes/output"
import type { GraphState } from "./src/state"

// 测试配置
const TEST_CONFIG = {
  sessionID: `test-session-${Date.now()}`,
  userInput: "你好，请介绍一下自己",
  provider: "aliyun",
  model: "qwen-plus",
}

console.log("=".repeat(60))
console.log("Flow 完整流程测试")
console.log("=".repeat(60))
console.log()
console.log("测试配置:")
console.log(`  SessionID: ${TEST_CONFIG.sessionID}`)
console.log(`  用户输入：${TEST_CONFIG.userInput}`)
console.log(`  提供商：${TEST_CONFIG.provider}`)
console.log(`  模型：${TEST_CONFIG.model}`)
console.log()

// 检查 API Key
const apiKey = process.env.ALIYUN_API_KEY || process.env.QWEN_API_KEY
if (!apiKey) {
  console.error("❌ 错误：未找到 API Key")
  console.error()
  console.error("请设置环境变量:")
  console.error("  export ALIYUN_API_KEY=sk-xxx")
  console.error("  或")
  console.error("  export QWEN_API_KEY=sk-xxx")
  process.exit(1)
}

console.log("✓ API Key 已配置")
console.log()

// 创建测试状态
const initialState: Partial<GraphState> = {
  sessionID: TEST_CONFIG.sessionID,
  userInput: TEST_CONFIG.userInput,
  messages: [],
  toolCalls: [],
  loopCount: 0,
  shouldContinue: true,
  executionStatus: "running",
  timestamps: {
    started: Date.now(),
    lastUpdated: Date.now(),
  },
}

console.log("开始执行流程...")
console.log()

async function runTest() {
  const startTime = Date.now()

  try {
    // 步骤 1: PromptNode
    console.log("📝 [1/4] PromptNode - 处理用户输入")
    const promptNode = new PromptNode({ id: "prompt-1", name: "Prompt", type: "prompt" })
    const afterPrompt = await promptNode.execute(initialState as GraphState)
    console.log("   ✓ PromptNode 完成")
    console.log(`   消息数：${afterPrompt.messages?.length || 0}`)
    console.log(`   下一个节点：${afterPrompt.nextNode}`)
    console.log()

    // 步骤 2: LLMNode
    console.log("🤖 [2/4] LLMNode - 调用 AI 模型")
    const llmNode = new LLMNode({ id: "llm-1", name: "LLM", type: "llm" })
    const stateAfterPrompt = { ...initialState, ...afterPrompt } as GraphState
    const afterLLM = await llmNode.execute(stateAfterPrompt)
    console.log("   ✓ LLMNode 完成")
    console.log(`   工具调用数：${afterLLM.toolCalls?.length || 0}`)
    console.log(`   下一个节点：${afterLLM.nextNode}`)
    console.log()

    // 步骤 3: ProcessorNode
    console.log("⚙️  [3/4] ProcessorNode - 处理响应")
    const processorNode = new ProcessorNode({ id: "proc-1", name: "Processor", type: "processor" })
    const stateAfterLLM = { ...stateAfterPrompt, ...afterLLM } as GraphState
    const afterProcessor = await processorNode.execute(stateAfterLLM)
    console.log("   ✓ ProcessorNode 完成")
    console.log(`   下一个节点：${afterProcessor.nextNode}`)
    console.log()

    // 步骤 4: OutputNode
    console.log("✅ [4/4] OutputNode - 输出结果")
    const outputNode = new OutputNode({ id: "out-1", name: "Output", type: "output" })
    const stateAfterProcessor = { ...stateAfterLLM, ...afterProcessor } as GraphState
    const afterOutput = await outputNode.execute(stateAfterProcessor)
    console.log("   ✓ OutputNode 完成")
    console.log(`   执行状态：${afterOutput.executionStatus}`)
    console.log()

    // 测试完成
    const duration = Date.now() - startTime

    console.log("=".repeat(60))
    console.log("✅ 测试完成!")
    console.log("=".repeat(60))
    console.log()
    console.log(`总耗时：${duration}ms`)
    console.log()
    console.log("流程总结:")
    console.log("  PromptNode → LLMNode → ProcessorNode → OutputNode")
    console.log()

    if (afterOutput.executionStatus === "completed") {
      console.log("🎉 所有节点执行成功!")
      process.exit(0)
    } else {
      console.log("⚠️  执行状态异常")
      process.exit(1)
    }
  } catch (error) {
    console.error()
    console.error("=".repeat(60))
    console.error("❌ 测试失败!")
    console.error("=".repeat(60))
    console.error()
    console.error("错误信息:", error)
    console.error()
    process.exit(1)
  }
}

// 运行测试
runTest()
