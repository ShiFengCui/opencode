// Flow Package Entry Point
import { createServer } from "./server"
import { loadConfig } from "./config"

async function main() {
  const config = await loadConfig()
  const app = createServer()

  console.log(`[Flow] Starting server on ${config.server.hostname}:${config.server.port}`)
  console.log(`[Flow] OpenCode Base URL: ${config.opencode.baseUrl}`)

  const server = {
    port: config.server.port,
    hostname: config.server.hostname,
    fetch: app.fetch,
  }

  console.log(`[Flow] Server ready at http://${config.server.hostname}:${config.server.port}`)
  console.log(`[Flow] Health check: http://${config.server.hostname}:${config.server.port}/health`)

  return server
}

// 开发模式热重载
if (process.env.NODE_ENV !== "production") {
  main().catch(console.error)
}

export default await main()
