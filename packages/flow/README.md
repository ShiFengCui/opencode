# @opencode-ai/flow

LangGraph-based workflow engine for OpenCode.

## Features

- Visual workflow definition using LangGraph
- Integration with OpenCode via HTTP API
- Real-time state synchronization
- React Flow visualization support

## Quick Start

```bash
# Development
bun run dev

# Build
bun run build

# Test
bun test
```

## Configuration

Set environment variables:

```bash
OPENCODE_BASE_URL=http://localhost:4096
OPENCODE_SERVER_PASSWORD=your-password
PORT=4097
REDIS_URL=redis://localhost:6379
```

## API Endpoints

- `GET /health` - Health check
- `POST /graph/start` - Start graph execution
- `GET /graph/:sessionID/status` - Get graph status
- `POST /graph/:sessionID/feedback` - Send user feedback
- `GET /graph/:sessionID/stream` - SSE event stream

## License

MIT
