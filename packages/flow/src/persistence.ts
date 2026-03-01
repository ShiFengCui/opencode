import { BaseCheckpointSaver, type Checkpoint, type CheckpointMetadata } from "@langchain/langgraph"
import { RunnableConfig } from "@langchain/core/runnables"
import { writeFile, readFile, mkdir, readdir, unlink } from "fs/promises"
import { join } from "path"

export interface FileSaverConfig {
  directory: string
}

/**
 * 文件存储实现
 * 使用文件系统保存图状态
 */
export class FileSaver extends BaseCheckpointSaver {
  private directory: string

  constructor(config: FileSaverConfig) {
    super()
    this.directory = config.directory
  }

  /**
   * 获取存储路径
   */
  private getFilePath(namespace: string, key: string): string {
    return join(this.directory, namespace, `${key}.json`)
  }

  /**
   * 获取目录路径
   */
  private getDirPath(namespace: string): string {
    return join(this.directory, namespace)
  }

  /**
   * 确保目录存在
   */
  private async ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true })
  }

  /**
   * 获取检查点
   */
  async getTuple(
    config: RunnableConfig,
  ): Promise<{ checkpoint: Checkpoint; metadata: CheckpointMetadata } | undefined> {
    const namespace = config.configurable?.namespace || "default"
    const key = config.configurable?.checkpoint_id || "latest"
    const filePath = this.getFilePath(namespace, key)

    try {
      const data = await readFile(filePath, "utf-8")
      return JSON.parse(data)
    } catch (error) {
      // 文件不存在或读取失败
      return undefined
    }
  }

  /**
   * 保存检查点
   */
  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
    const namespace = config.configurable?.namespace || "default"
    const key = checkpoint.id
    const filePath = this.getFilePath(namespace, key)

    await this.ensureDir(this.getDirPath(namespace))

    const data = JSON.stringify({ checkpoint, metadata }, null, 2)
    await writeFile(filePath, data, "utf-8")

    console.log(`[FileSaver] Saved checkpoint: ${namespace}/${key}`)

    return {
      ...config,
      configurable: {
        ...config.configurable,
        checkpoint_id: key,
      },
    }
  }

  /**
   * 删除检查点
   */
  async remove(config: RunnableConfig): Promise<void> {
    const namespace = config.configurable?.namespace || "default"
    const key = config.configurable?.checkpoint_id

    if (!key) return

    const filePath = this.getFilePath(namespace, key)

    try {
      await unlink(filePath)
      console.log(`[FileSaver] Removed checkpoint: ${namespace}/${key}`)
    } catch (error) {
      console.warn(`[FileSaver] Failed to remove checkpoint:`, error)
    }
  }

  /**
   * 列出所有检查点
   */
  async list(namespace: string): Promise<string[]> {
    const dirPath = this.getDirPath(namespace)

    try {
      const files = await readdir(dirPath)
      return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""))
    } catch (error) {
      return []
    }
  }

  /**
   * 获取最新检查点
   */
  async getLatest(namespace: string): Promise<{ checkpoint: Checkpoint; metadata: CheckpointMetadata } | undefined> {
    const keys = await this.list(namespace)
    if (keys.length === 0) return undefined

    // 按时间排序，返回最新的
    const latest = keys.sort().pop()
    if (!latest) return undefined

    return this.getTuple({
      configurable: {
        namespace,
        checkpoint_id: latest,
      },
    })
  }
}
