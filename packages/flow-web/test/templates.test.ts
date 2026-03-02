import { describe, it, expect, beforeEach } from "vitest"
import { graphTemplateManager, type GraphTemplate } from "../src/api/templates"

describe("GraphTemplateManager", () => {
  const mockConfig = {
    id: "test-graph",
    name: "Test Graph",
    nodes: [],
    edges: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  beforeEach(() => {
    // 清空模板
    graphTemplateManager.clearAll()
  })

  describe("createTemplate", () => {
    it("应该创建模板", () => {
      const template = graphTemplateManager.createTemplate("Test Template", mockConfig as any, "Test description")

      expect(template).toBeDefined()
      expect(template.id).toBeDefined()
      expect(template.name).toBe("Test Template")
      expect(template.description).toBe("Test description")
    })

    it("应该生成唯一 ID", () => {
      const template1 = graphTemplateManager.createTemplate("Template 1", mockConfig as any)
      const template2 = graphTemplateManager.createTemplate("Template 2", mockConfig as any)

      expect(template1.id).not.toBe(template2.id)
    })
  })

  describe("getTemplate", () => {
    it("应该获取模板", () => {
      const template = graphTemplateManager.createTemplate("Test", mockConfig as any)
      const retrieved = graphTemplateManager.getTemplate(template.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(template.id)
    })

    it("应该返回 undefined 当模板不存在", () => {
      const retrieved = graphTemplateManager.getTemplate("non-existent")

      expect(retrieved).toBeUndefined()
    })
  })

  describe("getAllTemplates", () => {
    it("应该返回所有模板", () => {
      graphTemplateManager.createTemplate("Template 1", mockConfig as any)
      graphTemplateManager.createTemplate("Template 2", mockConfig as any)

      const templates = graphTemplateManager.getAllTemplates()

      expect(templates.length).toBe(2)
    })

    it("应该返回空数组当没有模板", () => {
      const templates = graphTemplateManager.getAllTemplates()

      expect(templates).toEqual([])
    })
  })

  describe("updateTemplate", () => {
    it("应该更新模板", () => {
      const template = graphTemplateManager.createTemplate("Test", mockConfig as any)
      const updated = graphTemplateManager.updateTemplate(template.id, {
        name: "Updated Name",
      })

      expect(updated?.name).toBe("Updated Name")
    })

    it("应该返回 undefined 当模板不存在", () => {
      const updated = graphTemplateManager.updateTemplate("non-existent", {
        name: "Updated",
      })

      expect(updated).toBeUndefined()
    })
  })

  describe("deleteTemplate", () => {
    it("应该删除模板", () => {
      const template = graphTemplateManager.createTemplate("Test", mockConfig as any)
      const deleted = graphTemplateManager.deleteTemplate(template.id)

      expect(deleted).toBe(true)
      expect(graphTemplateManager.getTemplate(template.id)).toBeUndefined()
    })

    it("应该返回 false 当模板不存在", () => {
      const deleted = graphTemplateManager.deleteTemplate("non-existent")

      expect(deleted).toBe(false)
    })
  })

  describe("applyTemplate", () => {
    it("应该应用模板", () => {
      const template = graphTemplateManager.createTemplate("Test", mockConfig as any)
      const config = graphTemplateManager.applyTemplate(template.id)

      expect(config).toBeDefined()
      expect(config?.nodes).toEqual(mockConfig.nodes)
      expect(config?.edges).toEqual(mockConfig.edges)
    })

    it("应该生成新的 ID", () => {
      const template = graphTemplateManager.createTemplate("Test", mockConfig as any)
      const config = graphTemplateManager.applyTemplate(template.id)

      expect(config?.id).not.toBe(mockConfig.id)
    })
  })

  describe("exportTemplate", () => {
    it("应该导出模板为 JSON", () => {
      const template = graphTemplateManager.createTemplate("Test", mockConfig as any)
      const json = graphTemplateManager.exportTemplate(template.id)

      expect(json).toBeDefined()
      expect(() => JSON.parse(json!)).not.toThrow()
    })

    it("应该返回 undefined 当模板不存在", () => {
      const json = graphTemplateManager.exportTemplate("non-existent")

      expect(json).toBeUndefined()
    })
  })

  describe("importTemplate", () => {
    it("应该导入模板", () => {
      const template = graphTemplateManager.createTemplate("Test", mockConfig as any)
      const json = graphTemplateManager.exportTemplate(template.id)!
      const imported = graphTemplateManager.importTemplate(json)

      expect(imported).toBeDefined()
      expect(imported?.name).toBe("Test")
    })

    it("应该返回 undefined 当 JSON 无效", () => {
      const imported = graphTemplateManager.importTemplate("invalid json")

      expect(imported).toBeUndefined()
    })
  })

  describe("clearAll", () => {
    it("应该清空所有模板", () => {
      graphTemplateManager.createTemplate("Template 1", mockConfig as any)
      graphTemplateManager.createTemplate("Template 2", mockConfig as any)

      graphTemplateManager.clearAll()

      expect(graphTemplateManager.getAllTemplates()).toEqual([])
    })
  })
})
