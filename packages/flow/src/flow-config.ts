/**
 * Flow 全局配置
 *
 * 所有 Flow 特定的配置都在这里
 */

export const FlowConfig = {
  /**
   * 服务配置
   */
  server: {
    port: parseInt(process.env.FLOW_PORT || process.env.PORT || "4097"),
    hostname: process.env.FLOW_HOSTNAME || "0.0.0.0",
  },

  /**
   * 状态存储配置
   */
  state: {
    directory: process.env.FLOW_STATE_DIR || "./.flow-state",
  },

  /**
   * AI 提供商配置
   */
  providers: {
    anthropic: {
      apiKey: process.env.FLOW_ANTHROPIC_API_KEY,
      enabled: !!process.env.FLOW_ANTHROPIC_API_KEY,
    },
    openai: {
      apiKey: process.env.FLOW_OPENAI_API_KEY,
      enabled: !!process.env.FLOW_OPENAI_API_KEY,
    },
    google: {
      apiKey: process.env.FLOW_GOOGLE_API_KEY,
      enabled: !!process.env.FLOW_GOOGLE_API_KEY,
    },
  },

  /**
   * 工具配置
   */
  tools: {
    bash: {
      enabled: true,
      timeout: parseInt(process.env.FLOW_BASH_TIMEOUT || "120000"),
    },
    read: {
      enabled: true,
      maxLines: parseInt(process.env.FLOW_READ_MAX_LINES || "2000"),
    },
    write: {
      enabled: true,
    },
    edit: {
      enabled: true,
    },
    grep: {
      enabled: true,
    },
    glob: {
      enabled: true,
    },
  },

  /**
   * 权限配置
   */
  permissions: {
    default: (process.env.FLOW_PERMISSION_DEFAULT || "ask") as "ask" | "allow" | "deny",
    rules: [],
  },

  /**
   * LLM 配置
   */
  llm: {
    defaultProvider: process.env.FLOW_LLM_DEFAULT_PROVIDER || "anthropic",
    defaultModel: process.env.FLOW_LLM_DEFAULT_MODEL || "claude-sonnet-4-20250514",
    temperature: parseFloat(process.env.FLOW_LLM_TEMPERATURE || "0.7"),
    maxTokens: parseInt(process.env.FLOW_LLM_MAX_TOKENS || "4096"),
  },

  /**
   * 日志配置
   */
  logging: {
    level: process.env.FLOW_LOG_LEVEL || "info",
    format: "json",
  },
}

export type FlowConfig = typeof FlowConfig
