import { useState, useEffect, useCallback, useRef } from "react"
import { flowAPI } from "../api/flow"
import { subscribeGraphEvents, subscribeWithEventSource } from "../api/sse"
import type { GraphState, GraphNode } from "../components/graph/types"

interface UseGraphStateWithSSEOptions {
  sessionID: string
  useSSE?: boolean
  baseUrl?: string
}

/**
 * 图状态 Hook（支持 SSE 实时推送）
 */
export function useGraphStateWithSSE({ sessionID, useSSE = true, baseUrl = "" }: UseGraphStateWithSSEOptions) {
  const [graphState, setGraphState] = useState<GraphState | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

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
    } finally {
      setLoading(false)
    }
  }, [sessionID])

  // 处理节点状态更新
  const handleNodeStarted = useCallback((data: any) => {
    console.log("[Hook] Node started:", data.nodeID)
    setNodes((prev) =>
      prev.map((node) =>
        node.id === data.nodeID ? { ...node, data: { ...node.data, status: "running" as const } } : node,
      ),
    )
  }, [])

  const handleNodeCompleted = useCallback((data: any) => {
    console.log("[Hook] Node completed:", data.nodeID)
    setNodes((prev) =>
      prev.map((node) =>
        node.id === data.nodeID ? { ...node, data: { ...node.data, status: "completed" as const } } : node,
      ),
    )
  }, [])

  const handleStateUpdated = useCallback((data: any) => {
    console.log("[Hook] State updated:", data)
    setGraphState((prev) =>
      prev
        ? {
            ...prev,
            ...data.state,
            timestamps: {
              ...prev.timestamps,
              lastUpdated: Date.now(),
            },
          }
        : null,
    )
  }, [])

  const handleExecutionCompleted = useCallback((data: any) => {
    console.log("[Hook] Execution completed:", data)
    setGraphState((prev) =>
      prev
        ? {
            ...prev,
            executionStatus: "completed" as const,
            timestamps: {
              ...prev.timestamps,
              completed: Date.now(),
            },
          }
        : null,
    )
  }, [])

  const handleError = useCallback((err: Error) => {
    console.error("[Hook] SSE Error:", err)
    setError(err.message)
  }, [])

  // 订阅 SSE 事件
  useEffect(() => {
    if (!useSSE || !sessionID) return

    console.log("[Hook] Subscribing to SSE events...")

    unsubscribeRef.current = subscribeGraphEvents(
      sessionID,
      {
        onNodeStarted: handleNodeStarted,
        onNodeCompleted: handleNodeCompleted,
        onStateUpdated: handleStateUpdated,
        onExecutionCompleted: handleExecutionCompleted,
        onError: handleError,
      },
      baseUrl,
    )

    // 初始获取状态
    fetchState()

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [
    sessionID,
    useSSE,
    baseUrl,
    fetchState,
    handleNodeStarted,
    handleNodeCompleted,
    handleStateUpdated,
    handleExecutionCompleted,
    handleError,
  ])

  // 更新节点状态的辅助函数
  const updateNodeStatus = useCallback((nodeID: string, status: "idle" | "running" | "completed" | "error") => {
    setNodes((prev) => prev.map((node) => (node.id === nodeID ? { ...node, data: { ...node.data, status } } : node)))
  }, [])

  return {
    graphState,
    nodes,
    loading,
    error,
    refresh: fetchState,
    updateNodeStatus,
    setNodes,
  }
}
