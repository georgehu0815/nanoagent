# WhatsApp Integration Guide

This guide explains how to connect your WhatsApp account to nanobot and use it as a communication channel.

## Overview

The nanobot WhatsApp integration allows you to:
- Chat with your AI assistant via WhatsApp
- Access all nanobot features from your phone
- Use tools and commands through WhatsApp messages
- Restrict access to specific phone numbers
- Run the bot 24/7 as a WhatsApp service

## Architecture

```
┌─────────────┐      WebSocket       ┌──────────────┐      HTTP/WS      ┌─────────────┐
│  WhatsApp   │ ◄─────────────────► │ Bridge (WA   │ ◄────────────────► │  WhatsApp   │
│   on Phone  │                      │   Web API)   │                    │   Servers   │
└─────────────┘                      └──────────────┘                    └─────────────┘
                                             │
                                             │ WebSocket (ws://localhost:3001)
                                             │
                                      ┌──────▼───────┐
                                      │   nanobot    │
                                      │   Gateway    │
                                      └──────────────┘
                                             │
                                      ┌──────▼───────┐
                                      │ Azure OpenAI │
                                      │  (GPT-5.2)   │
                                      └──────────────┘
```

## Prerequisites

### 1. System Requirements
- Node.js >= 18
- npm or yarn
- A phone with WhatsApp installed
- A WhatsApp account

### 2. nanobot Installation
```bash
# Install nanobot with all dependencies
uv tool install --editable . --with azure-identity --with openai

# Verify installation
nanobot status
```

## Quick Start

### Step 1: Build the Bridge

The bridge handles communication between nanobot and WhatsApp Web:

```bash
# The bridge is automatically set up when you run
nanobot channels login
```

This will:
- Copy bridge files to `~/.nanobot/bridge`
- Install dependencies
- Build the TypeScript code
- Start the bridge server

### Step 2: Link Your Phone

When you run `nanobot channels login`, you'll see:

```
🐈 Starting bridge...
Scan the QR code to connect.

█████████████████████████████
█████████████████████████████
████ ▄▄▄▄▄ █▀█ █▄▀▄ ▄▄▄▄▄ ████
████ █   █ █▀▀▀█  █ █   █ ████
████ █▄▄▄█ █▀ █▀▀ █ █▄▄▄█ ████
████▄▄▄▄▄▄▄█ ▀ █▄▀ ▄▄▄▄▄▄▄████
[QR Code displayed here]
```

**On your phone:**
1. Open WhatsApp
2. Go to **Settings** → **Linked Devices**
3. Tap **Link a Device**
4. Scan the QR code

Once connected, you'll see:
```
✅ Connected to WhatsApp
```

### Step 3: Enable WhatsApp in Configuration

Edit `~/.nanobot/config.json`:

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.nanobot/workspace",
      "model": "azure/gpt-5.2-chat",
      "maxTokens": 8192,
      "temperature": 1.0,
      "maxToolIterations": 20
    }
  },
  "channels": {
    "whatsapp": {
      "enabled": true,
      "bridgeUrl": "ws://localhost:3001",
      "allowFrom": []
    }
  },
  "providers": {
    "azure": {
      "apiBase": "https://your-endpoint.cognitiveservices.azure.com/",
      "apiVersion": "2025-01-01-preview",
      "deployment": "gpt-5.2-chat",
      "useAzureAd": true,
      "apiKey": ""
    }
  }
}
```

**Important**: Use **camelCase** for configuration keys (`bridgeUrl`, not `bridge_url`).

### Step 4: Start the Gateway

Start nanobot with WhatsApp enabled:

```bash
# Set Azure credentials if using Azure AD
export AZURE_CLIENT_ID="your-managed-identity-client-id"

# Start the gateway
nanobot gateway --port 18790
```

You should see:
```
🐈 Starting nanobot gateway on port 18790...
✓ Using Azure OpenAI (gpt-5.2-chat)
✓ Channels enabled: whatsapp
✓ Connected to WhatsApp bridge
```

### Step 5: Test It!

Send a message to your bot on WhatsApp:

```
Hello!
```

The bot should respond using Azure OpenAI! 🎉

## Configuration Options

### Basic Configuration

Minimal WhatsApp configuration:

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "bridgeUrl": "ws://localhost:3001",
      "allowFrom": []
    }
  }
}
```

