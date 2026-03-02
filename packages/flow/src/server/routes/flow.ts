import { Hono } from "hono"
import { protocolRouter } from "../../protocol/router"

/**
 * Flow 独有路由
 * 使用 /flow 前缀，不影响 OpenCode 兼容性
 */
export function FlowRoutes() {
  const router = new Hono()

  // ==================== 图管理 ====================

  // POST /flow/graph/start - 启动图执行
  router.post("/graph/start", async (c) => {
    const { sessionID, userInput, graphConfig } = await c.req.json()

    if (!sessionID) {
      return c.json({ error: "sessionID required" }, 400)
    }

    const adapter = protocolRouter.get("flow")
    const result = await (adapter as any).startGraph?.(sessionID, userInput, graphConfig)

    return c.json({
      status: "started",
      sessionID,
      ...result,
    })
  })

  // GET /flow/graph/:sessionID/status - 获取图状态
  router.get("/graph/:sessionID/status", async (c) => {
    const sessionID = c.req.param("sessionID")
    const adapter = protocolRouter.get("flow")

    const status = await (adapter as any).getGraphStatus?.(sessionID)

    return c.json(status || { running: false })
  })

  // GET /flow/graph/:sessionID/history - 获取执行历史
  router.get("/graph/:sessionID/history", async (c) => {
    const sessionID = c.req.param("sessionID")
    const adapter = protocolRouter.get("flow")

    const history = await (adapter as any).getGraphHistory?.(sessionID)

    return c.json(history || { checkpoints: [] })
  })

  // POST /flow/graph/:sessionID/feedback - 用户反馈
  router.post("/graph/:sessionID/feedback", async (c) => {
    const sessionID = c.req.param("sessionID")
    const { feedback, permissionID } = await c.req.json()

    const adapter = protocolRouter.get("flow")
    await (adapter as any).sendFeedback?.(sessionID, feedback, permissionID)

    return c.json({ status: "updated" })
  })

  // POST /flow/graph/:sessionID/stop - 停止执行
  router.post("/graph/:sessionID/stop", async (c) => {
    const sessionID = c.req.param("sessionID")
    const adapter = protocolRouter.get("flow")
    await (adapter as any).stopGraph?.(sessionID)
    return c.json({ status: "stopped" })
  })

  // DELETE /flow/graph/:sessionID - 删除图数据
  router.delete("/graph/:sessionID", async (c) => {
    const sessionID = c.req.param("sessionID")
    const adapter = protocolRouter.get("flow")
    await (adapter as any).deleteGraph?.(sessionID)
    return c.json({ status: "deleted" })
  })

  // ==================== 节点管理 ====================

  // GET /flow/node/types - 获取节点类型
  router.get("/node/types", async (c) => {
    // TODO: 从 NodeRegistry 获取
    return c.json({
      types: ["prompt", "llm", "tool", "output", "processor", "permission"],
    })
  })

  // POST /flow/node/register - 注册自定义节点
  router.post("/node/register", async (c) => {
    const { type, code } = await c.req.json()

    // TODO: 实现节点注册
    console.log(`[Flow] Register node type: ${type}`)

    return c.json({ status: "registered", type })
  })

  // ==================== 插件管理 ====================

  // GET /flow/plugin/list - 获取插件列表
  router.get("/plugin/list", async (c) => {
    // TODO: 从 PluginManager 获取
    return c.json({ plugins: [] })
  })

  // POST /flow/plugin/install - 安装插件
  router.post("/plugin/install", async (c) => {
    const { name, version } = await c.req.json()

    // TODO: 实现插件安装
    console.log(`[Flow] Install plugin: ${name}@${version}`)

    return c.json({ status: "installed", name, version })
  })

  // ==================== 健康检查 ====================

  // GET /flow/health - Flow 健康检查
  router.get("/health", async (c) => {
    return c.json({
      status: "ok",
      timestamp: Date.now(),
      adapter: "flow",
    })
  })

  return router
}
