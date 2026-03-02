import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useGraphState } from "../src/hooks/useGraphState"
import { flowAPI } from "../src/api/flow"

// Mock flowAPI
vi.mock("../src/api/flow", () => ({
  flowAPI: {
    getGraphStatus: vi.fn(),
    startGraph: vi.fn(),
    stopGraph: vi.fn(),
    sendFeedback: vi.fn(),
  },
}))

describe("useGraphState", () => {
  const mockSessionID = "test-session-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("应该返回初始状态", () => {
    vi.mocked(flowAPI.getGraphStatus).mockResolvedValue({
      running: false,
      status: "idle",
    })

    const { result } = renderHook(() => useGraphState({ sessionID: mockSessionID, autoRefresh: false }))

    expect(result.current).toBeDefined()
    expect(result.current.graphState).toBeDefined()
  })

  it("应该获取图状态", async () => {
    vi.mocked(flowAPI.getGraphStatus).mockResolvedValue({
      running: true,
      status: "running",
    })

    const { result } = renderHook(() => useGraphState({ sessionID: mockSessionID, autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.graphState).toBeDefined()
    })

    expect(flowAPI.getGraphStatus).toHaveBeenCalledWith(mockSessionID)
  })

  it("应该处理错误", async () => {
    vi.mocked(flowAPI.getGraphStatus).mockRejectedValueOnce(new Error("Test error"))

    const { result } = renderHook(() => useGraphState({ sessionID: mockSessionID, autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.error).toBe("Test error")
    })
  })

  it("应该提供 refresh 函数", () => {
    vi.mocked(flowAPI.getGraphStatus).mockResolvedValue({
      running: false,
      status: "idle",
    })

    const { result } = renderHook(() => useGraphState({ sessionID: mockSessionID, autoRefresh: false }))

    expect(result.current.refresh).toBeDefined()
    expect(typeof result.current.refresh).toBe("function")
  })
})

describe("useGraphExecution", () => {
  const mockSessionID = "test-session-123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("应该提供 start 函数", () => {
    vi.mocked(flowAPI.startGraph).mockResolvedValue({ status: "started", sessionID: mockSessionID })

    const { result } = renderHook(() => useGraphState({ sessionID: mockSessionID, autoRefresh: false }))

    expect(result.current.refresh).toBeDefined()
  })

  it("应该启动执行", async () => {
    vi.mocked(flowAPI.startGraph).mockResolvedValue({ status: "started", sessionID: mockSessionID })

    const { result } = renderHook(() => useGraphState({ sessionID: mockSessionID, autoRefresh: false }))

    await result.current.refresh()

    expect(flowAPI.startGraph).toHaveBeenCalled()
  })
})
