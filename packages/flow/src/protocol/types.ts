/**
 * 统一协议接口定义
 * 所有执行引擎必须实现此接口
 */

import type { Session } from "../opencode/session"
import type { MessageV2 } from "../opencode/session/message-v2"
import type { BusEvent } from "../opencode/bus"
import type { PermissionNext } from "../opencode/permission/next"

export type AdapterType = "opencode" | "flow"

/**
 * 会话列表查询参数
 */
export interface SessionListQuery {
  directory?: string
  roots?: boolean
  start?: number
  search?: string
  limit?: number
}

/**
 * 会话创建输入
 */
export interface SessionCreateInput {
  title?: string
  directory?: string
  permission?: any[]
}

/**
 * 会话更新输入
 */
export interface SessionUpdateInput {
  title?: string
  agent?: string
  model?: {
    providerID: string
    modelID: string
  }
  permission?: any[]
  time?: {
    archived?: number
  }
}

/**
 * 消息列表选项
 */
export interface MessageListOptions {
  limit?: number
  assistantMessageID?: string
}

/**
 * 消息创建输入
 */
export interface MessageCreateInput {
  parts: Array<{
    type: string
    text?: string
    url?: string
    mime?: string
    filename?: string
  }>
  model?: {
    providerID: string
    modelID: string
  }
  agent?: string
}

/**
 * 消息更新输入
 */
export interface MessageUpdateInput {
  parts?: any[]
  cost?: number
  tokens?: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
}

/**
 * 统一协议接口
 */
export interface IProtocolAdapter {
  /**
   * 获取适配器类型
   */
  getType(): AdapterType

  /**
   * 会话管理
   */
  session: {
    list(query: SessionListQuery): Promise<Session.Info[]>
    get(id: string): Promise<Session.Info>
    create(input: SessionCreateInput): Promise<Session.Info>
    update(id: string, input: SessionUpdateInput): Promise<Session.Info>
    delete(id: string): Promise<void>
    fork(id: string, messageID?: string): Promise<Session.Info>
  }

  /**
   * 消息管理
   */
  message: {
    list(sessionID: string, options?: MessageListOptions): Promise<MessageV2.WithParts[]>
    get(sessionID: string, messageID: string): Promise<MessageV2.WithParts>
    create(sessionID: string, input: MessageCreateInput): AsyncIterable<MessageV2.WithParts>
    update(sessionID: string, messageID: string, input: MessageUpdateInput): Promise<MessageV2.WithParts>
    delete(sessionID: string, messageID: string): Promise<void>
  }

  /**
   * 事件订阅
   */
  events: {
    subscribe(sessionID?: string): AsyncIterable<BusEvent>
  }

  /**
   * 权限管理
   */
  permission: {
    list(): Promise<PermissionNext.Request[]>
    reply(requestID: string, reply: "once" | "always" | "reject"): Promise<void>
  }

  /**
   * 文件操作
   */
  file: {
    read(path: string): Promise<string>
    write(path: string, content: string): Promise<void>
    delete(path: string): Promise<void>
  }
}

/**
 * 协议响应格式（与 OpenCode 一致）
 */
export interface ProtocolResponse<T = any> {
  data?: T
  error?: {
    name: string
    message: string
    code?: number
  }
}
