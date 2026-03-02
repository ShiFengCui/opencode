/**
 * Flow 服务器入口
 */
import { createServer } from "./server"
import { FlowConfig } from "./flow-config"

async function main() {
  const app = createServer()

  const port = FlowConfig.server.port
  const hostname = FlowConfig.server.hostname

  console.log("=".repeat(60))
  console.log("Flow Server Starting...")
  console.log("=".repeat(60))
  console.log()
  console.log(`Port: ${port}`)
  console.log(`Hostname: ${hostname}`)
  console.log()
  console.log("Endpoints:")
  console.log(`  Health:       http://${hostname}:${port}/health`)
  console.log(`  Protocol:     http://${hostname}:${port}/session`)
  console.log(`  Events:       http://${hostname}:${port}/event`)
  console.log(`  Flow Graph:   http://${hostname}:${port}/flow/graph`)
  console.log()
  console.log("Adapters:")
  console.log("  - opencode (default)")
  console.log("  - flow")
  console.log()
  console.log("=".repeat(60))

  const server = {
    port,
    hostname,
    fetch: app.fetch,
  }

  return server
}

// 开发模式
if (process.env.NODE_ENV !== "production") {
  main().catch(console.error)
}

export default await main()
