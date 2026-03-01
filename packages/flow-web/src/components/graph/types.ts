export interface GraphNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    status?: "idle" | "running" | "completed" | "error"
    config?: Record<string, any>
  }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type?: "default" | "conditional"
  label?: string
  animated?: boolean
}

export interface GraphConfig {
  id: string
  name: string
  description?: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  createdAt?: number
  updatedAt?: number
}

export interface GraphState {
  sessionID: string
  executionStatus: "idle" | "running" | "completed" | "error"
  currentNode?: string
  loopCount: number
  shouldContinue: boolean
  timestamps: {
    started: number
    lastUpdated: number
    completed?: number
  }
}
