#!/bin/bash

# Check status of nanobot instances

echo "🔍 Checking nanobot status..."
echo ""

# Check for running instances
EXISTING_PIDS=$(ps aux | grep -E "[n]anobot gateway" | awk '{print $2}')

if [ -z "$EXISTING_PIDS" ]; then
    echo "❌ No nanobot instances running"
    echo ""

    # Check if port is in use
    PORT_CHECK=$(lsof -i :18790 2>/dev/null)
    if [ ! -z "$PORT_CHECK" ]; then
        echo "⚠️  Warning: Port 18790 is in use by another process:"
        lsof -i :18790
    fi
    exit 1
fi

echo "✅ Running nanobot instances:"
ps aux | grep -E "[n]anobot gateway" | awk '{print "   PID " $2 " - CPU " $3"% - Mem " $4"% - Started " $9 " " $10}'
echo ""

# Count instances
COUNT=$(echo "$EXISTING_PIDS" | wc -l | tr -d ' ')
if [ $COUNT -gt 1 ]; then
    echo "⚠️  WARNING: Multiple instances detected ($COUNT)"
    echo "   This will cause Telegram polling conflicts!"
    echo "   Run ./stop.sh to stop all instances, then ./run.sh"
    echo ""
fi

# Check port
echo "Port status:"
PORT_CHECK=$(lsof -i :18790 2>/dev/null)
if [ ! -z "$PORT_CHECK" ]; then
    echo "   ✓ Port 18790 is active"
else
    echo "   ⚠️  Port 18790 not listening (gateway may be starting...)"
fi
echo ""

# Check log file
if [ -f /tmp/nanobot.log ]; then
    echo "Recent logs (last 5 lines):"
    tail -5 /tmp/nanobot.log | sed 's/^/   /'
fi
