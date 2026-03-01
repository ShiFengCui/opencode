import { Hono } from "hono"

/**
 * Webhook 路由 - 接收 OpenCode 事件
 */
export function WebhookRoutes() {
  const router = new Hono()

  // 接收 OpenCode 事件通知
  router.post("/opencode-event", async (c) => {
    try {
      const event = await c.req.json()
      console.log("[Webhook] Received OpenCode event:", event.type)

      // TODO: 处理事件，更新图状态

      return c.json({ status: "received" })
    } catch (error) {
      console.error("[Webhook] Error processing event:", error)
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  return router
}
