import { Hono } from "hono"
import { cors } from "hono/cors"
import { GraphRoutes } from "./routes/graph"
import { WebhookRoutes } from "./routes/webhook"
import { SSERoutes } from "./routes/sse"

export function createServer() {
  const app = new Hono()

  // 中间件
  app.use("*", cors())

  // 日志中间件
  app.use("*", async (c, next) => {
    console.log(`[HTTP] ${c.req.method} ${c.req.path}`)
    await next()
  })

  // 路由
  app.route("/graph", GraphRoutes())
  app.route("/graph", SSERoutes())
  app.route("/webhook", WebhookRoutes())

  // 健康检查
  app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }))

  // 404 处理
  app.notFound((c) => c.json({ error: "Not Found" }, 404))

  // 错误处理
  app.onError((err, c) => {
    console.error("[HTTP] Error:", err)
    return c.json({ error: err.message }, 500)
  })

  return app
}
