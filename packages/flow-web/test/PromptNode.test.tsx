import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReactFlowProvider } from "@xyflow/react"
import { PromptNode } from "../src/components/graph/nodes/PromptNode"

describe("PromptNode", () => {
  const defaultProps = {
    id: "test-node",
    type: "prompt",
    position: { x: 0, y: 0 },
    data: {
      label: "测试节点",
      description: "测试描述",
      status: "idle" as const,
    },
    selected: false,
    zIndex: 0,
    dragging: false,
  }

  it("应该渲染节点", () => {
    const { container } = render(
      <ReactFlowProvider>
        <PromptNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(container.querySelector(".node-prompt")).toBeInTheDocument()
  })

  it("应该显示标签", () => {
    render(
      <ReactFlowProvider>
        <PromptNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(screen.getByText("测试节点")).toBeInTheDocument()
  })

  it("应该显示描述", () => {
    render(
      <ReactFlowProvider>
        <PromptNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(screen.getByText("测试描述")).toBeInTheDocument()
  })

  it("应该显示状态", () => {
    render(
      <ReactFlowProvider>
        <PromptNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(screen.getByText("idle")).toBeInTheDocument()
  })

  it("应该渲染 Handle 组件", () => {
    const { container } = render(
      <ReactFlowProvider>
        <PromptNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    const handles = container.querySelectorAll(".react-flow__handle")
    expect(handles.length).toBe(2) // target 和 source
  })

  it("应该支持不同状态", () => {
    const statuses = ["idle", "running", "completed", "error"] as const

    statuses.forEach((status) => {
      const { container, rerender } = render(
        <ReactFlowProvider>
          <PromptNode {...defaultProps} data={{ ...defaultProps.data, status }} />
        </ReactFlowProvider>,
      )

      const node = container.querySelector(".node-prompt")
      expect(node).toBeInTheDocument()
      expect(screen.getByText(status)).toBeInTheDocument()

      rerender(null)
    })
  })

  it("应该不显示描述当描述为空", () => {
    render(
      <ReactFlowProvider>
        <PromptNode {...defaultProps} data={{ ...defaultProps.data, description: undefined }} />
      </ReactFlowProvider>,
    )

    expect(screen.queryByText("测试描述")).not.toBeInTheDocument()
  })
})
