import { cors } from "hono/cors"
import { FlowConfig } from "../flow-config"

/**
 * CORS 中间件
 * 与 OpenCode 保持一致的 CORS 配置
 */
export const corsMiddleware = cors({
  origin: (origin) => {
    // 允许 localhost
    if (origin.startsWith("http://localhost:")) return origin
    if (origin.startsWith("http://127.0.0.1:")) return origin

    // 允许 tauri
    if (origin === "tauri://localhost") return origin
    if (origin === "http://tauri.localhost") return origin

    // 允许配置的白名单
    const whitelist = FlowConfig.server.corsWhitelist || []
    if (whitelist.includes(origin)) return origin

    return undefined
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowHeaders: ["Content-Type", "Authorization", "X-Session-ID"],
  exposeHeaders: ["X-Session-ID", "Content-Length"],
  maxAge: 86400,
})
