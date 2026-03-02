import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { protocolRouter } from "../../protocol/router"

/**
 * 统一协议路由
 * 兼容 OpenCode 客户端的所有 API 端点
 */
export function ProtocolRoutes() {
  const router = new Hono()

  // ==================== 会话管理 ====================

  // GET /session - 获取会话列表
  router.get("/session", async (c) => {
    const query = c.req.query()
    const adapter = protocolRouter.select(query.sessionID || "default")
    const sessions = await adapter.session.list(query)
    return c.json(sessions)
  })

  // POST /session - 创建会话
  router.post("/session", async (c) => {
    const input = await c.req.json()
    const adapter = protocolRouter.get("opencode") // 默认使用 OpenCode
    const session = await adapter.session.create(input)
    c.header("X-Session-ID", session.id)
    return c.json(session)
  })

  // GET /session/:sessionID - 获取会话详情
  router.get("/session/:sessionID", async (c) => {
    const sessionID = c.req.param("sessionID")
    const adapter = protocolRouter.select(sessionID)
    const session = await adapter.session.get(sessionID)
    return c.json(session)
  })

  // DELETE /session/:sessionID - 删除会话
  router.delete("/session/:sessionID", async (c) => {
    const sessionID = c.req.param("sessionID")
    const adapter = protocolRouter.select(sessionID)
    await adapter.session.delete(sessionID)
    return c.json({ success: true })
  })

  // POST /session/:sessionID/fork - 分叉会话
  router.post("/session/:sessionID/fork", async (c) => {
    const sessionID = c.req.param("sessionID")
    const { messageID } = await c.req.json()
    const adapter = protocolRouter.select(sessionID)
    const session = await adapter.session.fork(sessionID, messageID)
    return c.json(session)
  })

  // ==================== 消息管理 ====================

  // GET /session/:sessionID/message - 获取消息列表
  router.get("/session/:sessionID/message", async (c) => {
    const sessionID = c.req.param("sessionID")
    const adapter = protocolRouter.select(sessionID)
    const messages = await adapter.message.list(sessionID, c.req.query())
    return c.json(messages)
  })

  // GET /session/:sessionID/message/:messageID - 获取消息详情
  router.get("/session/:sessionID/message/:messageID", async (c) => {
    const { sessionID, messageID } = c.req.param()
    const adapter = protocolRouter.select(sessionID)
    const message = await adapter.message.get(sessionID, messageID)
    return c.json(message)
  })

  // POST /session/:sessionID/message - 发送消息（流式）
  router.post("/session/:sessionID/message", async (c) => {
    const sessionID = c.req.param("sessionID")
    const input = await c.req.json()
    const adapter = protocolRouter.select(sessionID)

    // 流式响应
    return streamSSE(c, async (stream) => {
      try {
        for await (const message of adapter.message.create(sessionID, input)) {
          await stream.writeSSE({
            data: JSON.stringify({
              type: "message.part.updated",
              properties: { message },
            }),
          })
        }
      } catch (error: any) {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "error",
            properties: { error: error.message },
          }),
        })
      }
    })
  })

  // ==================== 事件订阅 ====================

  // GET /event - SSE 事件流
  router.get("/event", async (c) => {
    const sessionID = c.req.query("sessionID")
    const adapter = protocolRouter.select(sessionID || "default")

    return streamSSE(c, async (stream) => {
      // 发送连接事件（与 OpenCode 一致）
      await stream.writeSSE({
        data: JSON.stringify({ type: "server.connected", properties: {} }),
      })

      // 订阅事件
      for await (const event of adapter.events.subscribe(sessionID)) {
        await stream.writeSSE({
          data: JSON.stringify(event),
        })

        // 会话销毁时关闭流
        if (event.type === "global.disposed") {
          stream.close()
        }
      }
    })
  })

  // ==================== 权限管理 ====================

  // GET /permission - 获取待处理权限
  router.get("/permission", async (c) => {
    const adapter = protocolRouter.get("opencode") // 权限统一管理
    const permissions = await adapter.permission.list()
    return c.json(permissions)
  })

  // POST /permission/:requestID/reply - 响应权限请求
  router.post("/permission/:requestID/reply", async (c) => {
    const { requestID } = c.req.param()
    const { reply } = await c.req.json()
    const adapter = protocolRouter.get("opencode")
    await adapter.permission.reply(requestID, reply)
    return c.json({ success: true })
  })

  // ==================== 文件操作 ====================

  // GET /file - 读取文件
  router.get("/file", async (c) => {
    const path = c.req.query("path")
    if (!path) return c.json({ error: "path required" }, 400)

    const adapter = protocolRouter.get("opencode") // 文件操作统一管理
    const content = await adapter.file.read(path)
    return c.text(content)
  })

  // POST /file - 写入文件
  router.post("/file", async (c) => {
    const { path, content } = await c.req.json()
    const adapter = protocolRouter.get("opencode")
    await adapter.file.write(path, content)
    return c.json({ success: true })
  })

  // DELETE /file - 删除文件
  router.delete("/file", async (c) => {
    const { path } = await c.req.json()
    const adapter = protocolRouter.get("opencode")
    await adapter.file.delete(path)
    return c.json({ success: true })
  })

  return router
}
