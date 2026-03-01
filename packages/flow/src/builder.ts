import { StateGraph, END } from "@langchain/langgraph"
import { GraphStateSchema, type GraphState } from "../state"
import { BaseNode } from "./nodes/base"
import { OpenCodeClient } from "./opencode-client"
import { PromptNode } from "./nodes/prompt"
import { LLMNode } from "./nodes/llm"
import { ProcessorNode } from "./nodes/processor"
import { PermissionNode } from "./nodes/permission"
import { ToolNode } from "./nodes/tool"
import { OutputNode } from "./nodes/output"

export class GraphBuilder {
  private nodes: Map<string, BaseNode> = new Map()
  private edges: Map<string, string | ((state: GraphState) => string | null)> = new Map()
  private client: OpenCodeClient

  constructor(client: OpenCodeClient) {
    this.client = client
  }

  addNode(node: BaseNode): this {
    this.nodes.set(node.config.id, node)
    return this
  }

  addEdge(from: string, to: string | ((state: GraphState) => string | null)): this {
    this.edges.set(from, to)
    return this
  }

  build(): any {
    const workflow = new StateGraph(GraphStateSchema)

    // 添加节点
    for (const [id, node] of this.nodes.entries()) {
      workflow.addNode(id, async (state) => {
        try {
          console.log(`[GraphBuilder] Executing node: ${id}`)
          return await node.execute(state as GraphState)
        } catch (error) {
          console.error(`[GraphBuilder] Node ${id} error:`, error)
          return await node.onError(state as GraphState, error as Error)
        }
      })
    }

    // 添加边
    for (const [from, to] of this.edges.entries()) {
      if (typeof to === "function") {
        workflow.addConditionalEdges(from, to)
      } else if (to === "__END__") {
        workflow.addEdge(from, END)
      } else {
        workflow.addEdge(from, to)
      }
    }

    // 设置入口
    workflow.setEntryPoint("prompt")

    console.log("[GraphBuilder] Graph compiled successfully")
    return workflow.compile()
  }
}

/**
 * 创建默认图
 */
export function createDefaultGraph(client: OpenCodeClient): any {
  return new GraphBuilder(client)
    .addNode(new PromptNode({ id: "prompt", name: "提示词处理" }, client))
    .addNode(new LLMNode({ id: "llm", name: "AI 模型调用" }, client))
    .addNode(new ProcessorNode({ id: "processor", name: "响应处理" }, client))
    .addNode(new PermissionNode({ id: "permission", name: "权限检查" }, client))
    .addNode(new ToolNode({ id: "tool", name: "工具执行" }, client))
    .addNode(new OutputNode({ id: "output", name: "结果输出" }, client))
    .addEdge("prompt", "llm")
    .addEdge("llm", "processor")
    .addEdge("processor", "permission")
    .addEdge(
      "permission",
      (state: GraphState) =>
        state.pendingPermissions && state.pendingPermissions.length > 0
          ? "wait_user"
          : state.toolCalls && state.toolCalls.length > 0
            ? "tool"
            : "output",
    )
    .addEdge("tool", "llm")
    .addEdge("output", "__END__")
    .build()
}

  addNode(node: BaseNode): this {
    this.nodes.set(node.config.id, node)
    return this
  }

  addEdge(from: string, to: string | ((state: GraphState) => string | null)): this {
    this.edges.set(from, to)
    return this
  }

  build(): any {
    const workflow = new StateGraph(GraphStateSchema)

    // 添加节点
    for (const [id, node] of this.nodes.entries()) {
      workflow.addNode(id, async (state) => {
        try {
          console.log(`[GraphBuilder] Executing node: ${id}`)
          return await node.execute(state as GraphState)
        } catch (error) {
          console.error(`[GraphBuilder] Node ${id} error:`, error)
          return await node.onError(state as GraphState, error as Error)
        }
      })
    }

    // 添加边
    for (const [from, to] of this.edges.entries()) {
      if (typeof to === "function") {
        workflow.addConditionalEdges(from, to)
      } else if (to === "__END__") {
        workflow.addEdge(from, END)
      } else {
        workflow.addEdge(from, to)
      }
    }

    // 设置入口
    workflow.setEntryPoint("prompt")

    console.log("[GraphBuilder] Graph compiled successfully")
    return workflow.compile()
  }
}

/**
 * 创建默认图
 */
export function createDefaultGraph(client: OpenCodeClient): any {
  return new GraphBuilder(client)
    .addNode(new (await import("./nodes/prompt")).PromptNode({ id: "prompt", name: "提示词处理" }, client))
    .addNode(new (await import("./nodes/llm")).LLMNode({ id: "llm", name: "AI 模型调用" }, client))
    .addNode(new (await import("./nodes/processor")).ProcessorNode({ id: "processor", name: "响应处理" }, client))
    .addNode(new (await import("./nodes/permission")).PermissionNode({ id: "permission", name: "权限检查" }, client))
    .addNode(new (await import("./nodes/tool")).ToolNode({ id: "tool", name: "工具执行" }, client))
    .addNode(new (await import("./nodes/output")).OutputNode({ id: "output", name: "结果输出" }, client))
    .addEdge("prompt", "llm")
    .addEdge("llm", "processor")
    .addEdge("processor", "permission")
    .addEdge("permission", (state: GraphState) =>
      state.pendingPermissions && state.pendingPermissions.length > 0
        ? "wait_user"
        : state.toolCalls && state.toolCalls.length > 0
          ? "tool"
          : "output",
    )
    .addEdge("tool", "llm")
    .addEdge("output", "__END__")
    .build()
}
