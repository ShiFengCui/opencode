import { Hono } from "hono"
import type { Context } from "hono"

// 存储 SSE 连接
const connections = new Map<string, Set<any>>()

/**
 * SSE 流路由
 */
export function SSERoutes() {
  const router = new Hono()

  /**
   * SSE 事件流端点
   * GET /graph/:sessionID/stream
   */
  router.get("/:sessionID/stream", async (c) => {
    const sessionID = c.req.param("sessionID")

    console.log(`[SSE] New connection for session: ${sessionID}`)

    return streamSSE(c, async (stream) => {
      // 发送初始连接事件
      await stream.writeSSE({
        data: JSON.stringify({
          type: "graph.connected",
          properties: { sessionID, timestamp: Date.now() },
        }),
      })

      // 存储连接
      if (!connections.has(sessionID)) {
        connections.set(sessionID, new Set())
      }
      connections.get(sessionID)!.add(stream)

      // 心跳（每 30 秒）
      const heartbeat = setInterval(async () => {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "graph.heartbeat",
            properties: { timestamp: Date.now() },
          }),
        })
      }, 30000)

      // 清理
      stream.onAbort(() => {
        console.log(`[SSE] Connection closed for session: ${sessionID}`)
        clearInterval(heartbeat)
        connections.get(sessionID)?.delete(stream)
        if (connections.get(sessionID)?.size === 0) {
          connections.delete(sessionID)
        }
      })

      // 保持连接
      await new Promise<void>((resolve) => {
        stream.onAbort(resolve)
      })
    })
  })

  /**
   * 广播事件到所有订阅者
   */
  router.post("/:sessionID/broadcast", async (c) => {
    const sessionID = c.req.param("sessionID")
    const { type, properties } = await c.req.json()

    console.log(`[SSE] Broadcasting event: ${type} to session: ${sessionID}`)

    const sessionConnections = connections.get(sessionID)
    if (!sessionConnections) {
      return c.json({ error: "No active connections" }, 404)
    }

    const data = JSON.stringify({ type, properties })
    let successCount = 0

    for (const stream of sessionConnections) {
      try {
        await stream.writeSSE({ data })
        successCount++
      } catch (error) {
        console.error("[SSE] Failed to write to stream:", error)
      }
    }

    return c.json({
      success: true,
      sentTo: successCount,
      total: sessionConnections.size,
    })
  })

  /**
   * 获取连接数
   */
  router.get("/:sessionID/connections", (c) => {
    const sessionID = c.req.param("sessionID")
    const count = connections.get(sessionID)?.size || 0

    return c.json({ sessionID, connections: count })
  })

  return router
}

/**
 * 向指定会话广播事件
 */
export async function broadcastToSession(sessionID: string, type: string, properties: any): Promise<number> {
  const sessionConnections = connections.get(sessionID)
  if (!sessionConnections) {
    return 0
  }

  const data = JSON.stringify({ type, properties })
  let successCount = 0

  for (const stream of sessionConnections) {
    try {
      await stream.writeSSE({ data })
      successCount++
    } catch (error) {
      console.error("[SSE] Failed to broadcast:", error)
    }
  }

  return successCount
}
