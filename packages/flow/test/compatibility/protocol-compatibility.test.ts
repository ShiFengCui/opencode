import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { createServer } from "../src/server"
import { protocolRouter } from "../src/protocol/router"
import { OpenCodeAdapter } from "../src/protocol/opencode-adapter"
import { FlowAdapter } from "../src/protocol/flow-adapter"

/**
 * 协议兼容性测试
 * 验证 Flow 服务器与 OpenCode 协议完全兼容
 */
describe("Protocol Compatibility", () => {
  let server: any

  beforeEach(() => {
    // 注册适配器
    protocolRouter.register("opencode", new OpenCodeAdapter())
    protocolRouter.register("flow", new FlowAdapter())

    // 创建服务器
    server = createServer()
  })

  describe("Session API 兼容性", () => {
    it("应该兼容 OpenCode session.list 接口", async () => {
      const response = await server.fetch("http://localhost/session")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("application/json")

      const sessions = await response.json()
      expect(Array.isArray(sessions)).toBe(true)
    })

    it("应该兼容 OpenCode session.create 接口", async () => {
      const response = await server.fetch("http://localhost/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Session",
          directory: process.cwd(),
        }),
      })

      expect(response.status).toBe(200)

      const session = await response.json()
      expect(session.id).toBeDefined()
      expect(session.title).toBe("Test Session")
      expect(session.directory).toBe(process.cwd())
    })

    it("应该兼容 OpenCode session.get 接口", async () => {
      // 先创建会话
      const createResponse = await server.fetch("http://localhost/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test" }),
      })
      const session = await createResponse.json()

      // 获取会话
      const response = await server.fetch(`http://localhost/session/${session.id}`)

      expect(response.status).toBe(200)

      const retrieved = await response.json()
      expect(retrieved.id).toBe(session.id)
    })

    it("应该兼容 OpenCode session.fork 接口", async () => {
      // 先创建会话
      const createResponse = await server.fetch("http://localhost/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Original" }),
      })
      const session = await createResponse.json()

      // 分叉会话
      const response = await server.fetch(`http://localhost/session/${session.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(200)

      const forked = await response.json()
      expect(forked.id).not.toBe(session.id)
      expect(forked.title).toContain("fork")
    })
  })

  describe("Event API 兼容性", () => {
    it("应该兼容 OpenCode event SSE 接口", async () => {
      const response = await server.fetch("http://localhost/event")

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("text/event-stream")
    })

    it("应该发送 server.connected 事件", async () => {
      const response = await server.fetch("http://localhost/event")

      // 读取第一个事件
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      const { value } = await reader.read()
      const text = decoder.decode(value)

      expect(text).toContain("event: server.connected")

      reader.cancel()
    })
  })

  describe("Permission API 兼容性", () => {
    it("应该兼容 OpenCode permission.list 接口", async () => {
      const response = await server.fetch("http://localhost/permission")

      expect(response.status).toBe(200)

      const permissions = await response.json()
      expect(Array.isArray(permissions)).toBe(true)
    })
  })

  describe("File API 兼容性", () => {
    it("应该兼容 OpenCode file.read 接口", async () => {
      // 创建测试文件
      const testPath = "/tmp/test-compatibility.txt"
      await Bun.write(testPath, "test content")

      const response = await server.fetch(`http://localhost/file?path=${encodeURIComponent(testPath)}`)

      expect(response.status).toBe(200)

      const content = await response.text()
      expect(content).toBe("test content")
    })

    it("应该兼容 OpenCode file.write 接口", async () => {
      const testPath = "/tmp/test-write-compatibility.txt"

      const response = await server.fetch("http://localhost/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: testPath,
          content: "new content",
        }),
      })

      expect(response.status).toBe(200)

      // 验证写入
      const content = await Bun.file(testPath).text()
      expect(content).toBe("new content")
    })
  })

  describe("Error Format 兼容性", () => {
    it("应该使用 NamedError 格式", async () => {
      const response = await server.fetch("http://localhost/nonexistent")

      expect(response.status).toBe(404)

      const error = await response.json()
      expect(error.name).toBeDefined()
      expect(error.data).toBeDefined()
    })

    it("应该使用统一的错误状态码", async () => {
      // 400 - Bad Request
      const badRequest = await server.fetch("http://localhost/file")
      expect(badRequest.status).toBe(400)

      // 404 - Not Found
      const notFound = await server.fetch("http://localhost/nonexistent")
      expect(notFound.status).toBe(404)
    })
  })

  describe("CORS 兼容性", () => {
    it("应该允许 localhost 跨域", async () => {
      const response = await server.fetch("http://localhost/health", {
        headers: { Origin: "http://localhost:3000" },
      })

      expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000")
    })

    it("应该允许凭证", async () => {
      const response = await server.fetch("http://localhost/health")

      expect(response.headers.get("access-control-allow-credentials")).toBe("true")
    })
  })

  describe("Engine Selection 兼容性", () => {
    it("应该自动选择 OpenCode 引擎对于普通会话", async () => {
      // 创建普通会话
      const response = await server.fetch("http://localhost/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Normal Session" }),
      })

      const session = await response.json()
      expect(session.id).not.toStartWith("flow-")
    })

    it("应该自动选择 Flow 引擎对于 flow 会话", async () => {
      // Flow 会话以 flow- 开头
      const adapter = protocolRouter.select("flow-123")
      expect(adapter.getType()).toBe("flow")
    })
  })
})
