# Catalog Lookup HTTP Skill - Usage Guide

## Quick Start

### Correct Way to Call the Skill

The skill provides a **`handler()`** function as the main entry point. Always use this:

```python
from skill import handler

# Basic lookup
result = handler({'item_id': 'A123'})

# Summary lookup
result = handler({'item_id': 'B456', 'operation': 'get_summary_item'})

# Search
result = handler({'query': 'premium', 'operation': 'search_catalog'})

# List tools
result = handler({'operation': 'list_tools'})
```

### ❌ Common Mistakes

#### Mistake 1: Calling `run()` directly

```python
# ❌ WRONG - This returns a coroutine, not the result
from skill import run
result = run({'item_id': 'A123'})  # TypeError: coroutine is not JSON serializable
```

**Error:**
```
TypeError: Object of type coroutine is not JSON serializable
RuntimeWarning: coroutine 'run' was never awaited
```

**Why it fails:** `run()` is an `async def` function. Calling it returns a coroutine object, not the actual result.

**Fix:** Use `handler()` instead:
```python
# ✅ CORRECT
from skill import handler
result = handler({'item_id': 'A123'})
```

#### Mistake 2: Forgetting to import handler

```python
# ❌ WRONG
import skill
result = skill.run({'item_id': 'A123'})  # Still returns coroutine
```

**Fix:**
```python
# ✅ CORRECT
from skill import handler
result = handler({'item_id': 'A123'})
```

#### Mistake 3: Using wrong parameter names

```python
# ❌ WRONG - Missing 'item_id' parameter
result = handler({'id': 'A123'})  # ValueError: get_catalog_item requires 'item_id'

# ❌ WRONG - Missing 'query' parameter for search
result = handler({'search': 'premium', 'operation': 'search_catalog'})  # ValueError
```

**Fix:**
```python
# ✅ CORRECT - Use exact parameter names
result = handler({'item_id': 'A123'})
result = handler({'query': 'premium', 'operation': 'search_catalog'})
```

---

## Understanding Async vs Sync

### The Two Functions

The skill has two functions:

```python
# 1. Async function (internal use)
async def run(inputs: dict) -> dict:
    # Performs async operations with MCP server
    ...

# 2. Sync wrapper (public API)
def handler(inputs: dict) -> dict:
    return asyncio.run(run(inputs))
```

### When to Use Each

| Function | When to Use | Notes |
|----------|-------------|-------|
| `handler()` | **Always** (default) | Synchronous, easy to use |
| `run()` | Only in async context | Requires `await` keyword |

### Using run() in Async Context

If you're already in an async function (rare case), you can use `run()` with `await`:

```python
import asyncio

async def my_async_function():
    from skill import run

    # ✅ CORRECT - await the coroutine
    result = await run({'item_id': 'A123'})
    print(result)

# Execute the async function
asyncio.run(my_async_function())
```

### Using asyncio.run() directly

You can also manually wrap `run()`:

```python
import asyncio
from skill import run

# ✅ CORRECT
result = asyncio.run(run({'item_id': 'A123'}))
```

But using `handler()` is simpler since it does this for you.

---

## Complete Examples

### Example 1: Basic Catalog Lookup

```python
from skill import handler
import json

# Look up item A123
result = handler({'item_id': 'A123'})

# Print formatted result
print(json.dumps(result, indent=2))
```

**Output:**
```json
{
  "item": {
    "id": "A123",
    "name": "Premium Subscription",
    "price": 29.99,
    "currency": "USD",
    "status": "active"
  },
  "operation": "get_catalog_item"
}
```

### Example 2: Summary Lookup

```python
from skill import handler

# Get detailed summary
result = handler({
    'item_id': 'B456',
    'operation': 'get_summary_item'
})

print(f"Item: {result['item']['name']}")
print(f"Summary Price: ${result['item']['summary']}")
print(f"Sale Price: ${result['item']['sale_price']}")
print(f"Country: {result['item']['country']}")
```

### Example 3: Search Catalog

```python
from skill import handler

# Search for premium items
result = handler({
    'query': 'premium',
    'operation': 'search_catalog'
})

print(f"Found {result['count']} items:")
for item in result['results']:
    print(f"  - {item['id']}: {item['name']} (${item['price']})")
```

**Output:**
```
Found 2 items:
  - PROD-001: Premium Subscription ($29.99)
  - PROD-004: Premium Plus Bundle ($49.99)
```

### Example 4: List Available Tools

```python
from skill import handler

# Discover available operations
result = handler({'operation': 'list_tools'})

print(f"Available tools: {result['count']}")
for tool in result['tools']:
    print(f"\n{tool['name']}:")
    print(f"  {tool['description']}")
```

### Example 5: Error Handling

