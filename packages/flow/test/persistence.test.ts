import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { FileSaver } from "../src/persistence"
import { mkdir, rm } from "fs/promises"
import { join } from "path"

describe("FileSaver", () => {
  const testDir = join(process.cwd(), ".flow-state-test")

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  test("should save and get checkpoint", async () => {
    const saver = new FileSaver({ directory: testDir })

    const checkpoint = {
      id: "test-checkpoint-1",
      channelValues: { test: "data" },
      channelVersions: {},
      versions: {},
    }

    const metadata = {
      source: "test",
      step: 1,
      timestamp: Date.now(),
    }

    const config = {
      configurable: {
        namespace: "test-session",
        checkpoint_id: "test-checkpoint-1",
      },
    }

    // 保存
    const result = await saver.put(config, checkpoint, metadata)

    expect(result.configurable.checkpoint_id).toBe("test-checkpoint-1")

    // 获取
    const retrieved = await saver.getTuple(config)

    expect(retrieved).toBeDefined()
    expect(retrieved?.checkpoint.id).toBe("test-checkpoint-1")
    expect(retrieved?.metadata.source).toBe("test")
  })

  test("should return undefined for non-existent checkpoint", async () => {
    const saver = new FileSaver({ directory: testDir })

    const config = {
      configurable: {
        namespace: "non-existent",
        checkpoint_id: "not-found",
      },
    }

    const retrieved = await saver.getTuple(config)

    expect(retrieved).toBeUndefined()
  })

  test("should list checkpoints", async () => {
    const saver = new FileSaver({ directory: testDir })

    // 保存多个检查点
    for (let i = 0; i < 3; i++) {
      await saver.put(
        {
          configurable: {
            namespace: "test-list",
            checkpoint_id: `checkpoint-${i}`,
          },
        },
        {
          id: `checkpoint-${i}`,
          channelValues: {},
          channelVersions: {},
          versions: {},
        },
        { source: "test", step: i, timestamp: Date.now() },
      )
    }

    const checkpoints = await saver.list("test-list")

    expect(checkpoints.length).toBe(3)
    expect(checkpoints).toContain("checkpoint-0")
    expect(checkpoints).toContain("checkpoint-1")
    expect(checkpoints).toContain("checkpoint-2")
  })

  test("should get latest checkpoint", async () => {
    const saver = new FileSaver({ directory: testDir })

    // 保存多个检查点
    for (let i = 0; i < 3; i++) {
      await saver.put(
        {
          configurable: {
            namespace: "test-latest",
            checkpoint_id: `checkpoint-${i.toString().padStart(3, "0")}`,
          },
        },
        {
          id: `checkpoint-${i.toString().padStart(3, "0")}`,
          channelValues: {},
          channelVersions: {},
          versions: {},
        },
        { source: "test", step: i, timestamp: Date.now() },
      )
    }

    const latest = await saver.getLatest("test-latest")

    expect(latest).toBeDefined()
    expect(latest?.checkpoint.id).toBe("checkpoint-002")
  })

  test("should remove checkpoint", async () => {
    const saver = new FileSaver({ directory: testDir })

    const config = {
      configurable: {
        namespace: "test-remove",
        checkpoint_id: "to-remove",
      },
    }

    // 保存
    await saver.put(
      config,
      {
        id: "to-remove",
        channelValues: {},
        channelVersions: {},
        versions: {},
      },
      { source: "test", step: 0, timestamp: Date.now() },
    )

    // 删除
    await saver.remove(config)

    // 验证已删除
    const retrieved = await saver.getTuple(config)
    expect(retrieved).toBeUndefined()
  })
})
