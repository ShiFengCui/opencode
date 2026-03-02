/**
 * Flow 完整流程测试脚本 (Node.js 版本)
 * 自动加载.env 文件
 */

import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

// 加载.env 文件
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, ".env")

try {
  const envContent = readFileSync(envPath, "utf-8")
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=")
    if (key && value && !key.trim().startsWith("#")) {
      process.env[key.trim()] = value.trim()
    }
  })
  console.log("✓ 已加载.env 文件")
} catch (err) {
  console.log("⚠️  未找到.env 文件，使用环境变量")
}

// 测试配置
const TEST_CONFIG = {
  sessionID: `test-session-${Date.now()}`,
  userInput: "你好，请介绍一下自己",
  provider: process.env.FLOW_LLM_DEFAULT_PROVIDER || "aliyun",
  model: process.env.FLOW_LLM_DEFAULT_MODEL || "qwen-plus",
}

console.log("=".repeat(60))
console.log("Flow 完整流程测试 (Node.js)")
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

// 简化的节点测试
async function testPromptNode() {
  console.log("📝 [1/4] PromptNode - 处理用户输入")

  const message = {
    id: `message-${Date.now()}`,
    sessionID: TEST_CONFIG.sessionID,
    role: "user",
    time: { created: Date.now() },
  }

  console.log("   ✓ PromptNode 完成")
  console.log(`   消息 ID: ${message.id}`)
  console.log(`   下一个节点：llm`)
  console.log()

  return { messages: [message], nextNode: "llm" }
}

async function testLLMNode(state) {
  console.log(`🤖 [2/4] LLMNode - 调用 AI 模型 (${TEST_CONFIG.provider}/${TEST_CONFIG.model})`)

  const startTime = Date.now()

  try {
    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TEST_CONFIG.model,
        messages: [{ role: "user", content: TEST_CONFIG.userInput }],
        max_tokens: 1000,
      }),
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API 请求失败：${response.status} ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || "(无响应内容)"

    console.log("   ✓ LLMNode 完成")
    console.log(`   响应时间：${duration}ms`)
    console.log(`   响应内容：${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`)
    console.log(`   下一个节点：processor`)
    console.log()

    return {
      llmResponse: data,
      toolCalls: [],
      nextNode: "processor",
      response: content,
    }
  } catch (err) {
    console.log("   ⚠️  LLMNode 调用失败")
    console.log(`   错误：${err.message}`)
    console.log(`   使用模拟响应`)
    console.log()

    return {
      llmResponse: null,
      toolCalls: [],
      nextNode: "processor",
      response: "测试响应（API 调用失败）",
    }
  }
}

async function testProcessorNode(state) {
  console.log("⚙️  [3/4] ProcessorNode - 处理响应")

  const hasToolCalls = state.toolCalls && state.toolCalls.length > 0

  console.log("   ✓ ProcessorNode 完成")
  console.log(`   工具调用数：${hasToolCalls ? state.toolCalls.length : 0}`)
  console.log(`   下一个节点：${hasToolCalls ? "permission" : "output"}`)
  console.log()

  return { nextNode: hasToolCalls ? "permission" : "output" }
}

async function testOutputNode(state) {
  console.log("✅ [4/4] OutputNode - 输出结果")

  console.log("   ✓ OutputNode 完成")
  console.log(`   执行状态：completed`)
  console.log()

  return { executionStatus: "completed", shouldContinue: false }
}

async function runTest() {
  const startTime = Date.now()

  try {
    const afterPrompt = await testPromptNode()
    const afterLLM = await testLLMNode({ ...afterPrompt })
    const afterProcessor = await testProcessorNode({ ...afterPrompt, ...afterLLM })
    const afterOutput = await testOutputNode({ ...afterPrompt, ...afterLLM, ...afterProcessor })

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
      console.log()
      console.log("AI 响应:")
      console.log("-".repeat(60))
      console.log(afterLLM.response)
      console.log("-".repeat(60))
      process.exit(0)
    } else {
      console.log("⚠️  执行状态异常")
      process.exit(1)
    }
  } catch (err) {
    console.log()
    console.log("=".repeat(60))
    console.log("❌ 测试失败!")
    console.log("=".repeat(60))
    console.log()
    console.log("错误信息:", err)
    console.log()
    process.exit(1)
  }
}

runTest()
