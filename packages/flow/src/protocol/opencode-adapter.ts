import type {
  IProtocolAdapter,
  SessionListQuery,
  SessionCreateInput,
  SessionUpdateInput,
  MessageListOptions,
  MessageCreateInput,
  MessageUpdateInput,
} from "./types"
import { Session } from "../opencode/session"
import { MessageV2 } from "../opencode/session/message-v2"
import { Bus } from "../opencode/bus"
import { PermissionNext } from "../opencode/permission/next"
import type { BusEvent } from "../opencode/bus"

/**
 * OpenCode 协议适配器
 * 直接使用 OpenCode 的原有实现
 */
export class OpenCodeAdapter implements IProtocolAdapter {
  getType(): "opencode" {
    return "opencode"
  }

  session = {
    async list(query: SessionListQuery): Promise<Session.Info[]> {
      const sessions: Session.Info[] = []
      for await (const session of Session.list(query)) {
        sessions.push(session)
      }
      return sessions
    },

    async get(id: string): Promise<Session.Info> {
      return Session.get(id)
    },

    async create(input: SessionCreateInput): Promise<Session.Info> {
      return Session.createNext({
        directory: input.directory || process.cwd(),
        title: input.title,
        permission: input.permission,
      })
    },

    async update(id: string, input: SessionUpdateInput): Promise<Session.Info> {
      return Session.update(id, (draft) => {
        if (input.title) draft.title = input.title
        if (input.agent) draft.agent = input.agent
        if (input.model) draft.model = input.model
        if (input.permission) draft.permission = input.permission
        if (input.time?.archived) draft.time.archived = input.time.archived
      })
    },

    async delete(id: string): Promise<void> {
      await Session.delete(id)
    },

    async fork(id: string, messageID?: string): Promise<Session.Info> {
      return Session.fork({ sessionID: id, messageID })
    },
  }

  message = {
    async list(sessionID: string, options?: MessageListOptions): Promise<MessageV2.WithParts[]> {
      return MessageV2.list({
        sessionID,
        limit: options?.limit,
        assistantMessageID: options?.assistantMessageID,
      })
    },

    async get(sessionID: string, messageID: string): Promise<MessageV2.WithParts> {
      return MessageV2.load(messageID)
    },

    async *create(sessionID: string, input: MessageCreateInput): AsyncIterable<MessageV2.WithParts> {
      // 使用 OpenCode 的 prompt 流程
      const result = await SessionPrompt.prompt({
        sessionID,
        parts: input.parts,
        model: input.model,
        agent: input.agent,
      })
      yield result
    },

    async update(sessionID: string, messageID: string, input: MessageUpdateInput): Promise<MessageV2.WithParts> {
      const message = await MessageV2.load(messageID)
      const updated = {
        ...message.info,
        ...input,
      }
      await Session.updateMessage(updated)
      return MessageV2.load(messageID)
    },

    async delete(sessionID: string, messageID: string): Promise<void> {
      await Session.deleteMessage(sessionID, messageID)
    },
  }

  events = {
    async *subscribe(sessionID?: string): AsyncIterable<BusEvent> {
      const queue: BusEvent[] = []
      const listeners = new Set<(event: BusEvent) => void>()

      const unsubscribe = Bus.subscribeAll((event) => {
        if (sessionID && (event.properties as any).sessionID !== sessionID) {
          return
        }
        queue.push(event)
        listeners.forEach((fn) => fn(event))
      })

      try {
        while (true) {
          if (queue.length > 0) {
            yield queue.shift()!
          } else {
            await new Promise<BusEvent>((resolve) => {
              listeners.add(resolve)
            })
          }
        }
      } finally {
        unsubscribe()
      }
    },
  }

  permission = {
    async list(): Promise<PermissionNext.Request[]> {
      return PermissionNext.list()
    },

    async reply(requestID: string, reply: "once" | "always" | "reject"): Promise<void> {
      await PermissionNext.reply({ requestID, reply })
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
}

// 需要导入 SessionPrompt
import { SessionPrompt } from "../opencode/session/prompt"
