# WebSocket Connection Fix Summary

**Date:** 2026-02-15
**Issue:** "device identity required" error when webapp connected to gateway
**Status:** ✅ RESOLVED

## Problem

After migrating the webapp from SSE to WebSocket, connections were failing with:
```
Error: device identity required
```

## Root Cause

The gateway requires **either**:
1. **Device identity** (public/private key pair for device authentication), OR
2. **Auth token** (shared secret for token-based authentication)

The webapp's `.env` file had `VITE_GATEWAY_TOKEN=` (empty), so the gateway rejected the connection.

## Solution

Added the gateway auth token to the webapp's `.env` file:

**File:** `src/webapp/client/.env`
```bash
VITE_GATEWAY_TOKEN=3b34e1a1252392a579eacbc66fb11fd6de8b152a2d9579b9
```

This token is read from the gateway configuration at:
- `~/.clawdbot/clawdbot.json` → `gateway.auth.token`

## Gateway Authentication Flow

From `src/gateway/server/ws-connection/message-handler.ts`:

```typescript
const canSkipDevice = allowControlUiBypass ? hasSharedAuth : hasTokenAuth;

if (!canSkipDevice) {
  // Rejects with "device identity required"
}
```

The gateway allows token-authenticated connections to skip device identity requirements.

## Verification

Test successful connection:
```bash
node test-webapp-connection.mjs
```

Results:
- ✓ WebSocket connected
- ✓ Authentication successful
- ✓ "webapp" client type accepted
- ✓ Full protocol handshake completed

## Current Status

**Webapp:** http://localhost:5173 ✅
**Gateway:** ws://localhost:18789 ✅
**Connections:** 4+ active webapp connections visible in gateway presence

The webapp is now successfully communicating with the gateway via WebSocket with proper authentication.

## Files Modified

1. **src/webapp/client/.env**
   - Added `VITE_GATEWAY_TOKEN` with gateway auth token

2. **Restart Required**
   - Restarted webapp to pick up new environment variable

## Related Documentation

- [WEBSOCKET_MIGRATION.md](WEBSOCKET_MIGRATION.md) - Complete migration guide
- [client/TESTING.md](client/TESTING.md) - Test suite documentation
- [Gateway Auth Docs](../../docs/gateway/security.md) - Gateway authentication details

## Next Steps

✅ Webapp migration complete
✅ Authentication working
✅ WebSocket connection stable

**Ready for:**
- Testing full chat flow (send message → receive agent events → display answer)
- Testing tool calls and thinking events
- Testing session management and history
