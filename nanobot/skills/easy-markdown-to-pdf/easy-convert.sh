#!/bin/bash
# Simple wrapper for easy-markdown-to-pdf converter

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure Node.js is available
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    brew install node
fi

# Ensure dependencies are installed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "Installing dependencies..."
    cd "$SCRIPT_DIR" && npm install
fi

# Run converter
node "$SCRIPT_DIR/converter.js" "$@"
