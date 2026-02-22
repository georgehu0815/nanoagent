# WebApp WebSocket Migration - Complete ✅

**Date:** 2026-02-15
**Status:** Migration completed successfully

## Summary

The webapp has been successfully migrated from SSE (Server-Sent Events) to WebSocket using the Gateway protocol. The app now connects directly to the Gateway WebSocket server on port 18789 instead of the HTTP channel on port 3000.

## Changes Made

### 1. Gateway Protocol - Added "webapp" Client Type

**File:** `src/gateway/protocol/client-info.ts`

- Added `WEBAPP: "webapp"` to `GATEWAY_CLIENT_IDS`
- Added `WEBAPP: "webapp"` to `GATEWAY_CLIENT_MODES`

The webapp now has its own dedicated client type in the gateway protocol.

### 2. WebSocket Client - New Gateway Client

**File:** `src/webapp/client/src/lib/gateway-client.ts` (NEW)

Created a full-featured WebSocket client that:
- Connects to gateway with protocol handshake (connect frame)
- Sends requests and handles responses (req/res frames)
- Listens for events (event frames)
- Supports chat.send, chat.history, chat.abort, health methods
- Auto-reconnection with exponential backoff
- Proper connection lifecycle management

### 3. React Hook - useGateway

**File:** `src/webapp/client/src/hooks/useGateway.ts` (NEW)

React hook for managing the WebSocket connection:
- Auto-connect on mount
- Connection state management (connecting, connected, error)
- Connect/disconnect/reconnect methods
- Clean cleanup on unmount

### 4. Updated Agent Stream Hook

**File:** `src/webapp/client/src/hooks/useAgentStream.ts` (UPDATED)

Completely rewritten to use WebSocket:
- Removed HTTP API calls (startChat, cancelChat, getStreamUrl)
- Removed SSE connection logic (useSSE)
- Now uses `useGateway` hook for connection
- Sends `chat.send` requests via gateway client
- Listens for `agent` events from gateway
- Maps gateway agent events to UI AgentEvent format
- Maintains same interface for components

### 5. Updated ChatContainer Component

**File:** `src/webapp/client/src/components/ChatContainer.tsx` (UPDATED)

- Passes `gatewayUrl` and `authToken` to `useAgentStream`
- Shows connection status (Connected/Connecting/Disconnected)
- Shows processing status when connected
- Disables input when not connected
- Dynamic placeholder based on connection state

### 6. Environment Configuration

**Files:**
- `src/webapp/client/.env` (UPDATED)
- `src/webapp/client/.env.example` (NEW)

New environment variables:
```bash
VITE_GATEWAY_URL=ws://localhost:18789
VITE_GATEWAY_TOKEN=
```

Old HTTP API variables commented out (legacy support).

### 7. Deprecated/Unused Files

These files are NO LONGER USED but kept for reference:
- `src/webapp/client/src/hooks/useSSE.ts` - Replaced by useGateway
- `src/webapp/client/src/services/api.ts` - Replaced by gateway client
- `src/gateway/channels/http/` - HTTP channel no longer needed for webapp

## Architecture Before & After

### Before (SSE):
```
React App (5173)
  ↓ HTTP POST /api/chat
HTTP Server (3000)
  ↓ SSE /api/chat/:id/stream
React App receives events
```

### After (WebSocket):
```
React App (5173)
  ↓ WebSocket
Gateway Server (18789)
  ↓ Protocol frames (req/res/event)
React App receives agent events
```

## Testing Instructions

### Prerequisites

1. **Gateway server must be running:**
   ```bash
   # From project root
   npm run dev
   ```
   The gateway should be listening on `ws://localhost:18789`

2. **Configure authentication (if needed):**
   ```bash
   # In .env (project root)
   GATEWAY_AUTH_MODE=none  # or "token"
   # GATEWAY_AUTH_TOKEN=your-token-here
   ```

3. **Configure webapp:**
   ```bash
   cd src/webapp/client
   cp .env.example .env
   # Edit .env if needed:
   # VITE_GATEWAY_URL=ws://localhost:18789
   # VITE_GATEWAY_TOKEN=your-token-here (if using auth)
   ```

