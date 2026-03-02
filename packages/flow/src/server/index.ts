import { Hono } from "hono"
import { corsMiddleware } from "./middleware/cors"
import { authMiddleware } from "./middleware/auth"
import { errorMiddleware, notFoundMiddleware } from "./middleware/error"
import { logMiddleware } from "./middleware/log"
import { ProtocolRoutes } from "./routes/protocol"
import { FlowRoutes } from "./routes/flow"
import { protocolRouter } from "../protocol/router"
import { OpenCodeAdapter } from "../protocol/opencode-adapter"
import { FlowAdapter } from "../protocol/flow-adapter"

/**
 * 创建 Flow 服务器
 * 统一兼容 OpenCode 协议 + Flow 独有功能
 */
export function createServer() {
  const app = new Hono()

  // 注册协议适配器
  protocolRouter.register("opencode", new OpenCodeAdapter())
  protocolRouter.register("flow", new FlowAdapter())

  // ==================== 中间件 ====================

  // CORS（必须在最前面）
  app.use("*", corsMiddleware)

  // 日志
  app.use("*", logMiddleware)

  // 认证（可选）
  app.use("*", authMiddleware)

  // ==================== 路由 ====================

  // 统一协议路由（兼容 OpenCode）
  app.route("/", ProtocolRoutes())

  // Flow 独有路由
  app.route("/flow", FlowRoutes())

  // ==================== 系统端点 ====================

  // 健康检查
  app.get("/health", (c) =>
    c.json({
      status: "ok",
      timestamp: Date.now(),
      adapters: protocolRouter.getTypes(),
    }),
  )

  // ==================== 错误处理 ====================

  // 404
  app.notFound(notFoundMiddleware)

  // 错误处理
  app.onError(errorMiddleware)

  return app
}
