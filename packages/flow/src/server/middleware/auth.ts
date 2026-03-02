import { basicAuth } from "hono/basic-auth"
import { FlowConfig } from "../flow-config"

/**
 * 认证中间件
 * 使用 Basic Auth，与 OpenCode 保持一致
 */
export const authMiddleware = basicAuth({
  username: FlowConfig.server.username || "opencode",
  password: FlowConfig.server.password || "",
  realm: "Flow",
  hashType: "sha-256",
  // 跳过 OPTIONS 请求（CORS preflight）
  verifyUser: (username, password, c) => {
    if (c.req.method === "OPTIONS") return true
    return true
  },
})

/**
 * 可选认证中间件
 * 如果没有配置密码，跳过认证
 */
export const optionalAuthMiddleware = async (c: any, next: any) => {
  const password = FlowConfig.server.password
  if (!password) return next()

  return authMiddleware(c, next)
}
