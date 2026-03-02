# Flow 测试指南

> 测试 Flow 项目的完整功能和流程

---

## 快速测试

### 1. 配置环境变量

```bash
cd packages/flow

# 使用测试配置（包含阿里云 API Key）
cp .env.test .env
```

或手动设置：

```bash
export ALIYUN_API_KEY=sk-5cf1c92e990248c0982af4ed5d829c9f
export FLOW_LLM_DEFAULT_PROVIDER=aliyun
export FLOW_LLM_DEFAULT_MODEL=qwen-plus
```

### 2. 运行完整流程测试

```bash
cd packages/flow
bun run test-flow.ts
```

### 3. 预期输出

```
============================================================
Flow 完整流程测试
============================================================

测试配置:
  SessionID: test-session-1709312345678
  用户输入：你好，请介绍一下自己
  提供商：aliyun
  模型：qwen-plus

✓ API Key 已配置

开始执行流程...

📝 [1/4] PromptNode - 处理用户输入
   ✓ PromptNode 完成
   消息数：1
   下一个节点：llm

🤖 [2/4] LLMNode - 调用 AI 模型
   ✓ LLMNode 完成
   工具调用数：0
   下一个节点：processor

⚙️  [3/4] ProcessorNode - 处理响应
   ✓ ProcessorNode 完成
   下一个节点：output

✅ [4/4] OutputNode - 输出结果
   ✓ OutputNode 完成
   执行状态：completed

============================================================
✅ 测试完成!
============================================================

总耗时：1234ms

流程总结:
  PromptNode → LLMNode → ProcessorNode → OutputNode

🎉 所有节点执行成功!
```

---

## 单元测试

### 运行所有测试

```bash
cd packages/flow
bun test
```

### 运行特定测试

```bash
# 节点测试
bun test test/nodes.test.ts

# 适配器测试
bun test test/adapter.test.ts

# 持久化测试
bun test test/persistence.test.ts
```

---

## 手动测试流程

### 测试 PromptNode

```typescript
import { PromptNode } from "./src/nodes/prompt"

const node = new PromptNode({ id: "1", name: "Test", type: "prompt" })
const result = await node.execute({
  sessionID: "test-123",
  userInput: "Hello",
  messages: [],
  timestamps: { started: Date.now(), lastUpdated: Date.now() },
})

console.log(result)
// 应该返回：{ messages: [...], nextNode: 'llm' }
```

### 测试 LLMNode（阿里云）

```typescript
import { LLMNode } from "./src/nodes/llm"

process.env.ALIYUN_API_KEY = "sk-xxx"
process.env.FLOW_LLM_DEFAULT_PROVIDER = "aliyun"
process.env.FLOW_LLM_DEFAULT_MODEL = "qwen-plus"

const node = new LLMNode({ id: "1", name: "Test", type: "llm" })
const result = await node.execute({
  sessionID: "test-123",
  userInput: "你好",
  messages: [],
  toolCalls: [],
  timestamps: { started: Date.now(), lastUpdated: Date.now() },
})

console.log(result)
// 应该返回：{ nextNode: 'processor', toolCalls: [] }
```

---

## API 测试

### 启动 Flow 服务

```bash
cd packages/flow
bun run dev
```

### 测试健康检查

```bash
curl http://localhost:4097/health
# 应该返回：{"status":"ok","timestamp":1234567890}
```

### 测试图执行

```bash
curl -X POST http://localhost:4097/graph/start \
  -H "Content-Type: application/json" \
  -d '{
    "sessionID": "test-123",
    "userInput": "你好"
  }'
# 应该返回：{"status":"started","sessionID":"test-123"}
```

### 测试状态查询

```bash
curl http://localhost:4097/graph/test-123/status
# 应该返回：{"running":true,"status":"running"}
```

---

## 性能测试

### 基准测试

```bash
# 测试单次调用延迟
time bun run test-flow.ts

# 预期结果:
# - PromptNode: <1ms
# - LLMNode: 500-2000ms (取决于 API 响应)
# - ProcessorNode: <1ms
# - OutputNode: <1ms
```

### 并发测试

```typescript
// test/concurrency.test.ts
import { describe, test, expect } from "bun:test"
import { PromptNode } from "../src/nodes/prompt"

describe("Concurrency", () => {
  test("should handle 100 concurrent requests", async () => {
    const promises = Array.from({ length: 100 }, () => {
      const node = new PromptNode({ id: "1", name: "Test", type: "prompt" })
      return node.execute({
        sessionID: "test",
        userInput: "test",
        timestamps: { started: Date.now(), lastUpdated: Date.now() },
      })
    })

    const results = await Promise.all(promises)
    expect(results.length).toBe(100)
    expect(results.every((r) => r.nextNode === "llm")).toBe(true)
  })
})
```

---

## 故障排查

### 问题：API Key 未找到

**错误信息**:

```
❌ 错误：未找到 API Key
```

**解决方案**:

```bash
export ALIYUN_API_KEY=sk-5cf1c92e990248c0982af4ed5d829c9f
```

### 问题：模块导入失败

**错误信息**:

```
Error: Cannot find module '../opencode/session'
```

**解决方案**:

```bash
# 确认代码已复制
ls packages/flow/src/opencode/session/

# 如果不存在，重新复制
cp -r packages/opencode/src/session packages/flow/src/opencode/
```

### 问题：测试失败

**错误信息**:

```
Test failed: xxx
```

**解决方案**:

```bash
# 查看详细错误
bun test --verbose

# 清除缓存
rm -rf node_modules/.bun
bun install
```

---

## 测试检查清单

### 基础测试

- [ ] 环境变量配置正确
- [ ] 所有节点可以实例化
- [ ] 所有节点有 execute 方法
- [ ] 适配器配置正常

### 功能测试

- [ ] PromptNode 可以创建消息
- [ ] LLMNode 可以调用阿里云 API
- [ ] ToolNode 可以获取工具
- [ ] PermissionNode 可以检查权限
- [ ] ProcessorNode 可以路由
- [ ] OutputNode 可以标记完成

### 集成测试

- [ ] 完整流程可以执行
- [ ] 节点间状态传递正确
- [ ] 事件发布正常
- [ ] 状态持久化正常

### 性能测试

- [ ] 单次调用 <100ms（不含 LLM）
- [ ] 并发 100 请求正常
- [ ] 内存占用合理

---

## 测试报告模板

```markdown
# Flow 测试报告

**日期**: YYYY-MM-DD
**版本**: x.x.x
**测试人员**: xxx

## 测试结果

| 测试项        | 状态 | 耗时   | 备注             |
| ------------- | ---- | ------ | ---------------- |
| PromptNode    | ✅   | 1ms    | -                |
| LLMNode       | ✅   | 1234ms | 阿里云 qwen-plus |
| ProcessorNode | ✅   | 1ms    | -                |
| OutputNode    | ✅   | 1ms    | -                |

## 总体评估

✅ 所有测试通过
⚠️ 部分测试需要注意
❌ 有关键问题

## 问题记录

1. xxx
2. xxx

## 建议

1. xxx
2. xxx
```

---

## 联系支持

如有问题，请查看：

- 文档：`docs-zh/`
- 架构方案：`docs-zh/LangGraph 可视化架构方案.md`
- 实施报告：`docs-zh/FLOW 实施报告.md`
