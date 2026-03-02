import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReactFlowProvider } from "@xyflow/react"
import { LLMNode } from "../src/components/graph/nodes/LLMNode"

describe("LLMNode", () => {
  const defaultProps = {
    id: "test-llm",
    type: "llm",
    position: { x: 0, y: 0 },
    data: {
      label: "AI 模型调用",
      description: "调用 AI 模型",
      status: "idle" as const,
    },
    selected: false,
    zIndex: 0,
    dragging: false,
  }

  it("应该渲染 LLM 节点", () => {
    const { container } = render(
      <ReactFlowProvider>
        <LLMNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(container.querySelector(".node-llm")).toBeInTheDocument()
  })

  it("应该显示标签", () => {
    render(
      <ReactFlowProvider>
        <LLMNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(screen.getByText("AI 模型调用")).toBeInTheDocument()
  })

  it("应该显示机器人图标", () => {
    const { container } = render(
      <ReactFlowProvider>
        <LLMNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(container.querySelector(".node-llm")).toContainHTML("🤖")
  })

  it("应该支持不同状态", () => {
    const statuses = ["idle", "running", "completed", "error"]

    statuses.forEach((status) => {
      const { container, rerender } = render(
        <ReactFlowProvider>
          <LLMNode {...defaultProps} data={{ ...defaultProps.data, status: status as any }} />
        </ReactFlowProvider>,
      )

      expect(container.querySelector(".node-llm")).toBeInTheDocument()
      expect(screen.getByText(status)).toBeInTheDocument()

      rerender(null)
    })
  })
})
