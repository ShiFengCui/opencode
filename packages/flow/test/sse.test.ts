import { describe, test, expect } from "bun:test"
import { broadcastToSession } from "../src/server/routes/sse"

describe("SSE", () => {
  test("should broadcast to connections", async () => {
    // 测试 SSE 广播功能
    const count = await broadcastToSession("test-session", "test.event", { data: "test" })

    // 没有连接时返回 0
    expect(count).toBe(0)
  })
})
