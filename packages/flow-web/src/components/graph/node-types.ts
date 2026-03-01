import type { GraphNode, GraphEdge } from "../types"

export interface GraphNodeData {
  label: string
  description?: string
  status?: "idle" | "running" | "completed" | "error"
  config?: Record<string, any>
}

/**
 * 节点类型映射
 */
export const NODE_TYPES = {
  prompt: "PromptNode",
  llm: "LLMNode",
  processor: "ProcessorNode",
  permission: "PermissionNode",
  tool: "ToolNode",
  output: "OutputNode",
  wait_user: "WaitUserNode",
} as const

/**
 * 节点类型定义
 */
export type NodeType = keyof typeof NODE_TYPES

/**
 * 默认节点配置
 */
export const DEFAULT_NODE_CONFIG: Record<NodeType, Partial<GraphNode>> = {
  prompt: {
    type: "prompt",
    data: {
      label: "提示词处理",
      description: "处理用户输入，创建消息",
      status: "idle",
    },
  },
  llm: {
    type: "llm",
    data: {
      label: "AI 模型调用",
      description: "调用 AI 模型，流式处理",
      status: "idle",
    },
  },
  processor: {
    type: "processor",
    data: {
      label: "响应处理",
      description: "处理流式响应，协调工具",
      status: "idle",
    },
  },
  permission: {
    type: "permission",
    data: {
      label: "权限检查",
      description: "检查工具执行权限",
      status: "idle",
    },
  },
  tool: {
    type: "tool",
    data: {
      label: "工具执行",
      description: "执行具体工具",
      status: "idle",
    },
  },
  output: {
    type: "output",
    data: {
      label: "结果输出",
      description: "保存并输出结果",
      status: "idle",
    },
  },
  wait_user: {
    type: "wait_user",
    data: {
      label: "等待用户",
      description: "等待用户反馈",
      status: "idle",
    },
  },
}

/**
 * 节点颜色配置
 */
export const NODE_COLORS: Record<NodeType, string> = {
  prompt: "#3b82f6",
  llm: "#8b5cf6",
  processor: "#06b6d4",
  permission: "#f59e0b",
  tool: "#10b981",
  output: "#6b7280",
  wait_user: "#ef4444",
}

/**
 * 状态颜色
 */
export const STATUS_COLORS = {
  idle: "#9ca3af",
  running: "#3b82f6",
  completed: "#10b981",
  error: "#ef4444",
}
