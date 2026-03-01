import React, { useState } from "react"
import { graphTemplateManager, type GraphTemplate } from "../api/templates"
import type { GraphConfig } from "../types"

interface TemplateManagerProps {
  onApplyTemplate: (config: GraphConfig) => void
  onClose: () => void
}

export function TemplateManager({ onApplyTemplate, onClose }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<GraphTemplate[]>(graphTemplateManager.getAllTemplates())
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState("")

  const handleRefresh = () => {
    setTemplates(graphTemplateManager.getAllTemplates())
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      graphTemplateManager.deleteTemplate(id)
      handleRefresh()
    }
  }

  const handleExport = (template: GraphTemplate) => {
    const json = graphTemplateManager.exportTemplate(template.id)
    if (json) {
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${template.name.replace(/\s+/g, "-").toLowerCase()}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleApply = (template: GraphTemplate) => {
    const config = graphTemplateManager.applyTemplate(template.id)
    if (config) {
      onApplyTemplate(config)
      onClose()
    }
  }

  const handleImport = () => {
    if (!importJson.trim()) return

    const template = graphTemplateManager.importTemplate(importJson)
    if (template) {
      handleRefresh()
      setShowImport(false)
      setImportJson("")
      alert("Template imported successfully!")
    } else {
      alert("Failed to import template. Please check the JSON format.")
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Graph Templates</h3>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.toolbar}>
          <button onClick={handleRefresh} style={styles.button}>
            🔄 Refresh
          </button>
          <button onClick={() => setShowImport(!showImport)} style={styles.button}>
            📥 Import
          </button>
        </div>

        {showImport && (
          <div style={styles.importSection}>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste template JSON here..."
              style={styles.importTextarea}
              rows={8}
            />
            <div style={styles.importButtons}>
              <button onClick={handleImport} style={styles.importButton}>
                Import Template
              </button>
              <button onClick={() => setShowImport(false)} style={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={styles.templateList}>
          {templates.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No templates yet.</p>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>
                Create a graph and save it as a template from the Graph Editor.
              </p>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} style={styles.templateItem}>
                <div style={styles.templateInfo}>
                  <h4 style={styles.templateName}>{template.name}</h4>
                  {template.description && <p style={styles.templateDescription}>{template.description}</p>}
                  <div style={styles.templateMeta}>
                    <span style={styles.metaItem}>📅 {new Date(template.updatedAt).toLocaleDateString()}</span>
                    <span style={styles.metaItem}>🔢 {template.config.nodes.length} nodes</span>
                  </div>
                </div>
                <div style={styles.templateActions}>
                  <button
                    onClick={() => handleApply(template)}
                    style={{ ...styles.actionButton, background: "#10b981", color: "white" }}
                  >
                    Apply
                  </button>
                  <button onClick={() => handleExport(template)} style={styles.actionButton}>
                    Export
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    style={{ ...styles.actionButton, background: "#ef4444", color: "white" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  panel: {
    background: "white",
    borderRadius: "8px",
    width: "700px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#6b7280",
  },
  toolbar: {
    padding: "12px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    gap: "8px",
  },
  button: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: "white",
    cursor: "pointer",
    fontSize: "13px",
  },
  importSection: {
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
  },
  importTextarea: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "13px",
    fontFamily: "monospace",
    resize: "vertical",
  },
  importButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  importButton: {
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    background: "#10b981",
    color: "white",
    cursor: "pointer",
    fontSize: "13px",
  },
  cancelButton: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: "white",
    cursor: "pointer",
    fontSize: "13px",
  },
  templateList: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#6b7280",
  },
  templateItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    marginBottom: "12px",
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    margin: "0 0 4px 0",
    fontSize: "16px",
    fontWeight: "600",
  },
  templateDescription: {
    margin: "0 0 8px 0",
    fontSize: "13px",
    color: "#6b7280",
  },
  templateMeta: {
    display: "flex",
    gap: "16px",
    fontSize: "12px",
    color: "#9ca3af",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  templateActions: {
    display: "flex",
    gap: "8px",
  },
  actionButton: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: "white",
    cursor: "pointer",
    fontSize: "13px",
  },
}