### Restricted Access

Allow only specific phone numbers:

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "bridgeUrl": "ws://localhost:3001",
      "allowFrom": [
        "+1234567890",
        "+9876543210"
      ]
    }
  }
}
```

**Format**: Use international format with `+` prefix.

### Custom Bridge URL

If running bridge on a different port or host:

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "bridgeUrl": "ws://192.168.1.100:3001",
      "allowFrom": []
    }
  }
}
```

## Usage Examples

### Basic Conversation

```
You: Hello, what can you do?
Bot: I'm an AI assistant powered by Azure OpenAI. I can help you with:
     - Answering questions
     - Writing code
     - Analyzing files
     - Running commands
     - And much more!

You: What is 2+2?
Bot: 2 + 2 = 4 ✅
```

### Using Tools

The bot can use tools through WhatsApp:

```
You: What files are in my workspace?
Bot: [Bot uses file listing tool]
     I found these files in your workspace:
     - project.py
     - README.md
     - config.json
```

### Code Generation

```
You: Write a Python function to check if a number is prime
Bot: Here's a function to check if a number is prime:

     def is_prime(n):
         if n < 2:
             return False
         for i in range(2, int(n**0.5) + 1):
             if n % i == 0:
                 return False
         return True
```

## Advanced Setup

### Running as a Service (24/7)

To keep the bot running continuously:

#### Using systemd (Linux)

Create `/etc/systemd/system/nanobot.service`:

```ini
[Unit]
Description=Nanobot WhatsApp Gateway
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username
Environment="AZURE_CLIENT_ID=your-client-id"
ExecStart=/home/your-username/.local/bin/nanobot gateway --port 18790
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable nanobot
sudo systemctl start nanobot
sudo systemctl status nanobot
```

#### Using screen (Quick Method)

```bash
# Start in screen session
screen -S nanobot
export AZURE_CLIENT_ID="your-client-id"
nanobot gateway --port 18790

# Detach: Ctrl+A, then D
# Reattach: screen -r nanobot
```

#### Using tmux

```bash
# Start in tmux session
tmux new -s nanobot
export AZURE_CLIENT_ID="your-client-id"
nanobot gateway --port 18790

# Detach: Ctrl+B, then D
# Reattach: tmux attach -t nanobot
```

### Running Bridge and Gateway Separately

For production, you might want to run them separately:

**Terminal 1 - Bridge:**
```bash
cd ~/.nanobot/bridge
npm start
```

**Terminal 2 - Gateway:**
```bash
export AZURE_CLIENT_ID="your-client-id"
nanobot gateway --port 18790
```

### Remote Bridge Setup

To run the bridge on a different machine:

1. **On the bridge server:**
```bash
cd ~/.nanobot/bridge
# Edit src/server.ts to bind to 0.0.0.0 instead of localhost
npm start
```

2. **In nanobot config:**
```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "bridgeUrl": "ws://bridge-server-ip:3001",
      "allowFrom": []
    }
  }
}
```

## Managing WhatsApp Sessions

### View Session Info

Check bridge logs:
```bash
tail -f ~/.nanobot/bridge/logs/bridge.log
```

### Clear Session (Unlink)

To unlink and start fresh:

```bash
# Stop bridge and gateway first
# Then delete session data
rm -rf ~/.nanobot/bridge/auth_info_baileys

# Start bridge again to get new QR code
cd ~/.nanobot/bridge
npm start
```

### Session Persistence

The WhatsApp session is stored in:
```
~/.nanobot/bridge/auth_info_baileys/
```

This directory contains:
- `creds.json` - Authentication credentials
- `keys.json` - Encryption keys
- Session data

**Important**: Keep these files secure and backed up!

## Commands

### nanobot CLI Commands

```bash
# Check channel status
nanobot channels status

# Get QR code for linking
nanobot channels login

# View all available commands
nanobot --help
```

### WhatsApp Bot Commands

You can send these directly to the bot on WhatsApp:

```
/help         - Show available commands
/status       - Check bot status
/workspace    - View workspace location
/model        - Show current AI model
```

## Troubleshooting