### Start the Webapp

```bash
# From project root
cd src/webapp/client
npm install  # If first time
npm run dev
```

The React app will start on `http://localhost:5173`

### Test Checklist

#### ✅ 1. Connection Test

**Open browser console** at http://localhost:5173

Expected console logs:
```
[useGateway] Connecting to gateway...
[GatewayClient] Connecting to: ws://localhost:18789
[GatewayClient] WebSocket opened, sending connect frame
[GatewayClient] Received frame: res
[GatewayClient] Connected successfully: { type: 'hello-ok', ... }
[useGateway] Connected: { ... }
[useAgentStream] Subscribing to agent events
```

**Check UI:**
- Status indicator should show: ● Connected
- Processing status should show: ● Ready
- Input box should be enabled
- Placeholder: "Ask me anything..."

#### ✅ 2. Send Message Test

**Action:** Type "What is TypeScript?" and press Enter

**Expected console logs:**
```
[useAgentStream] 📤 sendMessage called
[useAgentStream]    Query: What is TypeScript?
[useAgentStream]    connected: true
[useAgentStream] ✅ Message created: msg-xxxxx
[useAgentStream] 🚀 Sending chat.send to gateway...
[GatewayClient] Received frame: res
[useAgentStream] ✅ chat.send response: { ... }
[useAgentStream] Gateway agent event: { type: 'thinking', ... }
[useAgentStream] Mapped event: { type: 'thinking', ... }
[useAgentStream] Gateway agent event: { type: 'done', ... }
[useAgentStream] Mapped event: { type: 'done', answer: '...', ... }
```

**Check UI:**
- Message appears with your query
- Thinking indicator animates
- Answer appears when done
- Processing indicator returns to "Ready"

#### ✅ 3. Tool Execution Test

**Action:** Send "What is the current price of AAPL stock?"

**Expected:**
- Tool call cards appear (e.g., "finnhub_quote")
- Tool arguments shown (collapsible)
- Tool progress messages appear
- Tool results shown (collapsible)
- Duration displayed
- Final answer with stock price

#### ✅ 4. Error Handling Test

**Action:** Stop gateway server (`Ctrl+C`), try to send message

**Expected:**
- Connection status changes to "Disconnected" (red indicator)
- Input box disabled with placeholder: "Connecting to gateway..."
- Error message: "Not connected to gateway"

**Action:** Restart gateway server

**Expected:**
- Auto-reconnection within 2-4 seconds
- Status changes to "Connected" (green indicator)
- Input enabled again

#### ✅ 5. Multiple Messages Test

**Action:** Send 3 messages in sequence:
1. "Hello"
2. "What is React?"
3. "Explain TypeScript"

**Expected:**
- All messages appear in order
- Each has its own event stream
- Answers appear correctly
- Message counter updates (e.g., "3 messages")

#### ✅ 6. Cancel Test

**Action:** Send a long query like "Explain AI in detail", then click "Cancel"

**Expected:**
- Message marked as cancelled
- Processing stops
- Input re-enabled
- Gateway receives abort request

#### ✅ 7. Clear Test

**Action:** Click "Clear" button after sending messages

**Expected:**
- All messages cleared
- Message counter resets to "0 messages"
- Chat area empty

### Troubleshooting

#### Connection Refused

**Problem:** `WebSocket connection failed: ERR_CONNECTION_REFUSED`

**Solutions:**
- Verify gateway is running: `lsof -i :18789`
- Check gateway URL in `.env`: `VITE_GATEWAY_URL=ws://localhost:18789`
- Restart gateway: `npm run dev`

#### Authentication Failed

**Problem:** `Connect failed: Authentication required`

**Solutions:**
- Check gateway auth mode: `GATEWAY_AUTH_MODE=none` in project root `.env`
- OR set token in webapp: `VITE_GATEWAY_TOKEN=your-token` in webapp `.env`

#### No Agent Events

**Problem:** Messages send but no events received

**Solutions:**
- Check browser console for `[useAgentStream] Gateway agent event:` logs
- Verify gateway is emitting agent events (check gateway logs)
- Ensure chat.send method is implemented in gateway

