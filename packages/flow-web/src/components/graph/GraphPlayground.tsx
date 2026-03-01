import React, { useState } from "react"
import { GraphEditor } from "./GraphEditor"
import { useGraphState, useGraphExecution } from "../hooks/useGraphState"
import { flowAPI } from "../api/flow"

interface GraphPlaygroundProps {
  sessionID: string
}

export function GraphPlayground({ sessionID }: GraphPlaygroundProps) {
  const { graphState, loading, error, refresh } = useGraphState({
    sessionID,
    autoRefresh: true,
    refreshInterval: 2000,
  })

  const { running, start, stop, sendFeedback } = useGraphExecution(sessionID)
  const [userInput, setUserInput] = useState("")

  const handleStart = async () => {
    if (!userInput.trim()) return
    await start(userInput)
    setUserInput("")
  }

  const handleStop = async () => {
    await stop()
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Flow Playground</h1>
        <p style={{ color: "#666" }}>Session: {sessionID}</p>
      </div>

      {/* 状态栏 */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "20px",
          padding: "16px",
          background: "#f9fafb",
          borderRadius: "8px",
        }}
      >
        <div>
          <strong>Status:</strong>{" "}
          <span
            style={{
              color: graphState?.executionStatus === "running" ? "#3b82f6" : "#6b7280",
            }}
          >
            {graphState?.executionStatus || "idle"}
          </span>
        </div>
        <div>
          <strong>Loop Count:</strong> {graphState?.loopCount || 0}
        </div>
        {loading && <div>Loading...</div>}
        {error && <div style={{ color: "#ef4444" }}>Error: {error}</div>}
      </div>

      {/* 控制栏 */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your prompt..."
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
          disabled={running}
        />
        {!running ? (
          <button
            onClick={handleStart}
            disabled={!userInput.trim()}
            style={{
              padding: "10px 20px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: userInput.trim() ? "pointer" : "not-allowed",
              fontWeight: "bold",
            }}
          >
            ▶ Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            style={{
              padding: "10px 20px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ⏹ Stop
          </button>
        )}
        <button
          onClick={refresh}
          style={{
            padding: "10px 20px",
            background: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* 图编辑器 */}
      <GraphEditor sessionID={sessionID} />

      {/* 反馈控制（用于权限审批） */}
      {graphState?.executionStatus === "running" && (
        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            background: "#fef3c7",
            borderRadius: "8px",
            border: "1px solid #f59e0b",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0" }}>Permission Required</h3>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => sendFeedback("approve")}
              style={{
                padding: "8px 16px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => sendFeedback("reject")}
              style={{
                padding: "8px 16px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ✗ Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