### Issue: Port 3001 Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill <PID>

# Or kill all node processes (use with caution!)
pkill -f node

# Restart bridge
nanobot channels login
```

### Issue: QR Code Not Displaying

**Symptoms:** Bridge starts but no QR code appears

**Solutions:**

1. Check terminal supports Unicode:
```bash
echo "█████ Test"
```

2. Use QR code URL instead:
```bash
# Check bridge logs for QR URL
tail -f ~/.nanobot/bridge/logs/bridge.log
```

3. Try smaller terminal window (QR might be too large)

### Issue: "Connection Lost" After Scanning

**Symptoms:** QR code scanned but connection drops

**Solutions:**

1. Keep WhatsApp Web open in background:
   - Don't force-close WhatsApp on your phone
   - Keep phone connected to internet

2. Check firewall/network:
```bash
# Test WebSocket connection
wscat -c ws://localhost:3001
```

3. Restart both bridge and gateway:
```bash
# Stop both processes
# Start bridge first
cd ~/.nanobot/bridge && npm start
# Then start gateway
nanobot gateway --port 18790
```

### Issue: Messages Not Sending/Receiving

**Symptoms:** Bot doesn't respond to WhatsApp messages

**Checklist:**

1. ✅ Bridge is running and connected
2. ✅ Gateway is running
3. ✅ WhatsApp is enabled in config
4. ✅ Phone number is in `allowFrom` list (if not empty)
5. ✅ Azure OpenAI is configured correctly

**Debug:**
```bash
# Check gateway logs
nanobot gateway --port 18790

# Look for:
# - "Connected to WhatsApp bridge"
# - Incoming message logs
# - LLM response logs
```

### Issue: "DefaultAzureCredential Failed"

**Symptoms:**
```
Error calling Azure OpenAI: DefaultAzureCredential failed to retrieve a token
```

**Solution:**
```bash
# Set managed identity client ID
export AZURE_CLIENT_ID="your-client-id"

# Or use Azure CLI
az login

# Then restart gateway
nanobot gateway --port 18790
```

### Issue: Bridge Crashes Frequently

**Symptoms:** Bridge stops working randomly

**Solutions:**

1. Update dependencies:
```bash
cd ~/.nanobot/bridge
npm update
npm audit fix
```

2. Check system resources:
```bash
# Memory usage
free -h

# Disk space
df -h
```

3. Enable auto-restart (systemd/supervisor)

### Issue: "WhatsApp Web Version Outdated"

**Symptoms:** Bridge fails to connect to WhatsApp servers

**Solution:**
```bash
# Update bridge dependencies
cd ~/.nanobot/bridge
npm install @whiskeysockets/baileys@latest
npm run build
npm start
```

## Security Best Practice

### 1. Restrict Access

**Always** use `allowFrom` to limit who can message your bot:

```json
{
  "channels": {
    "whatsapp": {
      "allowFrom": ["+1234567890"]
    }
  }
}
```

Without this, **anyone** who knows your WhatsApp number can use your bot!

### 2. Secure Session Files

Protect authentication files:

```bash
chmod 700 ~/.nanobot/bridge/auth_info_baileys
chmod 600 ~/.nanobot/bridge/auth_info_baileys/creds.json
```

### 3. Use Environment Variables

Don't hardcode secrets in config:

```bash
# Use environment variables
export AZURE_CLIENT_ID="..."
export AZURE_TENANT_ID="..."

# Or use .env file (but don't commit it!)
echo "AZURE_CLIENT_ID=..." > ~/.nanobot/.env
```

### 4. Monitor Usage

Keep track of who's using the bot:

```bash
# Check gateway logs
tail -f /path/to/gateway.log | grep "message from"
```

### 5. Rate Limiting

Implement rate limiting to prevent abuse:

```python
# In nanobot code, add rate limiting
# This is a future enhancement
```

### 6. Backup Session

Backup WhatsApp session regularly:

```bash
# Backup
tar -czf whatsapp-session-$(date +%Y%m%d).tar.gz \
  ~/.nanobot/bridge/auth_info_baileys

