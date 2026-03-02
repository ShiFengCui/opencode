import { describe, it, expect, beforeEach } from "vitest"
import { GraphExecutor, loadGraph, registerBuiltInNodes } from "../src/graph"
import type { GraphDefinition } from "../src/graph"

describe("GraphExecutor", () => {
  beforeEach(() => {
    registerBuiltInNodes()
  })

  it("应该创建执行器实例", () => {
    const definition: GraphDefinition = {
      id: "test",
      name: "Test Graph",
      nodes: [{ id: "node1", type: "prompt" }],
      edges: [],
    }

    const executor = new GraphExecutor(definition)
    expect(executor).toBeDefined()
  })

  it("应该执行图", async () => {
    const definition: GraphDefinition = {
      id: "test",
      name: "Test Graph",
      nodes: [
        { id: "prompt", type: "prompt" },
        { id: "output", type: "output" },
      ],
      edges: [{ id: "e1", source: "prompt", target: "output" }],
    }

    const executor = new GraphExecutor(definition)
    const results: any[] = []

    for await (const result of executor.execute({ sessionID: "test" })) {
      results.push(result)
    }

    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.type === "node.started")).toBe(true)
    expect(results.some((r) => r.type === "node.completed")).toBe(true)
    expect(results.some((r) => r.type === "graph.completed")).toBe(true)
  })

  it("应该获取图定义", () => {
    const definition: GraphDefinition = {
      id: "test",
      name: "Test Graph",
      nodes: [{ id: "node1", type: "prompt" }],
      edges: [],
    }

    const executor = new GraphExecutor(definition)
    const retrieved = executor.getDefinition()

    expect(retrieved.id).toBe("test")
    expect(retrieved.name).toBe("Test Graph")
  })

  it("应该获取节点列表", () => {
    const definition: GraphDefinition = {
      id: "test",
      name: "Test Graph",
      nodes: [
        { id: "node1", type: "prompt" },
        { id: "node2", type: "llm" },
      ],
      edges: [],
    }

    const executor = new GraphExecutor(definition)
    const nodes = executor.getNodes()

    expect(nodes.length).toBe(2)
    expect(nodes[0].id).toBe("node1")
    expect(nodes[1].id).toBe("node2")
  })

  it("应该获取边列表", () => {
    const definition: GraphDefinition = {
      id: "test",
      name: "Test Graph",
      nodes: [{ id: "node1", type: "prompt" }],
      edges: [{ id: "e1", source: "node1", target: "node2" }],
    }

    const executor = new GraphExecutor(definition)
    const edges = executor.getEdges()

    expect(edges.length).toBe(1)
    expect(edges[0].id).toBe("e1")
  })
})

describe("loadGraph", () => {
  beforeEach(() => {
    registerBuiltInNodes()
  })

  it("应该加载图", async () => {
    const executor = await loadGraph("test-123")

    expect(executor).toBeDefined()
    expect(executor.getDefinition().id).toBe("test-123")
  })

  it("应该加载默认图", async () => {
    const executor = await loadGraph("test")

    const nodes = executor.getNodes()
    expect(nodes.length).toBeGreaterThan(0)

    const edges = executor.getEdges()
    expect(edges.length).toBeGreaterThan(0)
  })
})
