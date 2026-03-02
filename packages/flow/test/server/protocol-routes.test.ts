import { describe, it, expect, beforeEach } from "vitest"
import { createServer } from "../../src/server"

describe("Protocol Routes", () => {
  let server: any

  beforeEach(() => {
    server = createServer()
  })

  describe("GET /health", () => {
    it("应该返回健康状态", async () => {
      const response = await server.fetch("http://localhost/health")
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        status: "ok",
        timestamp: expect.any(Number),
        adapters: expect.arrayContaining(["opencode", "flow"]),
      })
    })
  })

  describe("GET /session", () => {
    it("应该获取会话列表", async () => {
      const response = await server.fetch("http://localhost/session")
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it("应该支持查询参数", async () => {
      const response = await server.fetch("http://localhost/session?limit=10")
      expect(response.status).toBe(200)
    })
  })

  describe("POST /session", () => {
    it("应该创建会话", async () => {
      const response = await server.fetch("http://localhost/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Session",
          directory: "/tmp",
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.id).toBeDefined()
      expect(data.title).toBe("Test Session")
    })
  })

  describe("GET /event", () => {
    it("应该建立 SSE 连接", async () => {
      const response = await server.fetch("http://localhost/event")
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("text/event-stream")
    })
  })

  describe("GET /permission", () => {
    it("应该获取权限列表", async () => {
      const response = await server.fetch("http://localhost/permission")
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe("GET /file", () => {
    it("应该读取文件", async () => {
      // 创建一个临时文件
      const testPath = "/tmp/test-read.txt"
      await Bun.write(testPath, "test content")

      const response = await server.fetch(`http://localhost/file?path=${encodeURIComponent(testPath)}`)
      expect(response.status).toBe(200)

      const content = await response.text()
      expect(content).toBe("test content")
    })

    it("应该返回错误当路径缺失", async () => {
      const response = await server.fetch("http://localhost/file")
      expect(response.status).toBe(400)
    })
  })
})
