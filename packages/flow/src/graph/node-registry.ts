import type { GraphState } from "../state"

/**
 * Flow 节点接口
 * 所有自定义节点必须实现此接口
 */
export interface IFlowNode {
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
   * 执行节点逻辑
   */
  execute(state: GraphState): Promise<Partial<GraphState>>

  /**
   * 序列化为 JSON
   */
  toJSON(): object
}

/**
 * 节点注册表
 * 管理所有可用的节点类型
 */
export class NodeRegistry {
  private nodes: Map<string, new () => IFlowNode> = new Map()

  /**
   * 注册节点类型
   */
  register<T extends IFlowNode>(type: string, NodeClass: new () => T): void {
    if (this.nodes.has(type)) {
      console.warn(`[NodeRegistry] Node type "${type}" already registered, overwriting`)
    }
    this.nodes.set(type, NodeClass as any)
    console.log(`[NodeRegistry] Registered node type: ${type}`)
  }

  /**
   * 创建节点实例
   */
  create(type: string, config?: Record<string, any>): IFlowNode {
    const NodeClass = this.nodes.get(type)
    if (!NodeClass) {
      throw new Error(`Node type not found: ${type}`)
    }

    const node = new NodeClass()
    if (config) {
      node.config = config
    }

    return node
  }

  /**
   * 获取所有注册的节点类型
   */
  getTypes(): string[] {
    return Array.from(this.nodes.keys())
  }

  /**
   * 检查节点类型是否已注册
   */
  hasType(type: string): boolean {
    return this.nodes.has(type)
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.nodes.clear()
  }
}

// 全局节点注册表实例
export const nodeRegistry = new NodeRegistry()
