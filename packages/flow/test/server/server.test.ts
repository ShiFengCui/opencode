import { describe, it, expect, beforeEach } from "vitest"
import { createServer } from "../src/server"

describe("Flow Server", () => {
  let server: any

  beforeEach(() => {
    server = createServer()
  })

  it("应该创建服务器实例", () => {
    expect(server).toBeDefined()
    expect(typeof server.fetch).toBe("function")
  })

  it("应该有健康检查端点", async () => {
    const response = await server.fetch("http://localhost/health")
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe("ok")
    expect(data.adapters).toBeDefined()
  })

  it("应该有 CORS 头", async () => {
    const response = await server.fetch("http://localhost/health", {
      headers: { Origin: "http://localhost:3000" },
    })

    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000")
  })

  it("应该返回 404 对于不存在的路径", async () => {
    const response = await server.fetch("http://localhost/nonexistent")
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.name).toBe("NotFoundError")
  })
})
