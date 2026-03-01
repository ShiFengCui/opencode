import type { MessageV2, MessageV2Part } from "../copied/types"

/**
 * 将 OpenCode 消息格式转换为 AI SDK 格式
 */
export function convertToAIMessages(messages: MessageV2[]): any[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.role === "user" ? "User message" : "Assistant message",
  }))
}

/**
 * 创建默认会话标题
 */
export function createDefaultTitle(isFork: boolean): string {
  if (isFork) {
    const forkNumber = Math.floor(Math.random() * 100)
    return `New Session (fork #${forkNumber})`
  }
  return "New Session"
}

/**
 * 生成递增 ID
 */
export function ascendingID(prefix: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * 深度克隆对象
 */
export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}
