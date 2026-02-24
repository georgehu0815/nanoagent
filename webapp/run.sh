#!/bin/bash
# Start the webapp dev server.
# If the nanobot gateway is not already running on :18790, start it first.

GATEWAY_PORT=18790
GATEWAY_PID=""

if lsof -i ":$GATEWAY_PORT" -sTCP:LISTEN -t &>/dev/null; then
    echo "Gateway already running on :$GATEWAY_PORT, skipping."
else
    echo "Starting nanobot gateway on ws://localhost:$GATEWAY_PORT ..."
    uv run nanobot gateway --port "$GATEWAY_PORT" &
    GATEWAY_PID=$!
    sleep 1
fi

echo "Starting webapp dev server ..."
cd "$(dirname "$0")/client"
pnpm run dev

# Only kill the gateway if we started it
if [ -n "$GATEWAY_PID" ]; then
    kill "$GATEWAY_PID" 2>/dev/null
fi
