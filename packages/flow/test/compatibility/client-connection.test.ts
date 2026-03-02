import { describe, it, expect, beforeEach } from "vitest"
import { createServer } from "../src/server"

/**
 * 客户端连接测试
 * 模拟 opencode CLI 客户端连接 Flow 服务器
 */
describe("Client Connection", () => {
  let server: any

  beforeEach(() => {
    server = createServer()
  })

  describe("Health Check", () => {
    it("应该响应健康检查", async () => {
      const response = await server.fetch("http://localhost/health")

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe("ok")
      expect(data.adapters).toContain("opencode")
      expect(data.adapters).toContain("flow")
    })
  })

  describe("Session Workflow", () => {
    it("应该完成完整的会话流程", async () => {
      // 1. 创建会话
      const createResponse = await server.fetch("http://localhost/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Workflow Test",
          directory: process.cwd(),
        }),
      })

      expect(createResponse.status).toBe(200)
      const session = await createResponse.json()
      expect(session.id).toBeDefined()

      // 2. 获取会话列表
      const listResponse = await server.fetch("http://localhost/session")
      expect(listResponse.status).toBe(200)

      const sessions = await listResponse.json()
      expect(sessions.some((s: any) => s.id === session.id)).toBe(true)

      // 3. 获取会话详情
      const getResponse = await server.fetch(`http://localhost/session/${session.id}`)
      expect(getResponse.status).toBe(200)

      const retrieved = await getResponse.json()
      expect(retrieved.id).toBe(session.id)

      // 4. 删除会话
      const deleteResponse = await server.fetch(`http://localhost/session/${session.id}`, {
        method: "DELETE",
      })

      expect(deleteResponse.status).toBe(200)
    })
  })

  describe("Message Workflow", () => {
    it("应该完成消息创建流程", async () => {
      // 1. 创建会话
      const createResponse = await server.fetch("http://localhost/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Message Test" }),
      })
      const session = await createResponse.json()

      // 2. 获取消息列表（应该是空的）
      const listResponse = await server.fetch(`http://localhost/session/${session.id}/message`)
      expect(listResponse.status).toBe(200)

      const messages = await listResponse.json()
      expect(Array.isArray(messages)).toBe(true)
    })
  })

  describe("Event Stream", () => {
    it("应该建立事件流连接", async () => {
      const response = await server.fetch("http://localhost/event")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("text/event-stream")

      // 读取初始事件
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      // 应该收到 connected 事件
      const { value } = await reader.read()
      const text = decoder.decode(value)

      expect(text).toContain("server.connected")

      reader.cancel()
    })
  })

  describe("Authentication", () => {
    it("应该在没有密码时允许访问", async () => {
      const response = await server.fetch("http://localhost/health")
      expect(response.status).toBe(200)
    })
  })

  describe("Performance", () => {
    it("健康检查应该快速响应", async () => {
      const start = Date.now()
      const response = await server.fetch("http://localhost/health")
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(100) // < 100ms
    })

    it("会话列表应该快速响应", async () => {
      const start = Date.now()
      const response = await server.fetch("http://localhost/session")
      const duration = Date.now() - start

      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(500) // < 500ms
    })
  })
})
