import { Hono } from "hono"
import { OpenCodeClient } from "../opencode-client"
import { loadConfig } from "../config"
import { createDefaultGraph } from "../builder"
import { FileSaver } from "../persistence"
import { join } from "path"

// 内存中的图实例缓存
const graphs = new Map<string, any>()

// 文件存储实例
let fileSaver: FileSaver | null = null

function getFileSaver(): FileSaver {
  if (!fileSaver) {
    const stateDir = join(process.cwd(), ".flow-state")
    fileSaver = new FileSaver({ directory: stateDir })
    console.log(`[FileSaver] Using directory: ${stateDir}`)
  }
  return fileSaver
}

export function GraphRoutes() {
  const router = new Hono()

  /**
   * 启动图执行
   * POST /graph/start
   */
  router.post("/start", async (c) => {
    try {
      const { sessionID, userInput, graphConfig } = await c.req.json()

      if (!sessionID) {
        return c.json({ error: "sessionID is required" }, 400)
      }

      const config = await loadConfig()
      const client = new OpenCodeClient(config.opencode)

      // 创建图
      const graph = graphConfig ? await createCustomGraph(client, graphConfig) : await createDefaultGraph(client)

      // 保存到缓存
      graphs.set(sessionID, { graph, createdAt: Date.now() })

      // 异步执行图
      const fileSaverInstance = getFileSaver()
      graph
        .invoke({ sessionID, userInput, loopCount: 0 }, { configurable: { namespace: sessionID } })
        .then((result: any) => {
          console.log(`[Graph] Execution completed for session ${sessionID}`)
          // 执行完成后从缓存移除
          graphs.delete(sessionID)
        })
        .catch((error: Error) => {
          console.error(`[Graph] Execution failed for session ${sessionID}:`, error)
          graphs.delete(sessionID)
        })

      console.log(`[Graph] Started execution for session ${sessionID}`)
      return c.json({ status: "started", sessionID })
    } catch (error) {
      console.error("[Graph] Start error:", error)
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  /**
   * 获取图状态
   * GET /graph/:sessionID/status
   */
  router.get("/:sessionID/status", async (c) => {
    const sessionID = c.req.param("sessionID")

    // 检查内存缓存
    const cached = graphs.get(sessionID)
    if (cached) {
      return c.json({
        running: true,
        sessionID,
        status: "running",
        createdAt: cached.createdAt,
      })
    }

    // 检查文件存储
    const fileSaverInstance = getFileSaver()
    const latest = await fileSaverInstance.getLatest(sessionID)

    if (latest) {
      return c.json({
        running: false,
        sessionID,
        status: "completed",
        lastCheckpoint: latest.checkpoint.id,
        completedAt: latest.metadata?.timestamp,
      })
    }

    return c.json({ error: "Graph not found", running: false }, 404)
  })

  /**
   * 获取图执行历史
   * GET /graph/:sessionID/history
   */
  router.get("/:sessionID/history", async (c) => {
    const sessionID = c.req.param("sessionID")
    const fileSaverInstance = getFileSaver()

    const checkpoints = await fileSaverInstance.list(sessionID)

    return c.json({
      sessionID,
      checkpoints: checkpoints.map((id) => ({
        id,
        timestamp: id.split("_")[0],
      })),
    })
  })

  /**
   * 用户反馈（权限审批等）
   * POST /graph/:sessionID/feedback
   */
  router.post("/:sessionID/feedback", async (c) => {
    const sessionID = c.req.param("sessionID")
    const { feedback, permissionID, message } = await c.req.json()

    const cached = graphs.get(sessionID)
    if (!cached) {
      return c.json({ error: "Graph not found or not running" }, 404)
    }

    try {
      // TODO: 更新图状态，恢复执行
      console.log(`[Graph] Feedback received: ${feedback} for permission ${permissionID}`)

      // 这里应该更新状态并恢复图执行
      // 目前只是记录日志

      return c.json({ status: "updated", feedback, permissionID })
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500)
    }
  })

  /**
   * 停止图执行
   * POST /graph/:sessionID/stop
   */
  router.post("/:sessionID/stop", async (c) => {
    const sessionID = c.req.param("sessionID")

    const cached = graphs.get(sessionID)
    if (!cached) {
      return c.json({ error: "Graph not found", running: false }, 404)
    }

    // 从缓存移除
    graphs.delete(sessionID)
    console.log(`[Graph] Stopped execution for session ${sessionID}`)

    return c.json({ status: "stopped", sessionID })
  })

  /**
   * 删除图数据
   * DELETE /graph/:sessionID
   */
  router.delete("/:sessionID", async (c) => {
    const sessionID = c.req.param("sessionID")

    // 从缓存移除
    graphs.delete(sessionID)

    // 删除文件存储
    const fileSaverInstance = getFileSaver()
    const checkpoints = await fileSaverInstance.list(sessionID)
    for (const checkpoint of checkpoints) {
      await fileSaverInstance.remove({
        configurable: {
          namespace: sessionID,
          checkpoint_id: checkpoint,
        },
      })
    }

    console.log(`[Graph] Deleted all data for session ${sessionID}`)
    return c.json({ status: "deleted", sessionID })
  })

  return router
}

/**
 * 创建自定义图
 */
async function createCustomGraph(client: OpenCodeClient, config: any): Promise<any> {
  // TODO: 根据配置创建自定义图
  // 目前返回默认图
  return createDefaultGraph(client)
}
