import { nodeRegistry } from "./graph"

/**
 * 插件上下文
 */
export interface PluginContext {
  /**
   * 插件配置
   */
  config: Record<string, any>

  /**
   * 插件存储
   */
  storage: PluginStorage

  /**
   * 事件发射器
   */
  events: EventEmitter
}

/**
 * Flow 插件接口
 */
export interface FlowPlugin {
  /**
   * 插件名称
   */
  name: string

  /**
   * 插件版本
   */
  version: string

  /**
   * 插件描述
   */
  description?: string

  /**
   * 初始化插件
   */
  initialize(context: PluginContext): Promise<void>

  /**
   * 注册自定义节点（可选）
   */
  registerNodes?(registry: typeof nodeRegistry): void

  /**
   * 注册自定义工具（可选）
   */
  registerTools?(registry: any): void

  /**
   * 插件卸载
   */
  dispose?(): Promise<void>
}

/**
 * 插件存储
 */
export class PluginStorage {
  private prefix: string
  private data: Map<string, any> = new Map()

  constructor(pluginName: string) {
    this.prefix = `plugin:${pluginName}:`
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(this.prefix + key)
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(this.prefix + key, value)
  }

  async delete(key: string): Promise<void> {
    this.data.delete(this.prefix + key)
  }

  async clear(): Promise<void> {
    const keys = Array.from(this.data.keys()).filter((k) => k.startsWith(this.prefix))
    keys.forEach((k) => this.data.delete(k))
  }
}

/**
 * 简单的事件发射器
 */
export class EventEmitter {
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map()

  on(event: string, listener: (...args: any[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)

    return () => this.off(event, listener)
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(listener)
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((listener) => listener(...args))
  }
}

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Map<string, FlowPlugin> = new Map()
  private contexts: Map<string, PluginContext> = new Map()

  /**
   * 注册插件
   */
  async register(plugin: FlowPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin already registered: ${plugin.name}`)
    }

    console.log(`[PluginManager] Registering plugin: ${plugin.name}@${plugin.version}`)

    // 创建插件上下文
    const context: PluginContext = {
      config: {},
      storage: new PluginStorage(plugin.name),
      events: new EventEmitter(),
    }

    // 初始化插件
    await plugin.initialize(context)

    // 注册节点
    if (plugin.registerNodes) {
      plugin.registerNodes(nodeRegistry)
    }

    // 保存插件
    this.plugins.set(plugin.name, plugin)
    this.contexts.set(plugin.name, context)

    console.log(`[PluginManager] Plugin registered: ${plugin.name}`)
  }

  /**
   * 卸载插件
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`)
    }

    console.log(`[PluginManager] Unregistering plugin: ${name}`)

    // 调用插件卸载
    if (plugin.dispose) {
      await plugin.dispose()
    }

    // 清理上下文
    const context = this.contexts.get(name)
    if (context) {
      await context.storage.clear()
      this.contexts.delete(name)
    }

    this.plugins.delete(name)

    console.log(`[PluginManager] Plugin unregistered: ${name}`)
  }

  /**
   * 获取插件
   */
  get(name: string): FlowPlugin | undefined {
    return this.plugins.get(name)
  }

  /**
   * 获取所有插件
   */
  getAll(): FlowPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * 获取插件列表
   */
  list(): Array<{ name: string; version: string; description?: string }> {
    return this.getAll().map((p) => ({
      name: p.name,
      version: p.version,
      description: p.description,
    }))
  }
}

// 全局插件管理器实例
export const pluginManager = new PluginManager()
