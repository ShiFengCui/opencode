import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import { NODE_COLORS, STATUS_COLORS } from "../node-types"

export type PromptNodeData = {
  label: string
  description?: string
  status?: "idle" | "running" | "completed" | "error"
}

export function PromptNode({ data }: NodeProps<PromptNodeData>) {
  const statusColor = STATUS_COLORS[data.status || "idle"]

  return (
    <div
      className="node-prompt"
      style={{
        padding: "12px 16px",
        borderRadius: "8px",
        border: `2px solid ${statusColor}`,
        background: "white",
        minWidth: "200px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "20px", marginRight: "8px" }}>📝</span>
        <span style={{ fontWeight: "bold", fontSize: "14px" }}>{data.label}</span>
      </div>

      {data.description && (
        <p
          style={{
            fontSize: "12px",
            color: "#666",
            margin: "0 0 8px 0",
            lineHeight: "1.4",
          }}
        >
          {data.description}
        </p>
      )}

      <div
        style={{
          fontSize: "11px",
          color: statusColor,
          textTransform: "uppercase",
          fontWeight: "bold",
        }}
      >
        {data.status || "idle"}
      </div>

      <Handle type="target" position={Position.Top} style={{ background: statusColor }} />
      <Handle type="source" position={Position.Bottom} style={{ background: statusColor }} />
    </div>
  )
}
