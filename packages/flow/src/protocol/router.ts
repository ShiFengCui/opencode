import type { IProtocolAdapter, AdapterType } from "./types"

/**
 * 协议路由器
 * 根据会话 ID 自动选择合适的协议适配器
 */
export class ProtocolRouter {
  private adapters: Map<AdapterType, IProtocolAdapter> = new Map()
  private defaultAdapter: AdapterType = "opencode"

  /**
   * 注册协议适配器
   */
  register(type: AdapterType, adapter: IProtocolAdapter): void {
    this.adapters.set(type, adapter)
  }

  /**
   * 获取适配器
   */
  get(type: AdapterType = this.defaultAdapter): IProtocolAdapter {
    const adapter = this.adapters.get(type)
    if (!adapter) {
      throw new Error(`Adapter not found: ${type}`)
    }
    return adapter
  }

  /**
   * 根据会话 ID 选择适配器
   * Flow 会话以 'flow-' 开头
   */
  select(sessionID: string): IProtocolAdapter {
    if (sessionID.startsWith("flow-")) {
      return this.get("flow")
    }
    return this.get("opencode")
  }

  /**
   * 设置默认适配器
   */
  setDefault(type: AdapterType): void {
    if (!this.adapters.has(type)) {
      throw new Error(`Adapter not found: ${type}`)
    }
    this.defaultAdapter = type
  }

  /**
   * 获取所有已注册的适配器类型
   */
  getTypes(): AdapterType[] {
    return Array.from(this.adapters.keys()) as AdapterType[]
  }
}

// 全局路由实例
export const protocolRouter = new ProtocolRouter()
