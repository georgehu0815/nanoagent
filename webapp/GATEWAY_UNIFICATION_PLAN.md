# Gateway Unification Plan

## Problem

Currently have two gateway files:
- `src/gateway/gateway.ts` - WhatsApp-focused
- `src/gateway/http-gateway.ts` - HTTP-focused

This is functional but not ideal long-term.

## Goal

Unified gateway that supports multiple channels through a single interface.

## Implementation Plan

### Step 1: Make gateway.ts Channel-Agnostic

**File:** `src/gateway/gateway.ts`

**Current:**
```typescript
export async function startGateway(params: { configPath?: string } = {}) {
  const plugin = createWhatsAppPlugin({...});  // Hardcoded WhatsApp
  const manager = createChannelManager({ plugin });
  await manager.startAll();
}
```

**Updated:**
```typescript
export async function startGateway(params: {
  configPath?: string;
  channels?: ('whatsapp' | 'http')[];
} = {}) {
  const cfg = loadGatewayConfig(params.configPath);
  const channelsToStart = params.channels || ['whatsapp']; // Default backward compat

  const plugins: ChannelPlugin<any, any>[] = [];

  // WhatsApp channel
  if (channelsToStart.includes('whatsapp') && cfg.channels.whatsapp?.enabled) {
    const whatsappPlugin = createWhatsAppPlugin({
      loadConfig: () => loadGatewayConfig(params.configPath),
      onMessage: async (inbound) => {
        const current = loadGatewayConfig(params.configPath);
        await handleInboundWhatsApp(current, inbound);
      },
    });
    plugins.push(whatsappPlugin);
  }

  // HTTP channel
  if (channelsToStart.includes('http') && cfg.channels.http?.enabled) {
    const httpPlugin = createHttpPlugin({
      loadConfig: () => loadGatewayConfig(params.configPath),
      onMessage: async (inbound) => {
        const current = loadGatewayConfig(params.configPath);
        await handleInboundHttp(current, inbound);
      },
    });
    plugins.push(httpPlugin);
  }

  if (plugins.length === 0) {
    throw new Error('No channels enabled');
  }

  const manager = createChannelManager({ plugins });
  await manager.startAll();

  return {
    stop: () => manager.stopAll(),
    snapshot: () => manager.getSnapshot(),
  };
}
```

### Step 2: Extract handleInbound Logic

**Split WhatsApp-specific logic:**

```typescript
// Keep WhatsApp-specific in gateway.ts
async function handleInboundWhatsApp(
  cfg: GatewayConfig,
  inbound: WhatsAppInboundMessage
): Promise<void> {
  // Current WhatsApp logic
  // - Typing indicators
  // - Markdown cleanup
  // - Send reply via WhatsApp
}

// Add HTTP-specific handler
async function handleInboundHttp(
  cfg: GatewayConfig,
  inbound: HttpInboundMessage
): Promise<void> {
  // Build session key
  const sessionKey = `agent:default:http:${inbound.accountId}:direct:${inbound.userId}`;

  // Run agent with streaming
  await runAgentForMessage({
    sessionKey,
    query: inbound.query,
    model: DEFAULT_MODEL,
    modelProvider: DEFAULT_PROVIDER,
    onEvent: (event) => {
      // Stream to HTTP client via connectionManager
      sendEventToClient(inbound.sessionId, event);
    },
  });
}
```

### Step 3: Update ChannelManager

**File:** `src/gateway/channels/manager.ts`

**Ensure it supports multiple plugins:**

```typescript
export function createChannelManager(params: {
  plugins: ChannelPlugin<any, any>[];  // Array, not single plugin
  loadConfig: () => GatewayConfig;
}) {
  // Start all plugins
  // Manage all channels
}
```

### Step 4: Update Configuration

**File:** `src/gateway/config.ts`

**Ensure config supports both channels:**

```typescript
export interface GatewayConfig {
  gateway: {
    accountId: string;
    heartbeatSeconds?: number;
  };
  channels: {
    whatsapp?: {
      enabled: boolean;
      accounts: Record<string, WhatsAppAccountConfig>;
    };
    http?: {
      enabled: boolean;
      accounts: Record<string, HttpAccountConfig>;
    };
  };
  bindings: Array<{
    agentId: string;
    match: {
      channel: 'whatsapp' | 'http';
      accountId: string;
    };
  }>;
}
```

### Step 5: Remove http-gateway.ts

**Delete:** `src/gateway/http-gateway.ts`

**Update:** `package.json`

```json
{
  "scripts": {
    "web:server": "tsx src/gateway/index.ts run --channels=http",
    "gateway": "tsx src/gateway/index.ts run --channels=whatsapp",
    "gateway:all": "tsx src/gateway/index.ts run --channels=whatsapp,http"
  }
}
```

### Step 6: Update CLI Interface

**File:** `src/gateway/index.ts`

```typescript
import { program } from 'commander';
import { startGateway } from './gateway.js';

program
  .command('run')
  .option('--config <path>', 'Config file path')
  .option('--channels <channels>', 'Comma-separated channels: whatsapp,http', 'whatsapp')
  .action(async (options) => {
    const channels = options.channels.split(',') as ('whatsapp' | 'http')[];

    console.log(`Starting gateway with channels: ${channels.join(', ')}`);

    const gateway = await startGateway({
      configPath: options.config,
      channels,
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await gateway.stop();
      process.exit(0);
    });
  });

program.parse();
```

## Benefits After Unification

✅ **Single Source of Truth**
- One gateway file to maintain
- Consistent patterns across channels

✅ **Easy Channel Addition**
- Adding Slack? Just create plugin and add to config
- No need for separate gateway files

✅ **Run Multiple Channels**
```bash
# WhatsApp only
npm run gateway

# HTTP only
npm run web:server

# Both simultaneously!
npm run gateway:all
```

✅ **Better Architecture**
- ChannelManager handles all complexity
- Each channel is just a plugin
- Clean separation of concerns

## Migration Checklist

- [ ] Update `gateway.ts` to accept channels parameter
- [ ] Extract `handleInboundHttp` function
- [ ] Update `ChannelManager` to support multiple plugins
- [ ] Update configuration schema
- [ ] Update CLI to support `--channels` flag
- [ ] Test WhatsApp channel still works
- [ ] Test HTTP channel still works
- [ ] Test both channels simultaneously
- [ ] Delete `http-gateway.ts`
- [ ] Update documentation

## Timeline

**Estimated:** 2-3 hours

**Priority:** Medium (works fine as-is, but cleaner unified)

## Testing

```bash
# Test WhatsApp only
tsx src/gateway/index.ts run --channels=whatsapp

# Test HTTP only
tsx src/gateway/index.ts run --channels=http

# Test both
tsx src/gateway/index.ts run --channels=whatsapp,http

# Verify both work independently
# Verify both work together
# Verify config reloading
# Verify graceful shutdown
```

## Conclusion

Unification is the right long-term architecture but not critical for MVP. Current two-gateway approach works fine and gets web interface operational quickly. Can unify in Phase 2 when adding more channels (Slack, Discord, etc.).

**Recommendation:** Keep current approach for MVP, unify when adding 3rd channel.
