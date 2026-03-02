/**
 * Flow 配置适配器
 *
 * 将 OpenCode 的配置调用适配到 Flow 的独立配置
 */

export const FlowAdapter = {
  /**
   * 配置键映射
   */
  config: {
    // OpenCode 配置键 -> Flow 配置键
    "opencode.baseURL": "FLOW_OPENCODE_BASE_URL",
    "opencode.password": "FLOW_OPENCODE_PASSWORD",
    "opencode.username": "FLOW_OPENCODE_USERNAME",
    "anthropic.apiKey": "FLOW_ANTHROPIC_API_KEY",
    "openai.apiKey": "FLOW_OPENAI_API_KEY",
    "google.apiKey": "FLOW_GOOGLE_API_KEY",
    "state.dir": "FLOW_STATE_DIR",
  },

  /**
   * 获取配置值
   */
  get(key: string, defaultValue?: string): string | undefined {
    const flowKey = this.config[key as keyof typeof this.config] || key
    return process.env[flowKey] || defaultValue
  },

  /**
   * 获取状态目录
   */
  getStateDir(): string {
    return process.env.FLOW_STATE_DIR || "./.flow-state"
  },

  /**
   * 获取配置目录
   */
  getConfigDir(): string {
    return process.env.FLOW_CONFIG_DIR || "./.flow-config"
  },

  /**
   * 适配存储路径
   */
  adaptPath(originalPath: string): string {
    // 将 ~/.opencode 替换为 flow 的状态目录
    const stateDir = this.getStateDir()
    return originalPath.replace("~/.opencode", stateDir).replace("/home/devbox/.opencode", stateDir)
  },

  /**
   * 日志前缀
   */
  logPrefix(service: string): string {
    return `[Flow:${service}]`
  },
}

/**
 * 适配后的日志函数
 */
export const LogAdapter = {
  info(service: string, message: string, extra?: any) {
    console.log(`${FlowAdapter.logPrefix(service)} ${message}`, extra || "")
  },

  error(service: string, message: string, error?: any) {
    console.error(`${FlowAdapter.logPrefix(service)} ${message}`, error || "")
  },

  warn(service: string, message: string, extra?: any) {
    console.warn(`${FlowAdapter.logPrefix(service)} ${message}`, extra || "")
  },

  debug(service: string, message: string, extra?: any) {
    if (process.env.DEBUG) {
      console.debug(`${FlowAdapter.logPrefix(service)} ${message}`, extra || "")
    }
  },
}

/**
 * 全局适配器实例
 */
export default FlowAdapter
