import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReactFlowProvider } from "@xyflow/react"
import { ToolNode } from "../src/components/graph/nodes/ToolNode"

describe("ToolNode", () => {
  const defaultProps = {
    id: "test-tool",
    type: "tool",
    position: { x: 0, y: 0 },
    data: {
      label: "工具执行",
      description: "执行工具",
      status: "idle" as const,
    },
    selected: false,
    zIndex: 0,
    dragging: false,
  }

  it("应该渲染 Tool 节点", () => {
    const { container } = render(
      <ReactFlowProvider>
        <ToolNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(container.querySelector(".node-tool")).toBeInTheDocument()
  })

  it("应该显示标签", () => {
    render(
      <ReactFlowProvider>
        <ToolNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(screen.getByText("工具执行")).toBeInTheDocument()
  })

  it("应该显示工具图标", () => {
    const { container } = render(
      <ReactFlowProvider>
        <ToolNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(container.querySelector(".node-tool")).toContainHTML("🔧")
  })
})
