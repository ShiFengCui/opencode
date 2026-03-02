import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { NotFoundError } from "../opencode/storage/db"
import { Provider } from "../opencode/provider/provider"

/**
 * 错误处理中间件
 * 与 OpenCode 保持一致的错误格式
 */
export const errorMiddleware = (err: Error, c: Context) => {
  // NamedError 格式（与 OpenCode 一致）
  if (err instanceof Error && "name" in err && "data" in err) {
    const namedError = err as any
    let status: ContentfulStatusCode

    if (namedError.name === "NotFoundError" || err instanceof NotFoundError) {
      status = 404
    } else if (namedError.name === "ModelNotFoundError" || err instanceof Provider.ModelNotFoundError) {
      status = 400
    } else if (namedError.name?.startsWith("Worktree")) {
      status = 400
    } else {
      status = 500
    }

    return c.json(
      {
        name: namedError.name,
        data: namedError.data,
      },
      { status },
    )
  }

  // 未知错误
  return c.json(
    {
      name: "UnknownError",
      data: {
        message: err.message,
        stack: import.meta.env.DEV ? err.stack : undefined,
      },
    },
    { status: 500 },
  )
}

/**
 * 404 处理
 */
export const notFoundMiddleware = (c: Context) => {
  return c.json(
    {
      name: "NotFoundError",
      data: {
        message: `Not Found: ${c.req.method} ${c.req.path}`,
      },
    },
    { status: 404 },
  )
}