#### Events Not Rendering

**Problem:** Events logged but not showing in UI

**Solutions:**
- Check event mapping in `mapGatewayEvent` function
- Verify event types match expected format
- Check MessageItem/EventStream components

## API Changes

### Old SSE API (Deprecated)

```typescript
// POST /api/chat
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ query: '...' })
});

// GET /api/chat/:id/stream (SSE)
const eventSource = new EventSource(`/api/chat/${id}/stream`);
```

### New WebSocket API

```typescript
// Connect to gateway
const client = new GatewayClient({ url: 'ws://localhost:18789' });
await client.connect();

// Send chat message
const response = await client.sendChat('What is TypeScript?');

// Listen for agent events
client.on('agent', (payload) => {
  console.log('Agent event:', payload);
});
```

## Gateway Protocol Frames

### Connect Request
```json
{
  "type": "req",
  "id": "connect",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "webapp",
      "displayName": "Web App",
      "version": "1.0.0",
      "platform": "browser",
      "mode": "webapp"
    }
  }
}
```

### Hello-OK Response
```json
{
  "type": "res",
  "id": "connect",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "server": { ... },
    "features": { "methods": [...], "events": [...] }
  }
}
```

### Chat Send Request
```json
{
  "type": "req",
  "id": "r1",
  "method": "chat.send",
  "params": {
    "idempotencyKey": "chat-1234567890-0.123",
    "text": "What is TypeScript?"
  }
}
```

### Agent Event
```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "type": "thinking",
    "message": "Processing your query..."
  }
}
```

## Event Mapping

Gateway agent events are mapped to UI AgentEvent format:

| Gateway Event | UI Event | Notes |
|--------------|----------|-------|
| `thinking` | `thinking` | Shows "Thinking..." indicator |
| `tool_start` | `tool_start` | Tool card appears |
| `tool_progress` | `tool_progress` | Progress messages |
| `tool_end` | `tool_end` | Result shown, duration |
| `tool_error` | `tool_error` | Error message in red |
| `tool_limit` | `tool_limit` | Rate limit warning |
| `context_cleared` | `context_cleared` | Context reset notification |
| `done` or `answer` | `done` | Final answer, mark complete |

## Benefits of WebSocket Migration

1. **✅ Unified Protocol** - Same protocol as TUI, macOS app, CLI
2. **✅ Real-time Bidirectional** - No polling, instant events
3. **✅ Better Performance** - Lower latency, less overhead
4. **✅ Auto-reconnection** - Built-in resilience
5. **✅ Multi-agent Support** - Can route to different agents via sessionKey
6. **✅ Type Safety** - TypeBox validation on all frames
7. **✅ Feature Parity** - Access all gateway features
8. **✅ Simpler Architecture** - No separate HTTP channel needed

## Next Steps

### Optional Enhancements

1. **Session Persistence**
   - Save messages to localStorage
   - Restore on page reload

2. **Multiple Sessions**
   - Session tabs/sidebar
   - Switch between conversations

3. **Advanced Features**
   - Model selection dropdown
   - Temperature/settings controls
   - Export conversation (MD/PDF)

4. **UI Improvements**
   - Dark mode toggle
   - Mobile responsive design
   - File upload support
   - Voice input

5. **Production Deployment**
   - Build optimization
   - Environment-specific configs
   - Monitoring/analytics
   - Error tracking (Sentry)

### Testing & QA

1. **Unit Tests** - Test gateway client, hooks
2. **Integration Tests** - Test full flow with test gateway
3. **E2E Tests** - Playwright/Cypress tests
4. **Load Testing** - Multiple concurrent connections
5. **Error Scenarios** - Network failures, reconnection

## Migration Complete ✅

The webapp has been successfully migrated to WebSocket. All old SSE code is deprecated but kept for reference. The new architecture is:

- **More performant** - Native bidirectional WebSocket
- **More reliable** - Auto-reconnection, connection status
- **More consistent** - Same protocol as other clients
- **More extensible** - Access to full gateway features

**Ready for testing and deployment!**

---

**Migrated by:** Claude (AI Assistant)
**Date:** 2026-02-15
**Version:** 1.0.0
