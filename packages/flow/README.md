# @opencode-ai/flow

LangGraph-based workflow engine for OpenCode.

## Features

- Visual workflow definition using LangGraph
- Integration with OpenCode via HTTP API
- File-based state persistence (no database required)
- React Flow visualization support (planned)

## Quick Start

```bash
# Copy environment file
cp .env.example .env

# Edit .env and set your API keys
# ANTHROPIC_API_KEY=your-key

# Development
bun run dev

# Build
bun run build

# Test
bun test
```

## Configuration

Set environment variables in `.env`:

```bash
# OpenCode API
OPENCODE_BASE_URL=http://localhost:4096
OPENCODE_SERVER_PASSWORD=your-password

# AI Provider
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Server
PORT=4097

# File Storage (default: ./.flow-state)
FLOW_STATE_DIR=./.flow-state
```

## API Endpoints

- `GET /health` - Health check
- `POST /graph/start` - Start graph execution
- `GET /graph/:sessionID/status` - Get graph status
- `GET /graph/:sessionID/history` - Get execution history
- `POST /graph/:sessionID/feedback` - Send user feedback
- `POST /graph/:sessionID/stop` - Stop execution
- `DELETE /graph/:sessionID` - Delete graph data

## File Storage

State is persisted to filesystem in `.flow-state/` directory:

```
.flow-state/
└── session_xxx/
    ├── checkpoint-001.json
    ├── checkpoint-002.json
    └── checkpoint-003.json
```

Each checkpoint file contains the full state at that point in execution.

## License

MIT
