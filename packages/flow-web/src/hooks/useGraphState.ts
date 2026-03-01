import { useState, useEffect, useCallback } from "react"
import { flowAPI } from "../api/flow"
import type { GraphState } from "../components/graph/types"

interface UseGraphStateOptions {
  sessionID: string
  autoRefresh?: boolean
  refreshInterval?: number
}

/**
 * 图状态 Hook
 * 实时获取图执行状态
 */
export function useGraphState({ sessionID, autoRefresh = true, refreshInterval = 1000 }: UseGraphStateOptions) {
  const [graphState, setGraphState] = useState<GraphState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchState = useCallback(async () => {
    if (!sessionID) return

    setLoading(true)
    try {
      const status = await flowAPI.getGraphStatus(sessionID)

      setGraphState({
        sessionID,
        executionStatus: status.running ? "running" : (status.status as any) || "idle",
        timestamps: {
          started: Date.now(),
          lastUpdated: Date.now(),
        },
      })

      setError(null)
    } catch (err) {
      setError((err as Error).message)
      setGraphState(null)
    } finally {
      setLoading(false)
    }
  }, [sessionID])

  useEffect(() => {
    fetchState()

    if (autoRefresh) {
      const interval = setInterval(fetchState, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [sessionID, autoRefresh, refreshInterval, fetchState])

  return {
    graphState,
    loading,
    error,
    refresh: fetchState,
  }
}

/**
 * 图执行 Hook
 * 控制图执行流程
 */
export function useGraphExecution(sessionID: string) {
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)

  const start = useCallback(
    async (userInput: string) => {
      setRunning(true)
      setCompleted(false)

      try {
        await flowAPI.startGraph(sessionID, userInput)
      } catch (error) {
        console.error("Failed to start graph:", error)
        setRunning(false)
        throw error
      }
    },
    [sessionID],
  )

  const stop = useCallback(async () => {
    await flowAPI.stopGraph(sessionID)
    setRunning(false)
  }, [sessionID])

  const sendFeedback = useCallback(
    async (feedback: "approve" | "reject", permissionID?: string) => {
      await flowAPI.sendFeedback(sessionID, feedback, permissionID)
    },
    [sessionID],
  )

  return {
    running,
    completed,
    start,
    stop,
    sendFeedback,
  }
}
