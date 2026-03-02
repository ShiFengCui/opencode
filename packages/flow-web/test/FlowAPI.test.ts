import { describe, it, expect, beforeEach, vi } from "vitest"
import { FlowAPI } from "../src/api/flow"

describe("FlowAPI", () => {
  let api: FlowAPI
  const mockBaseUrl = "http://localhost:4097"

  beforeEach(() => {
    api = new FlowAPI(mockBaseUrl)
    vi.clearAllMocks()
  })

  describe("health", () => {
    it("应该返回健康状态", async () => {
      const mockResponse = { status: "ok", timestamp: Date.now() }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await api.health()

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/health`)
    })
  })

  describe("startGraph", () => {
    it("应该启动图执行", async () => {
      const mockResponse = { status: "started", sessionID: "test-123" }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await api.startGraph("test-123", "test input")

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/graph/start`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      )
    })

    it("应该在失败时抛出错误", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Test error" }),
      } as any)

      await expect(api.startGraph("test-123", "test input")).rejects.toThrow("Test error")
    })
  })

  describe("getGraphStatus", () => {
    it("应该获取图状态", async () => {
      const mockResponse = { running: true, status: "running" }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await api.getGraphStatus("test-123")

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/graph/test-123/status`)
    })
  })

  describe("sendFeedback", () => {
    it("应该发送反馈", async () => {
      const mockResponse = { status: "updated" }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await api.sendFeedback("test-123", "approve", "perm-123")

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/graph/test-123/feedback`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ feedback: "approve", permissionID: "perm-123" }),
        }),
      )
    })
  })

  describe("stopGraph", () => {
    it("应该停止图执行", async () => {
      const mockResponse = { status: "stopped" }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await api.stopGraph("test-123")

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/graph/test-123/stop`,
        expect.objectContaining({ method: "POST" }),
      )
    })
  })

  describe("deleteGraph", () => {
    it("应该删除图数据", async () => {
      const mockResponse = { status: "deleted" }
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any)

      const result = await api.deleteGraph("test-123")

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/graph/test-123`,
        expect.objectContaining({ method: "DELETE" }),
      )
    })
  })
})
