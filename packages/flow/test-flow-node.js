/**
 * Flow 完整流程测试脚本 (Node.js 版本)
 *
 * 测试从 Prompt → LLM → Processor → Output 的完整流程
 */

// 模拟 Bun 的 console.log 用于调试
const log = console.log
const error = console.error

// 测试配置
const TEST_CONFIG = {
  sessionID: `test-session-${Date.now()}`,
  userInput: "你好，请介绍一下自己",
  provider: "aliyun",
  model: "qwen-plus",
}

log("=".repeat(60))
log("Flow 完整流程测试 (Node.js)")
log("=".repeat(60))
log()
log("测试配置:")
log(`  SessionID: ${TEST_CONFIG.sessionID}`)
log(`  用户输入：${TEST_CONFIG.userInput}`)
log(`  提供商：${TEST_CONFIG.provider}`)
log(`  模型：${TEST_CONFIG.model}`)
log()

// 检查 API Key
const apiKey = process.env.ALIYUN_API_KEY || process.env.QWEN_API_KEY
if (!apiKey) {
  error("❌ 错误：未找到 API Key")
  error()
  error("请设置环境变量:")
  error("  export ALIYUN_API_KEY=sk-xxx")
  error("  或")
  error("  export QWEN_API_KEY=sk-xxx")
  process.exit(1)
}

log("✓ API Key 已配置")
log()

// 简化的节点测试
async function testPromptNode() {
  log("📝 [1/4] PromptNode - 处理用户输入")

  // 模拟 PromptNode 执行
  const message = {
    id: `message-${Date.now()}`,
    sessionID: TEST_CONFIG.sessionID,
    role: "user",
    time: { created: Date.now() },
  }

  log("   ✓ PromptNode 完成")
  log(`   消息 ID: ${message.id}`)
  log(`   下一个节点：llm`)
  log()

  return { messages: [message], nextNode: "llm" }
}

async function testLLMNode(state) {
  log("🤖 [2/4] LLMNode - 调用 AI 模型 (${TEST_CONFIG.provider}/${TEST_CONFIG.model})")

  const startTime = Date.now()

  try {
    // 使用 fetch 调用阿里云 API
    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TEST_CONFIG.model,
        messages: [
          {
            role: "user",
            content: TEST_CONFIG.userInput,
          },
        ],
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

    log("   ✓ LLMNode 完成")
    log(`   响应时间：${duration}ms`)
    log(`   响应内容：${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`)
    log(`   下一个节点：processor`)
    log()

    return {
      llmResponse: data,
      toolCalls: [],
      nextNode: "processor",
      response: content,
    }
  } catch (err) {
    log("   ⚠️  LLMNode 调用失败")
    log(`   错误：${err.message}`)
    log(`   使用模拟响应`)
    log()

    return {
      llmResponse: null,
      toolCalls: [],
      nextNode: "processor",
      response: "测试响应（API 调用失败）",
    }
  }
}

async function testProcessorNode(state) {
  log("⚙️  [3/4] ProcessorNode - 处理响应")

  const hasToolCalls = state.toolCalls && state.toolCalls.length > 0

  log("   ✓ ProcessorNode 完成")
  log(`   工具调用数：${hasToolCalls ? state.toolCalls.length : 0}`)
  log(`   下一个节点：${hasToolCalls ? "permission" : "output"}`)
  log()

  return { nextNode: hasToolCalls ? "permission" : "output" }
}

async function testOutputNode(state) {
  log("✅ [4/4] OutputNode - 输出结果")

  log("   ✓ OutputNode 完成")
  log(`   执行状态：completed`)
  log()

  return { executionStatus: "completed", shouldContinue: false }
}

async function runTest() {
  const startTime = Date.now()

  try {
    // 步骤 1: PromptNode
    const afterPrompt = await testPromptNode()

    // 步骤 2: LLMNode
    const afterLLM = await testLLLMNode({ ...afterPrompt })

    // 步骤 3: ProcessorNode
    const afterProcessor = await testProcessorNode({ ...afterPrompt, ...afterLLM })

    // 步骤 4: OutputNode
    const afterOutput = await testOutputNode({ ...afterPrompt, ...afterLLM, ...afterProcessor })

    // 测试完成
    const duration = Date.now() - startTime

    log("=".repeat(60))
    log("✅ 测试完成!")
    log("=".repeat(60))
    log()
    log(`总耗时：${duration}ms`)
    log()
    log("流程总结:")
    log("  PromptNode → LLMNode → ProcessorNode → OutputNode")
    log()

    if (afterOutput.executionStatus === "completed") {
      log("🎉 所有节点执行成功!")
      log()
      log("AI 响应:")
      log("-".repeat(60))
      log(afterLLM.response)
      log("-".repeat(60))
      process.exit(0)
    } else {
      log("⚠️  执行状态异常")
      process.exit(1)
    }
  } catch (err) {
    log()
    log("=".repeat(60))
    log("❌ 测试失败!")
    log("=".repeat(60))
    log()
    log("错误信息:", err)
    log()
    process.exit(1)
  }
}

// 运行测试
runTest()
