import type { Context } from "hono"

/**
 * 日志中间件
 * 记录所有请求
 */
export const logMiddleware = async (c: Context, next: any) => {
  const start = Date.now()

  // 跳过日志的路径
  const skipLogging = c.req.path === "/log" || c.req.path === "/health"

  if (!skipLogging) {
    console.log(`[HTTP] ${c.req.method} ${c.req.path}`)
  }

  await next()

  if (!skipLogging) {
    const duration = Date.now() - start
    console.log(`[HTTP] ${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`)
  }
}
