import "@testing-library/jest-dom"

// 全局测试设置
beforeEach(() => {
  // 清理 localStorage
  localStorage.clear()
})

// Mock fetch
global.fetch = vi.fn()

// Mock EventSource
class MockEventSource {
  constructor(public url: string) {}
  addEventListener = vi.fn()
  close = vi.fn()
}

global.EventSource = MockEventSource as any
