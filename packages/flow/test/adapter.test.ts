import { describe, test, expect } from "bun:test"
import { FlowAdapter } from "../src/adapter"
import { FlowConfig } from "../src/flow-config"

describe("Flow Adapter", () => {
  describe("FlowAdapter", () => {
    test("should get config value", () => {
      const value = FlowAdapter.get("test.key", "default")
      expect(value).toBe("default")
    })

    test("should get state dir", () => {
      const dir = FlowAdapter.getStateDir()
      expect(dir).toBeDefined()
    })

    test("should adapt path", () => {
      const original = "~/.opencode/state/session.json"
      const adapted = FlowAdapter.adaptPath(original)
      expect(adapted).not.toContain("~/.opencode")
    })

    test("should return log prefix", () => {
      const prefix = FlowAdapter.logPrefix("TestService")
      expect(prefix).toBe("[Flow:TestService]")
    })
  })

  describe("FlowConfig", () => {
    test("should have server config", () => {
      expect(FlowConfig.server).toBeDefined()
      expect(FlowConfig.server.port).toBeGreaterThan(0)
    })

    test("should have state config", () => {
      expect(FlowConfig.state).toBeDefined()
      expect(FlowConfig.state.directory).toBeDefined()
    })

    test("should have providers config", () => {
      expect(FlowConfig.providers).toBeDefined()
    })

    test("should have tools config", () => {
      expect(FlowConfig.tools).toBeDefined()
      expect(FlowConfig.tools.bash).toBeDefined()
    })

    test("should have LLM config", () => {
      expect(FlowConfig.llm).toBeDefined()
      expect(FlowConfig.llm.defaultProvider).toBeDefined()
    })
  })
})