```python
from skill import handler

try:
    # This will fail - missing item_id
    result = handler({'operation': 'get_catalog_item'})
except ValueError as e:
    print(f"Error: {e}")
    # Error: get_catalog_item operation requires 'item_id' parameter

try:
    # This will fail - invalid operation
    result = handler({'operation': 'invalid_op', 'item_id': 'A123'})
except ValueError as e:
    print(f"Error: {e}")
    # Error: Invalid operation 'invalid_op'. Must be one of: [...]
```

### Example 6: Command-Line Script

```python
#!/usr/bin/env python3
"""
Command-line tool for catalog lookup
Usage: python lookup.py A123
"""

import sys
import json
from skill import handler

def main():
    if len(sys.argv) < 2:
        print("Usage: python lookup.py <item_id>")
        sys.exit(1)

    item_id = sys.argv[1]

    try:
        result = handler({'item_id': item_id})
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

**Usage:**
```bash
python lookup.py A123
```

---

## Testing the Skill

### Quick Test

```bash
cd /Users/ghu/.claude/skills/catalog_lookup_http
python3 -c "from skill import handler; import json; print(json.dumps(handler({'item_id': 'A123'}), indent=2))"
```

### Test All Operations

```python
from skill import handler
import json

tests = [
    {'item_id': 'A123'},
    {'item_id': 'B456', 'operation': 'get_summary_item'},
    {'query': 'premium', 'operation': 'search_catalog'},
    {'operation': 'list_tools'}
]

for test in tests:
    print(f"\n{'='*60}")
    print(f"Test: {test}")
    print('='*60)
    result = handler(test)
    print(json.dumps(result, indent=2))
```

---

## Integration Examples

### Using in Flask API

```python
from flask import Flask, request, jsonify
from skill import handler

app = Flask(__name__)

@app.route('/catalog/<item_id>')
def get_item(item_id):
    try:
        result = handler({'item_id': item_id})
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@app.route('/catalog/search')
def search():
    query = request.args.get('q')
    if not query:
        return jsonify({'error': 'Query parameter required'}), 400

    result = handler({'query': query, 'operation': 'search_catalog'})
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
```

### Using in FastAPI

```python
from fastapi import FastAPI, HTTPException
from skill import handler

app = FastAPI()

@app.get("/catalog/{item_id}")
async def get_item(item_id: str):
    try:
        result = handler({'item_id': item_id})
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/catalog/search/{query}")
async def search(query: str):
    result = handler({'query': query, 'operation': 'search_catalog'})
    return result
```

### Using in Pytest

```python
import pytest
from skill import handler

def test_get_catalog_item():
    result = handler({'item_id': 'A123'})
    assert result['operation'] == 'get_catalog_item'
    assert result['item']['id'] == 'A123'
    assert 'price' in result['item']

def test_search_catalog():
    result = handler({'query': 'premium', 'operation': 'search_catalog'})
    assert result['operation'] == 'search_catalog'
    assert isinstance(result['results'], list)
    assert result['count'] > 0

def test_missing_item_id():
    with pytest.raises(ValueError, match="requires 'item_id' parameter"):
        handler({'operation': 'get_catalog_item'})

def test_invalid_operation():
    with pytest.raises(ValueError, match="Invalid operation"):
        handler({'operation': 'invalid', 'item_id': 'A123'})
```

---

## Debugging Tips

### Enable Detailed Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)

from skill import handler
result = handler({'item_id': 'A123'})
```

### Check MCP Server Status

```bash
# Check if server is running
lsof -i :3333

# Or use curl
curl http://localhost:3333/sse
```

### Inspect Raw MCP Response

```python
import asyncio
from skill import run
from mcp_client import mcp_session

async def debug_call():
    async with mcp_session() as session:
        result = await session.call_tool('get_catalog_item', {'item_id': 'A123'})
        print(f"Type: {type(result)}")
        print(f"Content: {result.content}")
        print(f"Content[0].text: {result.content[0].text}")

asyncio.run(debug_call())
```

---

## Summary

### ✅ DO

- Use `handler()` function for all calls
- Pass correct parameter names (`item_id`, `query`, `operation`)
- Handle `ValueError` exceptions
- Check that MCP server is running on port 3333

### ❌ DON'T

- Call `run()` directly without `await` or `asyncio.run()`
- Use incorrect parameter names
- Forget to specify `operation` for non-default operations
- Try to serialize coroutine objects with JSON

### Quick Reference

```python
# Import
from skill import handler

# Basic lookup
handler({'item_id': 'A123'})

# Summary
handler({'item_id': 'B456', 'operation': 'get_summary_item'})

# Search
handler({'query': 'premium', 'operation': 'search_catalog'})

# List tools
handler({'operation': 'list_tools'})
```

---

**Version:** 4.0.0
**Last Updated:** 2026-01-27
**Skill:** catalog_lookup_http
