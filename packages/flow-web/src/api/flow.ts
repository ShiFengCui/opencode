import type { GraphConfig } from "../components/graph/types"

const FLOW_API_BASE = import.meta.env.VITE_FLOW_API_URL || "http://localhost:4097"

/**
 * Flow API 客户端
 */
export class FlowAPI {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || FLOW_API_BASE
  }

  /**
   * 启动图执行
   */
  async startGraph(
    sessionID: string,
    userInput: string,
    graphConfig?: GraphConfig,
  ): Promise<{ status: string; sessionID: string }> {
    const response = await fetch(`${this.baseUrl}/graph/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionID, userInput, graphConfig }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to start graph")
    }

    return response.json()
  }

  /**
   * 获取图状态
   */
  async getGraphStatus(sessionID: string): Promise<{ running: boolean; status?: string; lastCheckpoint?: string }> {
    const response = await fetch(`${this.baseUrl}/graph/${sessionID}/status`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to get status")
    }

    return response.json()
  }

  /**
   * 获取执行历史
   */
  async getGraphHistory(
    sessionID: string,
  ): Promise<{ sessionID: string; checkpoints: Array<{ id: string; timestamp: string }> }> {
    const response = await fetch(`${this.baseUrl}/graph/${sessionID}/history`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to get history")
    }

    return response.json()
  }

  /**
   * 发送用户反馈
   */
  async sendFeedback(
    sessionID: string,
    feedback: "approve" | "reject",
    permissionID?: string,
  ): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/graph/${sessionID}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback, permissionID }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to send feedback")
    }

    return response.json()
  }

  /**
   * 停止图执行
   */
  async stopGraph(sessionID: string): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/graph/${sessionID}/stop`, {
      method: "POST",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to stop graph")
    }

    return response.json()
  }

  /**
   * 删除图数据
   */
  async deleteGraph(sessionID: string): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/graph/${sessionID}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to delete graph")
    }

    return response.json()
  }

  /**
   * 保存图配置
   */
  async saveGraphConfig(config: GraphConfig): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/graph/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to save config")
    }

    return response.json()
  }

  /**
   * 加载图配置
   */
  async loadGraphConfig(sessionID: string): Promise<GraphConfig> {
    const response = await fetch(`${this.baseUrl}/graph/config/${sessionID}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to load config")
    }

    return response.json()
  }

  /**
   * 健康检查
   */
  async health(): Promise<{ status: string; timestamp: number }> {
    const response = await fetch(`${this.baseUrl}/health`)
    return response.json()
  }
}

// 导出单例
export const flowAPI = new FlowAPI()
