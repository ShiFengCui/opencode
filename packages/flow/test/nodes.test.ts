import { describe, test, expect, beforeEach } from "bun:test"
import { PromptNode } from "../src/nodes/prompt"
import { LLMNode } from "../src/nodes/llm"
import { ToolNode } from "../src/nodes/tool"
import { PermissionNode } from "../src/nodes/permission"
import { ProcessorNode } from "../src/nodes/processor"
import { OutputNode } from "../src/nodes/output"
import type { GraphState } from "../src/state"

describe("Flow Nodes", () => {
  const mockState: Partial<GraphState> = {
    sessionID: "test-session-123",
    userInput: "Test input",
    messages: [],
    toolCalls: [],
    loopCount: 0,
    shouldContinue: true,
    executionStatus: "idle",
    timestamps: {
      started: Date.now(),
      lastUpdated: Date.now(),
    },
  }

  describe("PromptNode", () => {
    test("should create prompt node", () => {
      const node = new PromptNode({ id: "prompt-1", name: "Test Prompt", type: "prompt" })
      expect(node).toBeDefined()
      expect(node.config.type).toBe("prompt")
    })

    test("should have execute method", () => {
      const node = new PromptNode({ id: "prompt-1", name: "Test Prompt", type: "prompt" })
      expect(typeof node.execute).toBe("function")
    })
  })

  describe("LLMNode", () => {
    test("should create LLM node", () => {
      const node = new LLMNode({ id: "llm-1", name: "Test LLM", type: "llm" })
      expect(node).toBeDefined()
      expect(node.config.type).toBe("llm")
    })

    test("should handle missing API key gracefully", async () => {
      const node = new LLMNode({ id: "llm-1", name: "Test LLM", type: "llm" })
      const result = await node.execute(mockState as GraphState)

      // Should return mock response when API key is missing
      expect(result).toBeDefined()
      expect(result.nextNode).toBe("processor")
    })
  })

  describe("ToolNode", () => {
    test("should create tool node", () => {
      const node = new ToolNode({ id: "tool-1", name: "Test Tool", type: "tool" })
      expect(node).toBeDefined()
      expect(node.config.type).toBe("tool")
    })

    test("should handle empty tool calls", async () => {
      const node = new ToolNode({ id: "tool-1", name: "Test Tool", type: "tool" })
      const state = { ...mockState, toolCalls: [] } as GraphState
      const result = await node.execute(state)

      expect(result).toBeDefined()
      expect(result.nextNode).toBe("llm")
    })
  })

  describe("PermissionNode", () => {
    test("should create permission node", () => {
      const node = new PermissionNode({ id: "perm-1", name: "Test Permission", type: "permission" })
      expect(node).toBeDefined()
      expect(node.config.type).toBe("permission")
    })

    test("should handle empty tool calls", async () => {
      const node = new PermissionNode({ id: "perm-1", name: "Test Permission", type: "permission" })
      const state = { ...mockState, toolCalls: [] } as GraphState
      const result = await node.execute(state)

      expect(result).toBeDefined()
      expect(result.pendingPermissions).toEqual([])
    })
  })

  describe("ProcessorNode", () => {
    test("should create processor node", () => {
      const node = new ProcessorNode({ id: "proc-1", name: "Test Processor", type: "processor" })
      expect(node).toBeDefined()
      expect(node.config.type).toBe("processor")
    })

    test("should route to permission when tool calls exist", async () => {
      const node = new ProcessorNode({ id: "proc-1", name: "Test Processor", type: "processor" })
      const state = { ...mockState, toolCalls: [{ id: "1", toolName: "bash", input: {} }] } as GraphState
      const result = await node.execute(state)

      expect(result).toBeDefined()
      expect(result.nextNode).toBe("permission")
    })

    test("should route to output when no tool calls", async () => {
      const node = new ProcessorNode({ id: "proc-1", name: "Test Processor", type: "processor" })
      const state = { ...mockState, toolCalls: [] } as GraphState
      const result = await node.execute(state)

      expect(result).toBeDefined()
      expect(result.nextNode).toBe("output")
    })
  })

  describe("OutputNode", () => {
    test("should create output node", () => {
      const node = new OutputNode({ id: "out-1", name: "Test Output", type: "output" })
      expect(node).toBeDefined()
      expect(node.config.type).toBe("output")
    })

    test("should mark execution as completed", async () => {
      const node = new OutputNode({ id: "out-1", name: "Test Output", type: "output" })
      const result = await node.execute(mockState as GraphState)

      expect(result).toBeDefined()
      expect(result.executionStatus).toBe("completed")
      expect(result.shouldContinue).toBe(false)
    })
  })
})
