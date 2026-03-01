import { describe, test, expect } from "bun:test"
import { OpenCodeClient } from "../src/opencode-client"

describe("OpenCodeClient", () => {
  test("should create client with config", () => {
    const client = new OpenCodeClient({
      baseUrl: "http://localhost:4096",
      username: "opencode",
      password: "test",
    })

    expect(client).toBeDefined()
  })

  test("should create client with API key", () => {
    const client = new OpenCodeClient({
      baseUrl: "http://localhost:4096",
      apiKey: "test-key",
    })

    expect(client).toBeDefined()
  })
})
