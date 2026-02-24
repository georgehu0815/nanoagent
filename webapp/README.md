# Agentflow Web Interface

React-based web interface for the Dexter AI agent with real-time streaming responses.

## Author: George Hu

## 🚀 Quick Start

### Start Both Servers

**Terminal 1 - Backend (HTTP Gateway):**
```bash
# From project root
npm run web:server
```

**Terminal 2 - Frontend (React App):**
```bash
# From project root
cd src/web/client
npm run dev
```

Then open your browser to: **http://localhost:5173**

### Alternative: Use Concurrent (Recommended)

```bash
# From project root (when added to package.json)
npm run web:dev
```

## 📁 Architecture

### Backend (HTTP Channel Plugin)
- **Location**: `src/gateway/channels/http/`
- **Pattern**: Follows gateway channel plugin architecture (like WhatsApp)
- **Server**: Express.js with Server-Sent Events (SSE)
- **Port**: 3000 (configurable via `.env`)

**Key Files:**
- `server.ts` - Express server with SSE endpoints
- `plugin.ts` - Channel plugin implementation
- `connection-manager.ts` - SSE connection tracking
- `types.ts` - TypeScript interfaces

**API Endpoints:**
```
POST   /api/chat              → Start new chat session
GET    /api/chat/:id/stream   → SSE stream for agent events
POST   /api/chat/:id/cancel   → Cancel running query
GET    /api/health            → Health check
GET    /api/sessions          → List active sessions
```

### Frontend (React + Vite + Tailwind)
- **Location**: `src/web/client/`
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v3
- **Port**: 5173 (Vite default)

**Key Components:**
- `ChatContainer` - Main chat interface
- `MessageList` - Scrollable message history
- `MessageItem` - Individual message display
- `EventStream` - Real-time event visualization
- `ToolCallView` - Tool execution display
- `AnswerBox` - Markdown-rendered answers
- `InputBox` - Text input with auto-resize

**Custom Hooks:**
- `useAgentStream` - Manages chat messages and streaming
- `useSSE` - Low-level SSE connection management

## 🎨 Features

### Real-time Streaming
- **Server-Sent Events (SSE)** for real-time communication
- **Event Types**: thinking, tool_start, tool_progress, tool_end, tool_error, done
- **Auto-reconnect** built into EventSource API

### Agent Event Visualization
- **Thinking Indicator**: Animated dots while agent is thinking
- **Tool Calls**: Expandable cards showing:
  - Tool name and status
  - Arguments (collapsible)
  - Progress messages
  - Results (collapsible)
  - Duration
  - Error messages (if any)

### Markdown Rendering
- **GitHub-flavored Markdown** with `react-markdown`
- **Syntax Highlighting** for code blocks via `rehype-highlight`
- **Tables, Lists, Links** fully supported
- **Code Blocks** with language-specific highlighting

### User Experience
- **Auto-scroll** to latest message
- **Input Auto-resize** textarea expands as you type
- **Enter to Send**, Shift+Enter for new line
- **Cancel Button** to stop processing
- **Clear Button** to reset conversation
- **Status Indicator** showing ready/processing state
- **Character Counter** on input
- **Professional UI** with gradient header

## ⚙️ Configuration

### Backend Configuration
Edit `.env` in project root:

```bash
# HTTP Web Channel
HTTP_CHANNEL_ENABLED=true
HTTP_CHANNEL_PORT=3000
HTTP_CHANNEL_HOST=localhost
HTTP_CHANNEL_CORS_ORIGINS=http://localhost:5173
```

### Frontend Configuration
Edit `src/web/client/.env`:

```bash
VITE_API_BASE=http://localhost:3000/api
```

## 🧪 Testing

### Manual Testing

**1. Backend Health Check:**
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":1771121520987,"uptime":13.4}
```

**2. Start Chat Session:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"What is TypeScript?","userId":"test"}'
```

