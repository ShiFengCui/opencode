import React, { useCallback, useState } from "react"
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { PromptNode, LLMNode, ToolNode, OutputNode } from "./nodes"
import { NODE_TYPES, DEFAULT_NODE_CONFIG } from "./node-types"
import type { GraphConfig, GraphNode, GraphEdge } from "./types"

const nodeTypes = {
  prompt: PromptNode,
  llm: LLMNode,
  processor: ({ data }: any) => (
    <div style={{ padding: "12px", border: "2px solid #06b6d4", borderRadius: "8px", background: "white" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: "20px", marginRight: "8px" }}>⚙️</span>
        <span style={{ fontWeight: "bold" }}>{data.label}</span>
      </div>
    </div>
  ),
  permission: ({ data }: any) => (
    <div style={{ padding: "12px", border: "2px solid #f59e0b", borderRadius: "8px", background: "white" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: "20px", marginRight: "8px" }}>🔐</span>
        <span style={{ fontWeight: "bold" }}>{data.label}</span>
      </div>
    </div>
  ),
  tool: ToolNode,
  output: OutputNode,
  wait_user: ({ data }: any) => (
    <div style={{ padding: "12px", border: "2px solid #ef4444", borderRadius: "8px", background: "white" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontSize: "20px", marginRight: "8px" }}>⏸️</span>
        <span style={{ fontWeight: "bold" }}>{data.label}</span>
      </div>
    </div>
  ),
}

const initialNodes: Node[] = [
  {
    id: "1",
    type: "prompt",
    position: { x: 250, y: 0 },
    data: { label: "提示词处理", status: "idle" },
  },
]

const initialEdges: Edge[] = []

interface GraphEditorProps {
  sessionID?: string
  onGraphChange?: (config: GraphConfig) => void
}

export function GraphEditor({ sessionID, onGraphChange }: GraphEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([])
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodes([node])
  }, [])

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodes([node])
    setShowConfigPanel(true)
  }, [])

  const addNode = useCallback(
    (type: keyof typeof NODE_TYPES) => {
      const config = DEFAULT_NODE_CONFIG[type]
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: { x: Math.random() * 400 + 50, y: Math.random() * 400 + 50 },
        data: config.data || {},
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes],
  )

  const saveGraph = useCallback(() => {
    if (!sessionID) return

    const config: GraphConfig = {
      id: sessionID,
      name: "My Graph",
      nodes: nodes as GraphNode[],
      edges: edges as GraphEdge[],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    onGraphChange?.(config)
  }, [sessionID, nodes, edges, onGraphChange])

  const saveAsTemplate = useCallback(() => {
    const name = prompt("Enter template name:")
    if (!name) return

    const config: GraphConfig = {
      id: `template-${Date.now()}`,
      name,
      nodes: nodes as GraphNode[],
      edges: edges as GraphEdge[],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    graphTemplateManager.createTemplate(name, config)
    alert("Template saved!")
  }, [nodes, edges])

  const handleSaveNodeConfig = useCallback(
    (updatedNode: Node) => {
      setNodes((nds) => nds.map((n) => (n.id === updatedNode.id ? updatedNode : n)))
      setShowConfigPanel(false)
    },
    [setNodes],
  )

  const handleApplyTemplate = useCallback(
    (config: GraphConfig) => {
      setNodes(config.nodes as Node[])
      setEdges(config.edges as Edge[])
    },
    [setNodes, setEdges],
  )

  return (
    <div style={{ width: "100%", height: "600px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          gap: "8px",
          background: "#f9fafb",
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => addNode("prompt")} style={buttonStyle}>
          📝 Prompt
        </button>
        <button onClick={() => addNode("llm")} style={buttonStyle}>
          🤖 LLM
        </button>
        <button onClick={() => addNode("processor")} style={buttonStyle}>
          ⚙️ Processor
        </button>
        <button onClick={() => addNode("permission")} style={buttonStyle}>
          🔐 Permission
        </button>
        <button onClick={() => addNode("tool")} style={buttonStyle}>
          🔧 Tool
        </button>
        <button onClick={() => addNode("output")} style={buttonStyle}>
          ✅ Output
        </button>
        <button onClick={saveGraph} style={{ ...buttonStyle, background: "#10b981", color: "white" }}>
          💾 Save
        </button>
        <button onClick={saveAsTemplate} style={{ ...buttonStyle, background: "#8b5cf6", color: "white" }}>
          📋 Save as Template
        </button>
        <button
          onClick={() => setShowTemplateManager(true)}
          style={{ ...buttonStyle, background: "#f59e0b", color: "white" }}
        >
          📁 Templates
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>

      {selectedNodes.length > 0 && !showConfigPanel && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            background: "white",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            minWidth: "200px",
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Node Properties</h4>
          <div style={{ fontSize: "12px", color: "#666" }}>
            <div>ID: {selectedNodes[0].id}</div>
            <div>Type: {selectedNodes[0].type}</div>
            <div>Label: {selectedNodes[0].data.label}</div>
          </div>
          <button
            onClick={() => setShowConfigPanel(true)}
            style={{
              marginTop: "8px",
              padding: "4px 8px",
              fontSize: "12px",
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Edit Config
          </button>
        </div>
      )}

      {showConfigPanel && selectedNodes[0] && (
        <NodeConfigPanel
          node={selectedNodes[0] as GraphNode}
          onClose={() => setShowConfigPanel(false)}
          onSave={handleSaveNodeConfig}
        />
      )}

      {showTemplateManager && (
        <TemplateManager onApplyTemplate={handleApplyTemplate} onClose={() => setShowTemplateManager(false)} />
      )}
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  background: "white",
  cursor: "pointer",
  fontSize: "13px",
  transition: "all 0.2s",
}
