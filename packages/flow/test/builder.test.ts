import { describe, test, expect } from "bun:test"
import { GraphBuilder } from "../src/builder"
import { OpenCodeClient } from "../src/opencode-client"

describe("GraphBuilder", () => {
  test("should create builder with client", () => {
    const client = new OpenCodeClient({
      baseUrl: "http://localhost:4096",
    })

    const builder = new GraphBuilder(client)

    expect(builder).toBeDefined()
  })

  test("should add nodes and edges", () => {
    const client = new OpenCodeClient({
      baseUrl: "http://localhost:4096",
    })

    const builder = new GraphBuilder(client)

    // 添加节点
    const mockNode = {
      config: { id: "test", type: "test", name: "Test" },
      execute: async () => ({}),
      onError: async () => ({}),
      toJSON: () => ({}),
    }

    builder.addNode(mockNode as any)
    builder.addEdge("test", "output")

    expect(builder).toBeDefined()
  })
})
