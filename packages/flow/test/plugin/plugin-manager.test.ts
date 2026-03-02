import { describe, it, expect, beforeEach } from "vitest"
import { pluginManager, PluginStorage, EventEmitter, type FlowPlugin } from "../src/plugin"
import { nodeRegistry } from "../src/graph"

describe("PluginManager", () => {
  beforeEach(() => {
    // 清空所有插件
    const plugins = pluginManager.getAll()
    plugins.forEach((p) => {
      // @ts-ignore
      pluginManager.plugins.delete(p.name)
    })
  })

  it("应该创建插件管理器实例", () => {
    expect(pluginManager).toBeDefined()
  })

  it("应该注册插件", async () => {
    const mockPlugin: FlowPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      description: "Test plugin",
      async initialize() {},
    }

    await pluginManager.register(mockPlugin)

    const plugin = pluginManager.get("test-plugin")
    expect(plugin).toBeDefined()
    expect(plugin?.name).toBe("test-plugin")
  })

  it("应该卸载插件", async () => {
    const mockPlugin: FlowPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      async initialize() {},
      async dispose() {},
    }

    await pluginManager.register(mockPlugin)
    await pluginManager.unregister("test-plugin")

    const plugin = pluginManager.get("test-plugin")
    expect(plugin).toBeUndefined()
  })

  it("应该获取所有插件", async () => {
    const plugin1: FlowPlugin = {
      name: "plugin-1",
      version: "1.0.0",
      async initialize() {},
    }

    const plugin2: FlowPlugin = {
      name: "plugin-2",
      version: "1.0.0",
      async initialize() {},
    }

    await pluginManager.register(plugin1)
    await pluginManager.register(plugin2)

    const plugins = pluginManager.getAll()
    expect(plugins.length).toBe(2)
  })

  it("应该列出插件", async () => {
    const mockPlugin: FlowPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      description: "Test",
      async initialize() {},
    }

    await pluginManager.register(mockPlugin)

    const list = pluginManager.list()
    expect(list.length).toBe(1)
    expect(list[0]).toEqual({
      name: "test-plugin",
      version: "1.0.0",
      description: "Test",
    })
  })

  it("应该在插件已存在时抛出错误", async () => {
    const mockPlugin: FlowPlugin = {
      name: "test-plugin",
      version: "1.0.0",
      async initialize() {},
    }

    await pluginManager.register(mockPlugin)

    await expect(pluginManager.register(mockPlugin)).rejects.toThrow("already registered")
  })

  it("应该在插件不存在时抛出错误", async () => {
    await expect(pluginManager.unregister("nonexistent")).rejects.toThrow("not found")
  })
})

describe("PluginStorage", () => {
  it("应该存储和获取数据", async () => {
    const storage = new PluginStorage("test")

    await storage.set("key", "value")
    const value = await storage.get("key")

    expect(value).toBe("value")
  })

  it("应该删除数据", async () => {
    const storage = new PluginStorage("test")

    await storage.set("key", "value")
    await storage.delete("key")
    const value = await storage.get("key")

    expect(value).toBeUndefined()
  })

  it("应该清空数据", async () => {
    const storage = new PluginStorage("test")

    await storage.set("key1", "value1")
    await storage.set("key2", "value2")
    await storage.clear()

    const value1 = await storage.get("key1")
    const value2 = await storage.get("key2")

    expect(value1).toBeUndefined()
    expect(value2).toBeUndefined()
  })
})

describe("EventEmitter", () => {
  it("应该注册和触发事件", () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()

    emitter.on("test", listener)
    emitter.emit("test", "arg1", "arg2")

    expect(listener).toHaveBeenCalledWith("arg1", "arg2")
  })

  it("应该取消事件注册", () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()

    const off = emitter.on("test", listener)
    off()
    emitter.emit("test")

    expect(listener).not.toHaveBeenCalled()
  })
})
