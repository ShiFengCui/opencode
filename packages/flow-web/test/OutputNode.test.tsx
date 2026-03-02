import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReactFlowProvider } from "@xyflow/react"
import { OutputNode } from "../src/components/graph/nodes/OutputNode"

describe("OutputNode", () => {
  const defaultProps = {
    id: "test-output",
    type: "output",
    position: { x: 0, y: 0 },
    data: {
      label: "结果输出",
      description: "输出结果",
      status: "idle" as const,
    },
    selected: false,
    zIndex: 0,
    dragging: false,
  }

  it("应该渲染 Output 节点", () => {
    const { container } = render(
      <ReactFlowProvider>
        <OutputNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(container.querySelector(".node-output")).toBeInTheDocument()
  })

  it("应该显示标签", () => {
    render(
      <ReactFlowProvider>
        <OutputNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(screen.getByText("结果输出")).toBeInTheDocument()
  })

  it("应该显示完成图标", () => {
    const { container } = render(
      <ReactFlowProvider>
        <OutputNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    expect(container.querySelector(".node-output")).toContainHTML("✅")
  })

  it("应该只有 target Handle（没有 source）", () => {
    const { container } = render(
      <ReactFlowProvider>
        <OutputNode {...defaultProps} />
      </ReactFlowProvider>,
    )

    // Output 节点应该只有 target Handle
    const handles = container.querySelectorAll(".react-flow__handle")
    expect(handles.length).toBe(1)
  })
})
