import React from "react"
import ReactDOM from "react-dom/client"
import { GraphPlayground } from "./components/graph/GraphPlayground"
import "./index.css"

// 示例 sessionID，实际使用时从路由或配置获取
const SESSION_ID = "session_" + Date.now()

function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }}>
      <GraphPlayground sessionID={SESSION_ID} />
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