Expected response:
```json
{"sessionId":"http-1771121520987-...","streamUrl":"/api/chat/..."}
```

**3. Connect to SSE Stream:**
```bash
curl http://localhost:3000/api/chat/SESSION_ID/stream
```

Expected: Stream of agent events

**4. Frontend:**
Open browser to http://localhost:5173 and:
- Type a message and press Enter
- Observe real-time streaming
- Check browser console for debug logs
- Verify events appear correctly

### Example Queries

**General Questions:**
```
"What is TypeScript?"
"Explain how React hooks work"
"What are the benefits of Server-Sent Events?"
```

**With Tool Calls (Web Search):**
```
"What are the latest developments in AI?"
"Search for recent TypeScript features"
"What happened at Google I/O 2024?"
```

**Financial Queries:**
```
"What is the current stock price of Apple?"
"Show me recent SEC filings for Microsoft"
"Analyze Tesla's financial performance"
```

## 📦 Dependencies

### Backend
```json
{
  "express": "^5.2.1",
  "cors": "^2.8.6"
}
```

### Frontend
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-markdown": "^10.1.0",
  "remark-gfm": "^4.0.1",
  "rehype-highlight": "^7.0.2",
  "tailwindcss": "^3.4.19",
  "@tailwindcss/typography": "^0.5.19"
}
```

## 🔧 Development

### Build Frontend for Production
```bash
cd src/web/client
npm run build
```

Output: `dist/` folder with static files

### Preview Production Build
```bash
cd src/web/client
npm run preview
```

### Lint Frontend
```bash
cd src/web/client
npm run lint
```

## 🐛 Troubleshooting

### Backend Not Starting

**Check port availability:**
```bash
lsof -i :3000
```

**Kill existing process:**
```bash
lsof -i :3000 -t | xargs kill -9
```

### Frontend Not Connecting

**Check CORS configuration:**
- Verify `HTTP_CHANNEL_CORS_ORIGINS` includes `http://localhost:5173`
- Restart backend after changing `.env`

**Check API base URL:**
- Verify `VITE_API_BASE` in `src/web/client/.env`
- Restart frontend after changing `.env`

### SSE Connection Issues

**Browser DevTools:**
- Open Network tab
- Filter by "stream"
- Check connection status and events

**Backend Logs:**
- Look for `[HTTP] SSE connection request` messages
- Check for any error messages

### Styling Issues

**Rebuild Tailwind:**
```bash
cd src/web/client
rm -rf node_modules/.vite
npm run dev
```

**Check Tailwind config:**
- Verify `tailwind.config.js` content paths
- Ensure `postcss.config.js` includes tailwindcss

## 📚 Additional Resources

### Related Documentation
- [Main README](../../README.md) - Project overview
- [Architecture](../../ARCHITECTURE.md) - System architecture
- [LLM Providers](../../SWITCHING_LLM_PROVIDERS.md) - LLM configuration
- [Search Tools](../../SEARCH_TOOLS_SETUP_GUIDE.md) - Search setup

### External Resources
- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [React Markdown](https://github.com/remarkjs/react-markdown)

## 🎯 Future Enhancements

**MVP Completed** ✅
- [x] Basic chat interface
- [x] Real-time streaming with SSE
- [x] Event visualization
- [x] Markdown rendering
- [x] Tool call display

**Potential Improvements** 📋
- [ ] Session persistence (localStorage)
- [ ] Multiple conversation tabs
- [ ] Authentication (API keys, JWT)
- [ ] Model selection dropdown
- [ ] Export conversations (Markdown/PDF)
- [ ] Dark mode toggle
- [ ] Mobile responsive design
- [ ] File upload support
- [ ] Voice input
- [ ] Backend unit tests
- [ ] Frontend tests with Vitest
- [ ] Docker deployment
- [ ] Production deployment guide

---

**Last Updated:** 2026-02-14
**Status:** MVP Complete ✅
