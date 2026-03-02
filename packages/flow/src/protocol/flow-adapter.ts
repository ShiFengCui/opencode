import type {
  IProtocolAdapter,
  SessionListQuery,
  SessionCreateInput,
  SessionUpdateInput,
  MessageListOptions,
  MessageCreateInput,
  MessageUpdateInput,
} from "./types"
import { FileSaver } from "../persistence"
import { GraphExecutor } from "../graph/executor"
import type { BusEvent } from "../opencode/bus"
import type { PermissionNext } from "../opencode/permission/next"
import { Session } from "../opencode/session"
import { MessageV2 } from "../opencode/session/message-v2"
import { Identifier } from "../opencode/id/id"

/**
 * Flow 协议适配器
 * 使用 Flow 的图引擎执行
 */
export class FlowAdapter implements IProtocolAdapter {
  private fileSaver: FileSaver
  private executor: GraphExecutor

  constructor() {
    this.fileSaver = new FileSaver({ directory: "./.flow-state" })
    this.executor = new GraphExecutor()
  }

  getType(): "flow" {
    return "flow"
  }

  session = {
    async list(query: SessionListQuery): Promise<Session.Info[]> {
      // 从文件存储加载 Flow 会话
      const sessions = await this.fileSaver.list("session")
      return sessions
        .filter((s: any) => {
          if (query.directory && s.directory !== query.directory) return false
          if (query.roots && s.parentID) return false
          if (query.start && s.time.updated < query.start) return false
          if (query.search && !s.title.toLowerCase().includes(query.search.toLowerCase())) return false
          return true
        })
        .slice(0, query.limit || 100)
    },

    async get(id: string): Promise<Session.Info> {
      const session = await this.fileSaver.get(["session", id])
      if (!session) {
        throw new Error(`Session not found: ${id}`)
      }
      return session
    },

    async create(input: SessionCreateInput): Promise<Session.Info> {
      const session: Session.Info = {
        id: `flow-${Date.now()}`,
        slug: this.generateSlug(),
        version: "0.0.1",
        projectID: "flow-project",
        directory: input.directory || process.cwd(),
        title: input.title || "Flow Session",
        agent: "flow",
        time: {
          created: Date.now(),
          updated: Date.now(),
        },
      }

      await this.fileSaver.put(["session", session.id], session)
      return session
    },

    async update(id: string, input: SessionUpdateInput): Promise<Session.Info> {
      const session = await this.get(id)
      const updated = {
        ...session,
        ...input,
        time: {
          ...session.time,
          updated: Date.now(),
          ...(input.time?.archived && { archived: input.time.archived }),
        },
      }
      await this.fileSaver.put(["session", id], updated)
      return updated
    },

    async delete(id: string): Promise<void> {
      await this.fileSaver.remove(["session", id])
    },

    async fork(id: string, messageID?: string): Promise<Session.Info> {
      const original = await this.get(id)
      return this.create({
        title: `${original.title} (fork)`,
        directory: original.directory,
      })
    },
  }

  message = {
    async list(sessionID: string, options?: MessageListOptions): Promise<MessageV2.WithParts[]> {
      const messages = await this.fileSaver.list(["message", sessionID])
      return messages.slice(0, options?.limit || 100)
    },

    async get(sessionID: string, messageID: string): Promise<MessageV2.WithParts> {
      const message = await this.fileSaver.get(["message", sessionID, messageID])
      if (!message) {
        throw new Error(`Message not found: ${messageID}`)
      }
      return message
    },

    async *create(sessionID: string, input: MessageCreateInput): AsyncIterable<MessageV2.WithParts> {
      // 使用 Flow 图引擎执行
      const graph = await this.executor.loadGraph(sessionID)

      // 执行图
      for await (const step of graph.execute({
        sessionID,
        userInput: input.parts[0]?.text || "",
        model: input.model,
      })) {
        // 流式返回结果
        yield step as MessageV2.WithParts
      }
    },

    async update(sessionID: string, messageID: string, input: MessageUpdateInput): Promise<MessageV2.WithParts> {
      const message = await this.get(sessionID, messageID)
      const updated = { ...message, ...input }
      await this.fileSaver.put(["message", sessionID, messageID], updated)
      return updated
    },

    async delete(sessionID: string, messageID: string): Promise<void> {
      await this.fileSaver.remove(["message", sessionID, messageID])
    },
  }

  events = {
    async *subscribe(sessionID?: string): AsyncIterable<BusEvent> {
      const queue: BusEvent[] = []

      const handler = (event: BusEvent) => {
        if (sessionID && (event.properties as any).sessionID !== sessionID) {
          return
        }
        queue.push(event)
      }

      // 订阅 Flow 事件
      const unsubscribe = this.executor.subscribe(handler)

      try {
        while (true) {
          if (queue.length > 0) {
            yield queue.shift()!
          } else {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
      } finally {
        unsubscribe()
      }
    },
  }

  permission = {
    async list(): Promise<PermissionNext.Request[]> {
      return this.executor.getPendingPermissions()
    },

    async reply(requestID: string, reply: "once" | "always" | "reject"): Promise<void> {
      await this.executor.replyPermission(requestID, reply)
    },
  }

  file = {
    async read(path: string): Promise<string> {
      return Bun.file(path).text()
    },

    async write(path: string, content: string): Promise<void> {
      await Bun.write(path, content)
    },

    async delete(path: string): Promise<void> {
      const fs = await import("fs/promises")
      await fs.unlink(path)
    },
  }

  private generateSlug(): string {
    return Math.random().toString(36).substring(2, 10)
  }
}
