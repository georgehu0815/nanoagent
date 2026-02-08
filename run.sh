#!/bin/bash

# Nanobot startup script with automatic cleanup of existing instances

echo "🐈 Starting nanobot gateway on port 18790..."

# Check for existing nanobot instances
EXISTING_PIDS=$(ps aux | grep -E "[n]anobot gateway" | awk '{print $2}')

if [ ! -z "$EXISTING_PIDS" ]; then
    echo "⚠️  Found existing nanobot instances:"
    ps aux | grep -E "[n]anobot gateway" | awk '{print "   PID " $2 " - Started " $9 " " $10}'
    echo ""
    echo "🔄 Stopping existing instances to avoid Telegram polling conflicts..."

    # Kill each process
    for PID in $EXISTING_PIDS; do
        kill $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "   ✓ Stopped PID $PID"
        else
            echo "   ⚠️  Could not stop PID $PID (may require sudo)"
        fi
    done

    # Wait for processes to terminate
    sleep 2

    # Verify all stopped
    REMAINING=$(ps aux | grep -E "[n]anobot gateway" | wc -l)
    if [ $REMAINING -gt 0 ]; then
        echo "   ⚠️  Some processes still running, trying force kill..."
        killall -9 nanobot 2>/dev/null
        sleep 1
    fi

    echo "   ✓ All existing instances stopped"
    echo ""
fi

# Start nanobot gateway
exec nanobot gateway
