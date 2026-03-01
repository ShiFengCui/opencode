// 从 packages/opencode/src/session/message-v2.ts 复制
export type MessageV2 = {
  id: string
  sessionID: string
  role: "user" | "assistant"
  agent?: string
  model?: {
    providerID: string
    modelID: string
  }
  parentID?: string
  time: {
    created: number
    updated?: number
  }
  cost?: number
  tokens?: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
}

export type MessageV2Part = {
  id: string
  sessionID: string
  messageID: string
  type: "text" | "tool" | "file" | "reasoning"
  text?: string
  callID?: string
  tool?: string
  state?: any
  mime?: string
  filename?: string
  url?: string
  time?: {
    start: number
    end?: number
  }
  metadata?: Record<string, any>
}

// 从 packages/opencode/src/tool/tool.ts 复制
export type ToolInfo = {
  name: string
  description: string
  parameters: any
}

export type ToolCall = {
  id: string
  toolName: string
  input: Record<string, any>
}

export type ToolResult = {
  output: string
  title?: string
  metadata?: Record<string, any>
}

// 从 packages/opencode/src/permission/next.ts 复制
export type PermissionRequest = {
  id: string
  sessionID: string
  permission: string
  metadata?: Record<string, any>
  tool?: {
    callID: string
    name: string
  }
}

export type PermissionRule = {
  permission: string
  action: "allow" | "deny" | "ask"
  pattern: string
}

// 从 packages/opencode/src/session/index.ts 复制
export type SessionInfo = {
  id: string
  slug: string
  version: string
  projectID: string
  directory: string
  parentID?: string
  title: string
  agent: string
  model?: {
    providerID: string
    modelID: string
  }
  permission?: PermissionRule[]
  time: {
    created: number
    updated: number
    archived?: number
    compacting?: number
  }
}
