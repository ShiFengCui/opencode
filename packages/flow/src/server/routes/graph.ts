import { Hono } from "hono"
import { OpenCodeClient } from "../opencode-client"
import { loadConfig } from "../config"
import { createDefaultGraph } from "../builder"

const graphs = new Map<string, any>()

export function GraphRoutes() {
  const router = new Hono()

  // 启动图执行
  router.post("/start", async (c) => {
    try {
      const { sessionID, userInput } = await c.req.json()

      if (!sessionID) {
        return c.json({ error: "sessionID is required" }, 400)
      }

      const config = await loadConfig()
      const client = new OpenCodeClient(config.opencode)
      const graph = await createDefaultGraph(client)

      graphs.set(sessionID, graph)

      // 异步执行图
      graph
        .invoke({ sessionID, userInput, loopCount: 0 })
        .then((result: any) => {
          console.log(`[Graph] Execution completed for session ${sessionID}`)
          graphs.delete(sessionID)
        })
        .catch((error: Error) => {
          console.error(`[Graph] Execution failed for session ${sessionID}:`, error)
          graphs.delete(sessionID)
        })

      return c.json({ status: "started", sessionID })
    } catch (error) {
      console.error("[Graph] Start error:", error)
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  // 获取图状态
  router.get("/:sessionID/status", async (c) => {
    const sessionID = c.req.param("sessionID")
    const graph = graphs.get(sessionID)

    if (!graph) {
      return c.json({ error: "Graph not found", running: false }, 404)
    }

    try {
      // TODO: 获取实际状态
      return c.json({
        running: true,
        sessionID,
        status: "running",
      })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  // 用户反馈（权限审批等）
  router.post("/:sessionID/feedback", async (c) => {
    const sessionID = c.req.param("sessionID")
    const { feedback, permissionID } = await c.req.json()

    const graph = graphs.get(sessionID)
    if (!graph) {
      return c.json({ error: "Graph not found" }, 404)
    }

    try {
      // TODO: 更新图状态
      console.log(`[Graph] Feedback received: ${feedback} for permission ${permissionID}`)
      return c.json({ status: "updated" })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  return router
}
