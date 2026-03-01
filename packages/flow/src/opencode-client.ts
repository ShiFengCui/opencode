import type { SessionInfo, MessageV2, PermissionRequest, ToolResult } from "../copied/types"

export interface OpenCodeClientConfig {
  baseUrl: string
  apiKey?: string
  username?: string
  password?: string
}

export class OpenCodeClient {
  private baseUrl: string
  private headers: HeadersInit

  constructor(config: OpenCodeClientConfig) {
    this.baseUrl = config.baseUrl
    this.headers = {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...(config.username && config.password
        ? { Authorization: `Basic ${btoa(`${config.username}:${config.password}`)}` }
        : {}),
    }
  }

  /**
   * 获取会话信息
   */
  async getSession(sessionID: string): Promise<SessionInfo> {
    const response = await fetch(`${this.baseUrl}/session/${sessionID}`, {
      headers: this.headers,
    })
    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * 创建消息
   */
  async createMessage(input: { sessionID: string; parts: any[] }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/session/${input.sessionID}/message`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ parts: input.parts }),
    })
    if (!response.ok) {
      throw new Error(`Failed to create message: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * 更新消息部分
   */
  async updatePart(part: any): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/session/${part.sessionID}/message/${part.messageID}/part/${part.id}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(part),
      },
    )
    if (!response.ok) {
      throw new Error(`Failed to update part: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * 执行工具
   */
  async executeTool(toolName: string, input: any, sessionID: string): Promise<ToolResult> {
    const response = await fetch(`${this.baseUrl}/tool/${toolName}/execute`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ input, sessionID }),
    })
    if (!response.ok) {
      throw new Error(`Failed to execute tool: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * 检查权限
   */
  async checkPermission(input: {
    permission: string
    patterns: string[]
    sessionID: string
  }): Promise<PermissionRequest> {
    const response = await fetch(`${this.baseUrl}/permission`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(input),
    })
    if (!response.ok) {
      throw new Error(`Failed to check permission: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * 获取待处理权限
   */
  async getPendingPermissions(): Promise<PermissionRequest[]> {
    const response = await fetch(`${this.baseUrl}/permission`, {
      headers: this.headers,
    })
    if (!response.ok) {
      throw new Error(`Failed to get permissions: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * 响应权限请求
   */
  async replyPermission(requestID: string, reply: "once" | "always" | "reject"): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/permission/${requestID}/reply`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ reply }),
    })
    if (!response.ok) {
      throw new Error(`Failed to reply permission: ${response.statusText}`)
    }
    return response.json()
  }

  /**
   * 订阅事件（SSE）
   */
  subscribeEvents(
    sessionID: string,
    callbacks: {
      onNodeStarted?: (data: any) => void
      onNodeCompleted?: (data: any) => void
      onStateUpdated?: (data: any) => void
    },
  ): () => void {
    const eventSource = new EventSource(`${this.baseUrl}/event?sessionID=${sessionID}`)

    eventSource.addEventListener("graph.node.started", (e) => {
      callbacks.onNodeStarted?.(JSON.parse(e.data))
    })

    eventSource.addEventListener("graph.node.completed", (e) => {
      callbacks.onNodeCompleted?.(JSON.parse(e.data))
    })

    eventSource.addEventListener("graph.state.updated", (e) => {
      callbacks.onStateUpdated?.(JSON.parse(e.data))
    })

    return () => eventSource.close()
  }
}
