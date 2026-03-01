import React, { useState, useEffect } from "react"
import type { GraphNode } from "../types"

interface NodeConfigPanelProps {
  node: GraphNode | null
  onClose: () => void
  onSave: (node: GraphNode) => void
}

export function NodeConfigPanel({ node, onClose, onSave }: NodeConfigPanelProps) {
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [config, setConfig] = useState<Record<string, any>>({})

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || "")
      setDescription(node.data.description || "")
      setConfig(node.data.config || {})
    }
  }, [node])

  const handleSave = () => {
    if (!node) return

    onSave({
      ...node,
      data: {
        ...node.data,
        label,
        description,
        config,
      },
    })
  }

  if (!node) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Node Configuration</h3>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {/* 基本信息 */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Basic Info</h4>

            <div style={styles.formGroup}>
              <label style={styles.label}>Node ID</label>
              <input type="text" value={node.id} disabled style={styles.inputDisabled} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Type</label>
              <input type="text" value={node.type} disabled style={styles.inputDisabled} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={styles.input}
                placeholder="Node label"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.textarea}
                placeholder="Node description"
                rows={3}
              />
            </div>
          </div>

          {/* 节点特定配置 */}
          {node.type === "llm" && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>LLM Configuration</h4>

              <div style={styles.formGroup}>
                <label style={styles.label}>Provider</label>
                <select
                  value={config.provider || "anthropic"}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                  style={styles.select}
                >
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="google">Google</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Model</label>
                <input
                  type="text"
                  value={config.model || ""}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  style={styles.input}
                  placeholder="claude-sonnet-4-20250514"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Temperature</label>
                <input
                  type="number"
                  value={config.temperature || 0.7}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  style={styles.input}
                  step={0.1}
                  min={0}
                  max={1}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Max Tokens</label>
                <input
                  type="number"
                  value={config.maxTokens || 4096}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                  style={styles.input}
                />
              </div>
            </div>
          )}

          {node.type === "prompt" && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Prompt Configuration</h4>

              <div style={styles.formGroup}>
                <label style={styles.label}>System Prompt</label>
                <textarea
                  value={config.systemPrompt || ""}
                  onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                  style={styles.textarea}
                  placeholder="You are a helpful assistant..."
                  rows={5}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Agent</label>
                <select
                  value={config.agent || "build"}
                  onChange={(e) => setConfig({ ...config, agent: e.target.value })}
                  style={styles.select}
                >
                  <option value="build">Build</option>
                  <option value="plan">Plan</option>
                </select>
              </div>
            </div>
          )}

          {node.type === "tool" && (
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Tool Configuration</h4>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tool Name</label>
                <input
                  type="text"
                  value={config.toolName || ""}
                  onChange={(e) => setConfig({ ...config, toolName: e.target.value })}
                  style={styles.input}
                  placeholder="Bash, Read, Edit..."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Timeout (ms)</label>
                <input
                  type="number"
                  value={config.timeout || 120000}
                  onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
                  style={styles.input}
                />
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={handleSave} style={styles.saveButton}>
            Save Changes
          </button>
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
    width: "500px",
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
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "4px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#6b7280",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
  },
  inputDisabled: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    fontSize: "14px",
    background: "#f9fafb",
    color: "#9ca3af",
  },
  textarea: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
    resize: "vertical",
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    fontSize: "14px",
  },
  footer: {
    padding: "16px 20px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  cancelButton: {
    padding: "8px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: "white",
    cursor: "pointer",
    fontSize: "14px",
  },
  saveButton: {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    background: "#10b981",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
}
