import { describe, it, expect, beforeEach } from "vitest"
import { nodeRegistry, NodeRegistry, BaseNode, PromptNode, LLMNode, registerBuiltInNodes } from "../src/graph"
import type { GraphState } from "../src/state"

describe("NodeRegistry", () => {
  beforeEach(() => {
    nodeRegistry.clear()
  })

  it("应该创建注册表实例", () => {
    const registry = new NodeRegistry()
    expect(registry).toBeDefined()
  })

  it("应该注册节点类型", () => {
    class TestNode extends BaseNode {
      id = "test"
      type = "test"
      async execute(state: GraphState) {
        return {}
      }
    }

    nodeRegistry.register("test", TestNode)
    expect(nodeRegistry.hasType("test")).toBe(true)
  })

  it("应该创建节点实例", () => {
    class TestNode extends BaseNode {
      id = "test"
      type = "test"
      async execute(state: GraphState) {
        return {}
      }
    }

    nodeRegistry.register("test", TestNode)
    const node = nodeRegistry.create("test")

    expect(node).toBeDefined()
    expect(node.type).toBe("test")
  })

  it("应该获取所有节点类型", () => {
    class TestNode1 extends BaseNode {
      id = "test1"
      type = "test1"
      async execute(state: GraphState) {
        return {}
      }
    }

    class TestNode2 extends BaseNode {
      id = "test2"
      type = "test2"
      async execute(state: GraphState) {
        return {}
      }
    }

    nodeRegistry.register("test1", TestNode1)
    nodeRegistry.register("test2", TestNode2)

    const types = nodeRegistry.getTypes()
    expect(types).toContain("test1")
    expect(types).toContain("test2")
  })

  it("应该在节点不存在时抛出错误", () => {
    expect(() => nodeRegistry.create("nonexistent")).toThrow("Node type not found")
  })
})

describe("BuiltInNodes", () => {
  beforeEach(() => {
    nodeRegistry.clear()
    registerBuiltInNodes()
  })

  it("应该注册所有内置节点", () => {
    expect(nodeRegistry.hasType("prompt")).toBe(true)
    expect(nodeRegistry.hasType("llm")).toBe(true)
    expect(nodeRegistry.hasType("processor")).toBe(true)
    expect(nodeRegistry.hasType("permission")).toBe(true)
    expect(nodeRegistry.hasType("tool")).toBe(true)
    expect(nodeRegistry.hasType("output")).toBe(true)
  })

  it("应该创建 PromptNode", () => {
    const node = nodeRegistry.create("prompt")
    expect(node.type).toBe("prompt")
  })

  it("应该创建 LLMNode", () => {
    const node = nodeRegistry.create("llm")
    expect(node.type).toBe("llm")
  })
})

describe("PromptNode", () => {
  it("应该执行节点", async () => {
    const node = new PromptNode()
    const state: Partial<GraphState> = {
      loopCount: 0,
      timestamps: { started: Date.now(), lastUpdated: Date.now() },
    }

    const result = await node.execute(state as GraphState)

    expect(result.nextNode).toBe("llm")
    expect(result.loopCount).toBe(1)
  })
})

describe("LLMNode", () => {
  it("应该执行节点", async () => {
    const node = new LLMNode()
    const state: Partial<GraphState> = {
      timestamps: { started: Date.now(), lastUpdated: Date.now() },
    }

    const result = await node.execute(state as GraphState)

    expect(result.nextNode).toBe("processor")
  })
})
