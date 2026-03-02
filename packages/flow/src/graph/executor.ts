import type { GraphState } from "../state"
import { nodeRegistry, type IFlowNode } from "./graph"

/**
 * 图定义
 */
export interface GraphDefinition {
  /**
   * 图 ID
   */
  id: string

  /**
   * 图名称
   */
  name: string

  /**
   * 图版本
   */
  version?: string

  /**
   * 节点定义
   */
  nodes: NodeDefinition[]

  /**
   * 边定义
   */
  edges: EdgeDefinition[]

  /**
   * 输入定义
   */
  inputs?: InputDefinition[]

  /**
   * 输出定义
   */
  outputs?: OutputDefinition[]
}

/**
 * 节点定义
 */
export interface NodeDefinition {
  /**
   * 节点 ID
   */
  id: string

  /**
   * 节点类型
   */
  type: string

  /**
   * 节点配置
   */
  config?: Record<string, any>

  /**
   * 节点位置（用于可视化）
   */
  position?: { x: number; y: number }
}

/**
 * 边定义
 */
export interface EdgeDefinition {
  /**
   * 边 ID
   */
  id: string

  /**
   * 源节点 ID
   */
  source: string

  /**
   * 目标节点 ID
   */
  target: string

  /**
   * 条件表达式（可选）
   */
  condition?: string
}

/**
 * 输入定义
 */
export interface InputDefinition {
  name: string
  type: string
  required?: boolean
  default?: any
}

/**
 * 输出定义
 */
export interface OutputDefinition {
  name: string
  type: string
}

/**
 * 图执行器
 */
export class GraphExecutor {
  private definition: GraphDefinition
  private nodes: Map<string, IFlowNode> = new Map()
  private edges: Map<string, EdgeDefinition[]> = new Map()

  constructor(definition: GraphDefinition) {
    this.definition = definition
    this.initialize()
  }

  /**
   * 初始化图
   */
  private initialize() {
    // 创建节点实例
    for (const nodeDef of this.definition.nodes) {
      const node = nodeRegistry.create(nodeDef.type, nodeDef.config)
      node.id = nodeDef.id
      this.nodes.set(nodeDef.id, node)
    }

    // 构建边索引
    for (const edge of this.definition.edges) {
      if (!this.edges.has(edge.source)) {
        this.edges.set(edge.source, [])
      }
      this.edges.get(edge.source)!.push(edge)
    }
  }

  /**
   * 执行图
   */
  async *execute(input: Partial<GraphState>): AsyncIterable<any> {
    const state: GraphState = {
      ...(input as GraphState),
      loopCount: 0,
      shouldContinue: true,
      executionStatus: "running",
      timestamps: {
        started: Date.now(),
        lastUpdated: Date.now(),
      },
    }

    // 找到入口节点
    let currentNodeId = this.findEntryNode()

    while (currentNodeId && state.shouldContinue) {
      const node = this.nodes.get(currentNodeId)
      if (!node) {
        throw new Error(`Node not found: ${currentNodeId}`)
      }

      // 更新当前节点
      state.currentNode = currentNodeId

      // 产生节点开始事件
      yield {
        type: "node.started",
        nodeId: currentNodeId,
        nodeType: node.type,
        timestamp: Date.now(),
      }

      try {
        // 执行节点
        const result = await node.execute(state)

        // 更新状态
        Object.assign(state, result)
        state.timestamps.lastUpdated = Date.now()

        // 产生节点完成事件
        yield {
          type: "node.completed",
          nodeId: currentNodeId,
          nodeType: node.type,
          result,
          timestamp: Date.now(),
        }

        // 查找下一个节点
        currentNodeId = this.findNextNode(currentNodeId, state)
      } catch (error: any) {
        // 产生错误事件
        yield {
          type: "node.error",
          nodeId: currentNodeId,
          error: error.message,
          timestamp: Date.now(),
        }

        state.executionStatus = "error"
        break
      }
    }

    // 产生图完成事件
    yield {
      type: "graph.completed",
      state,
      timestamp: Date.now(),
    }
  }

  /**
   * 查找入口节点
   */
  private findEntryNode(): string | null {
    // 查找没有入边的节点
    const targets = new Set(this.definition.edges.map((e) => e.target))
    const entry = this.definition.nodes.find((n) => !targets.has(n.id))
    return entry?.id || this.definition.nodes[0]?.id || null
  }

  /**
   * 查找下一个节点
   */
  private findNextNode(currentNodeId: string, state: GraphState): string | null {
    const edges = this.edges.get(currentNodeId)
    if (!edges || edges.length === 0) {
      return null
    }

    // 如果有多个边，检查条件
    for (const edge of edges) {
      if (edge.condition) {
        const shouldFollow = this.evaluateCondition(edge.condition, state)
        if (shouldFollow) {
          return edge.target
        }
      } else {
        return edge.target
      }
    }

    return edges[0]?.target || null
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, state: GraphState): boolean {
    try {
      // 简单的条件求值（可使用更复杂的表达式引擎）
      const fn = new Function("state", `return ${condition}`)
      return fn(state)
    } catch (error) {
      console.error("[GraphExecutor] Condition evaluation failed:", condition, error)
      return false
    }
  }

  /**
   * 获取图定义
   */
  getDefinition(): GraphDefinition {
    return this.definition
  }

  /**
   * 获取节点列表
   */
  getNodes(): NodeDefinition[] {
    return this.definition.nodes
  }

  /**
   * 获取边列表
   */
  getEdges(): EdgeDefinition[] {
    return this.definition.edges
  }
}

/**
 * 加载图定义
 */
export async function loadGraph(id: string): Promise<GraphExecutor> {
  // TODO: 从存储加载图定义
  // 目前返回一个示例图

  const definition: GraphDefinition = {
    id,
    name: "Default Flow",
    version: "1.0.0",
    nodes: [
      { id: "prompt", type: "prompt" },
      { id: "llm", type: "llm" },
      { id: "processor", type: "processor" },
      { id: "permission", type: "permission" },
      { id: "tool", type: "tool" },
      { id: "output", type: "output" },
    ],
    edges: [
      { id: "e1", source: "prompt", target: "llm" },
      { id: "e2", source: "llm", target: "processor" },
      { id: "e3", source: "processor", target: "permission" },
      {
        id: "e4",
        source: "permission",
        target: "tool",
        condition: "state.pendingPermissions && state.pendingPermissions.length === 0",
      },
      {
        id: "e5",
        source: "permission",
        target: "output",
        condition: "state.pendingPermissions && state.pendingPermissions.length > 0",
      },
      { id: "e6", source: "tool", target: "llm" },
      { id: "e7", source: "output", target: "output" },
    ],
  }

  return new GraphExecutor(definition)
}
