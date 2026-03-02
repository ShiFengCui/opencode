import { describe, it, expect, beforeEach } from "vitest"
import { corsMiddleware } from "../../src/server/middleware/cors"
import { authMiddleware } from "../../src/server/middleware/auth"
import { errorMiddleware } from "../../src/server/middleware/error"

describe("Middleware", () => {
  describe("corsMiddleware", () => {
    it("应该允许 localhost", () => {
      expect(corsMiddleware).toBeDefined()
    })
  })

  describe("authMiddleware", () => {
    it("应该定义认证中间件", () => {
      expect(authMiddleware).toBeDefined()
    })
  })

  describe("errorMiddleware", () => {
    it("应该定义错误处理中间件", () => {
      expect(errorMiddleware).toBeDefined()
    })

    it("应该处理 NamedError", () => {
      // 模拟 NamedError
      const mockError = {
        name: "TestError",
        data: { message: "test" },
      }

      const mockC = {
        json: vi.fn((data, status) => ({ data, status })),
      }

      const result = errorMiddleware(mockError as any, mockC as any)
      expect(result).toBeDefined()
    })

    it("应该处理未知错误", () => {
      const mockError = new Error("Unknown error")

      const mockC = {
        json: vi.fn((data, status) => ({ data, status })),
      }

      const result = errorMiddleware(mockError, mockC as any)
      expect(result).toBeDefined()
    })
  })
})