# Restore
tar -xzf whatsapp-session-20260204.tar.gz -C ~/
```

## Architecture Details

### Bridge Components

The bridge ([bridge/src/](bridge/src/)) consists of:

- **[server.ts](bridge/src/server.ts)** - WebSocket server
- **[whatsapp.ts](bridge/src/whatsapp.ts)** - WhatsApp connection using Baileys
- **[index.ts](bridge/src/index.ts)** - Main entry point

### Message Flow

1. **Incoming Message:**
   ```
   WhatsApp → Baileys → Bridge → WebSocket → Gateway → Agent → LLM
   ```

2. **Outgoing Response:**
   ```
   LLM → Agent → Gateway → WebSocket → Bridge → Baileys → WhatsApp
   ```

### WebSocket Protocol

Messages between bridge and gateway use JSON:

**Incoming Message:**
```json
{
  "type": "message",
  "from": "+1234567890",
  "chatId": "1234567890@s.whatsapp.net",
  "text": "Hello, bot!",
  "timestamp": 1707088925
}
```

**Outgoing Message:**
```json
{
  "type": "send",
  "to": "1234567890@s.whatsapp.net",
  "text": "Hello! How can I help you?"
}
```

## Performance Optimization

### 1. Reduce Latency

- Use local LLM provider if available
- Enable caching in gateway
- Use faster Azure regions

### 2. Handle Load

For high message volume:

```bash
# Increase max connections
# Edit bridge/src/server.ts
maxPayload: 10 * 1024 * 1024, // 10MB
```

### 3. Memory Management

Monitor and limit memory:

```bash
# Set Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

## Monitoring and Logs

### Gateway Logs

```bash
# Real-time monitoring
nanobot gateway --port 18790 | tee gateway.log

# Check specific events
grep "WhatsApp" gateway.log
grep "message from" gateway.log
grep "Error" gateway.log
```

### Bridge Logs

```bash
# Bridge outputs to stdout
cd ~/.nanobot/bridge
npm start 2>&1 | tee bridge.log
```

### System Monitoring

```bash
# Check if services are running
ps aux | grep nanobot
ps aux | grep node

# Network connections
netstat -an | grep 3001
netstat -an | grep 18790

# Resource usage
top -p $(pgrep -f nanobot)
```

## Frequently Asked Questions

### Q: Can I use multiple WhatsApp accounts?

**A:** Currently, only one WhatsApp account per bridge instance. To use multiple accounts, run multiple bridge instances on different ports.

### Q: Does this violate WhatsApp Terms of Service?

**A:** This uses WhatsApp Web's official API (via Baileys library). However, automated bots may violate ToS depending on usage. Use responsibly and for personal/authorized use only.

### Q: Can I use WhatsApp Business?

**A:** Yes! Both regular WhatsApp and WhatsApp Business work.

### Q: Will this drain my phone battery?

**A:** No, the bot runs on your computer/server. Your phone only needs to be online initially for linking. After that, it can be offline.

### Q: Can multiple people chat with the bot?

**A:** Yes! Any WhatsApp user can message the bot. Use `allowFrom` to restrict access.

### Q: What happens if my computer restarts?

**A:** You need to restart the bridge and gateway. The WhatsApp session persists, so no need to scan QR code again. Consider using systemd for auto-restart.

### Q: Can I run this on a VPS/cloud server?

**A:** Yes! Make sure to:
- Link WhatsApp once (you need a display/terminal for QR code)
- Keep auth files secure
- Use systemd or supervisor for auto-restart
- Set up firewall rules

### Q: How much does it cost?

**A:**
- nanobot: Free and open source
- Azure OpenAI: Pay per token usage
- VPS (optional): ~$5-20/month
- WhatsApp: Free

## Additional Resources

- [WhatsApp Web API (Baileys)](https://github.com/WhiskeySockets/Baileys)
- [nanobot Documentation](README.md)
- [Azure OpenAI Guide](AZURE_OPENAI_GUIDE.md)
- [nanobot GitHub Repository](https://github.com/HKUDS/nanobot)

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review bridge and gateway logs
3. Test with CLI first: `nanobot agent -m "test"`
4. Open an issue on GitHub

---

**Last Updated:** 2026-02-04
**Bridge Version:** 0.1.0
**Protocol:** WhatsApp Web API (Baileys)
**Status:** Production Ready ✅
