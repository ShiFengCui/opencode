import { describe, it, expect, beforeEach } from "vitest"
import { createServer } from "../../src/server"

describe("Flow Routes", () => {
  let server: any

  beforeEach(() => {
    server = createServer()
  })

  describe("GET /flow/health", () => {
    it("应该返回 Flow 健康状态", async () => {
      const response = await server.fetch("http://localhost/flow/health")
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe("ok")
      expect(data.adapter).toBe("flow")
    })
  })

  describe("GET /flow/node/types", () => {
    it("应该获取节点类型列表", async () => {
      const response = await server.fetch("http://localhost/flow/node/types")
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.types).toBeDefined()
      expect(Array.isArray(data.types)).toBe(true)
    })
  })

  describe("POST /flow/node/register", () => {
    it("应该注册自定义节点", async () => {
      const response = await server.fetch("http://localhost/flow/node/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "my-custom-node",
          code: 'console.log("custom")',
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe("registered")
      expect(data.type).toBe("my-custom-node")
    })
  })

  describe("GET /flow/plugin/list", () => {
    it("应该获取插件列表", async () => {
      const response = await server.fetch("http://localhost/flow/plugin/list")
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.plugins).toBeDefined()
      expect(Array.isArray(data.plugins)).toBe(true)
    })
  })
})
