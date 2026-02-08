#!/bin/bash

# Stop all running nanobot instances

echo "🛑 Stopping nanobot..."

EXISTING_PIDS=$(ps aux | grep -E "[n]anobot gateway" | awk '{print $2}')

if [ -z "$EXISTING_PIDS" ]; then
    echo "✓ No running nanobot instances found"
    exit 0
fi

echo "Found running instances:"
ps aux | grep -E "[n]anobot gateway" | awk '{print "   PID " $2 " - Started " $9 " " $10}'
echo ""

# Kill each process
for PID in $EXISTING_PIDS; do
    kill $PID 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✓ Stopped PID $PID"
    else
        echo "⚠️  Could not stop PID $PID"
    fi
done

# Wait and verify
sleep 2
REMAINING=$(ps aux | grep -E "[n]anobot gateway" | wc -l)

if [ $REMAINING -gt 0 ]; then
    echo ""
    echo "⚠️  Some processes still running, force killing..."
    killall -9 nanobot 2>/dev/null
    sleep 1
    echo "✓ Force kill complete"
else
    echo ""
    echo "✓ All nanobot instances stopped successfully"
fi
