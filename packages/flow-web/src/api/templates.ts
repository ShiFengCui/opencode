import type { GraphConfig } from "../types"

const STORAGE_KEY = "flow-graph-templates"

export interface GraphTemplate {
  id: string
  name: string
  description?: string
  config: GraphConfig
  createdAt: number
  updatedAt: number
}

/**
 * 图模板管理
 */
export class GraphTemplateManager {
  private static instance: GraphTemplateManager
  private templates: Map<string, GraphTemplate> = new Map()

  private constructor() {
    this.loadFromStorage()
  }

  static getInstance(): GraphTemplateManager {
    if (!GraphTemplateManager.instance) {
      GraphTemplateManager.instance = new GraphTemplateManager()
    }
    return GraphTemplateManager.instance
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const templates = JSON.parse(data)
        templates.forEach((t: GraphTemplate) => {
          this.templates.set(t.id, t)
        })
        console.log(`[Template] Loaded ${this.templates.size} templates from storage`)
      }
    } catch (error) {
      console.error("[Template] Failed to load from storage:", error)
    }
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage() {
    try {
      const data = JSON.stringify(Array.from(this.templates.values()))
      localStorage.setItem(STORAGE_KEY, data)
      console.log(`[Template] Saved ${this.templates.size} templates to storage`)
    } catch (error) {
      console.error("[Template] Failed to save to storage:", error)
    }
  }

  /**
   * 创建模板
   */
  createTemplate(name: string, config: GraphConfig, description?: string): GraphTemplate {
    const template: GraphTemplate = {
      id: `template-${Date.now()}`,
      name,
      description,
      config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.templates.set(template.id, template)
    this.saveToStorage()

    console.log(`[Template] Created template: ${template.id}`)
    return template
  }

  /**
   * 获取模板
   */
  getTemplate(id: string): GraphTemplate | undefined {
    return this.templates.get(id)
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): GraphTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<GraphTemplate>): GraphTemplate | undefined {
    const template = this.templates.get(id)
    if (!template) return undefined

    const updated = {
      ...template,
      ...updates,
      updatedAt: Date.now(),
    }

    this.templates.set(id, updated)
    this.saveToStorage()

    console.log(`[Template] Updated template: ${id}`)
    return updated
  }

  /**
   * 删除模板
   */
  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id)
    if (deleted) {
      this.saveToStorage()
      console.log(`[Template] Deleted template: ${id}`)
    }
    return deleted
  }

  /**
   * 应用模板
   */
  applyTemplate(id: string): GraphConfig | undefined {
    const template = this.templates.get(id)
    if (!template) return undefined

    console.log(`[Template] Applied template: ${id}`)
    return {
      ...template.config,
      id: `graph-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  /**
   * 导出模板
   */
  exportTemplate(id: string): string | undefined {
    const template = this.templates.get(id)
    if (!template) return undefined

    return JSON.stringify(template, null, 2)
  }

  /**
   * 导入模板
   */
  importTemplate(json: string): GraphTemplate | undefined {
    try {
      const template = JSON.parse(json) as GraphTemplate
      if (!template.id || !template.name || !template.config) {
        throw new Error("Invalid template format")
      }

      this.templates.set(template.id, template)
      this.saveToStorage()

      console.log(`[Template] Imported template: ${template.id}`)
      return template
    } catch (error) {
      console.error("[Template] Failed to import template:", error)
      return undefined
    }
  }

  /**
   * 清空所有模板
   */
  clearAll(): void {
    this.templates.clear()
    localStorage.removeItem(STORAGE_KEY)
    console.log("[Template] Cleared all templates")
  }
}

// 导出单例
export const graphTemplateManager = GraphTemplateManager.getInstance()
