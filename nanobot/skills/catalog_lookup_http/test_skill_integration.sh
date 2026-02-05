#!/bin/bash
# Test script for catalog_lookup_http skill integration

echo "=== Catalog Lookup HTTP Skill Integration Test ==="
echo ""

# Check if MCP server is running
echo "[1/5] Checking MCP server status..."
if ps aux | grep -v grep | grep "mcp_server.py" > /dev/null; then
    echo "✓ MCP server is running"
else
    echo "✗ MCP server is NOT running"
    echo "  Start it with: python3 mcp_server.py"
    exit 1
fi

# Check if venv exists and has dependencies
echo ""
echo "[2/5] Checking virtual environment..."
if [ -d ".venv" ]; then
    echo "✓ Virtual environment exists"
    source .venv/bin/activate
    if python3 -c "import mcp; print('✓ MCP library installed')" 2>/dev/null; then
        :
    else
        echo "✗ MCP library not installed in venv"
        echo "  Install with: pip install -r requirements.txt"
        exit 1
    fi
else
    echo "✗ Virtual environment not found"
    echo "  Create with: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Test MCP server connectivity
echo ""
echo "[3/5] Testing MCP server connectivity..."
timeout 2 curl -s http://localhost:3333/sse 2>/dev/null | head -1 && echo "✓ MCP server responding" || echo "⚠ MCP server not responding (might be normal for SSE)"

# Test list_tools operation
echo ""
echo "[4/5] Testing list_tools operation..."
source .venv/bin/activate
echo '{"operation": "list_tools"}' | python3 -c "
import json, sys
from skill import handler
result = handler(json.load(sys.stdin))
print('✓ list_tools returned', len(result.get('tools', [])), 'tools')
for tool in result.get('tools', []):
    print('  -', tool['name'])
"

# Test get_catalog_item operation
echo ""
echo "[5/5] Testing get_catalog_item operation..."
source .venv/bin/activate
echo '{"item_id": "TEST-123", "operation": "get_catalog_item"}' | python3 -c "
import json, sys
from skill import handler
result = handler(json.load(sys.stdin))
if 'item' in result:
    print('✓ get_catalog_item succeeded')
    print('  Result:', json.dumps(result['item'], indent=4))
else:
    print('✗ get_catalog_item failed')
    print('  Response:', json.dumps(result, indent=4))
"

echo ""
echo "=== Integration Test Complete ==="
