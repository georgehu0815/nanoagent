# Nanobot Management Scripts

Quick reference for managing nanobot instances.

## Scripts

### 🚀 Start Nanobot

```bash
./run.sh
```

**Features:**
- ✅ Automatically detects and stops existing instances
- ✅ Prevents Telegram polling conflicts
- ✅ Shows clear status messages

**What it does:**
1. Checks for running nanobot processes
2. Gracefully stops any existing instances
3. Waits for clean shutdown
4. Starts fresh nanobot gateway

---

### 🛑 Stop Nanobot

```bash
./stop.sh
```

**Features:**
- ✅ Stops all running nanobot instances
- ✅ Graceful shutdown with fallback to force kill
- ✅ Confirms when stopped

**Use when:**
- You want to stop the bot without restarting
- Debugging or updating configuration
- Shutting down before system maintenance

---

### 🔍 Check Status

```bash
./status.sh
```

**Features:**
- ✅ Shows all running instances (PID, CPU, Memory, Start Time)
- ✅ Warns if multiple instances detected
- ✅ Checks port 18790 availability
- ✅ Shows recent log entries

**Output indicators:**
- ✅ Green = Normal operation
- ⚠️ Yellow = Warning (multiple instances or port issues)
- ❌ Red = Not running

---

## Common Scenarios

### Starting the bot for the first time

```bash
./run.sh
```

### Restarting the bot

```bash
./run.sh  # Automatically stops old instances
```

### Checking if bot is running

```bash
./status.sh
```

### Stopping without restarting

```bash
./stop.sh
```

### Multiple instances warning

If you see:
```
⚠️  WARNING: Multiple instances detected (2)
   This will cause Telegram polling conflicts!
```

**Solution:**
```bash
./stop.sh   # Stop all
./run.sh    # Start fresh
```

---

## Troubleshooting

### "Conflict: terminated by other getUpdates request"

**Cause:** Multiple bot instances trying to poll Telegram simultaneously

**Fix:**
```bash
./stop.sh   # Stop all instances
./run.sh    # Start single instance
```

### Port 18790 in use

**Check what's using the port:**
```bash
lsof -i :18790
```

**Kill specific process:**
```bash
kill <PID>
```

### Bot not responding

1. Check status:
   ```bash
   ./status.sh
   ```

2. Check logs:
   ```bash
   tail -f /tmp/nanobot.log
   ```

3. Restart:
   ```bash
   ./run.sh
   ```

---

## Configuration

Bot configuration: `~/.nanobot/config.json`

**Key settings:**
- `channels.telegram.enabled` - Enable/disable Telegram
- `channels.telegram.token` - Bot token from @BotFather
- `channels.telegram.proxy` - Optional proxy (e.g., "http://127.0.0.1:7890")
- `channels.telegram.allowFrom` - User ID whitelist (empty = allow all)

**Recent improvements:**
- ✅ 30s connection timeouts configured
- ✅ Automatic retry on network errors
- ✅ Proxy support (if configured)
- ✅ Error logging instead of crashes

---

## Logs

**Live monitoring:**
```bash
tail -f /tmp/nanobot.log
```

**Search logs:**
```bash
grep "ERROR" /tmp/nanobot.log
grep "Telegram" /tmp/nanobot.log
```

**Recent errors:**
```bash
tail -100 /tmp/nanobot.log | grep -i error
```

---

## Scripts Summary

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `./run.sh` | Start nanobot | Always use this to start |
| `./stop.sh` | Stop nanobot | When stopping without restart |
| `./status.sh` | Check status | Check if running or debugging |

All scripts include automatic cleanup and error handling.
