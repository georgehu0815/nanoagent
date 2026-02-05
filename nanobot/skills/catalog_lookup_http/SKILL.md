---
name: catalog-lookup-http
description: Retrieve catalog item information, summary, search, or list available tools via HTTP/SSE MCP server. Use when the user asks to look up, fetch, retrieve, search catalog items, or discover available operations.
user-invocable: true
disable-model-invocation: false
---

# Catalog Lookup (HTTP/SSE MCP)

You are a specialized skill for looking up and searching catalog items via an MCP server running over HTTP with Server-Sent Events (SSE).

## When to Use This Skill

Invoke this skill when the user:
- Asks to look up a catalog item by ID
- Wants information about a specific catalog item
- Requests a summary of a catalog item
- Wants to search for catalog items by name or keyword
- Wants to discover what tools/operations are available
- Mentions retrieving or fetching catalog data
- Provides a catalog item identifier (like "A123", "ITEM-456", etc.)

## Triggers:
- "Look up catalog item A123"
- "Get information about item PROD-999"
- "What's in catalog item XYZ?"
- "Fetch catalog data for A123"
- "Get summary for item B456"
- "Show me the summary of catalog item TEST-789"
- "Search for subscription items"
- "Find all premium products"
- "Search catalog for starter"
- "List all available catalog functions"
- "What operations can I perform?"
- "Show me all available tools"

## Capabilities
   - `get_catalog_item`: Retrieve a specific item by ID
   - `get_summary_item`: Retrieve detailed summary by ID
   - `search_catalog`: Search for items by query string
   - `list_tools`: List all available tools/operations on the MCP server

## How This Skill Works

This skill connects to an MCP (Model Context Protocol) server via HTTP/SSE to retrieve catalog information:

1. **MCP Server Must Be Running**: The skill requires an external MCP server at `http://localhost:3333` (configurable via `MCP_SERVER_URL` environment variable)
2. **SSE Connection**: Opens a Server-Sent Events connection to the MCP server
3. **Tool Invocation**: Calls one of four operations:
   - `get_catalog_item`: Retrieve a specific item by ID
   - `get_summary_item`: Retrieve detailed summary by ID
   - `search_catalog`: Search for items by query string
   - `list_tools`: List all available tools/operations on the MCP server
4. **Return Results**: Returns the catalog item(s), search results, or tool list to the user

## Architecture

```
Claude Code (You)
  ↓
This Skill (skill.py)
  ↓
MCP Client (mcp_client.py) via SSE
  ↓
MCP HTTP Server (mcp_server.py)
  ↓
Catalog Lookup Tool
```

## Usage

### Required Input (depends on operation)

- **item_id** (string): The catalog item identifier to look up (required for `get_catalog_item` and `get_summary_item`)
- **query** (string): The search query string (required for `search_catalog`)

### Optional Input

- **operation** (string): The operation to perform. Options:
  - `get_catalog_item` (default): Retrieves basic catalog item information
  - `get_summary_item`: Retrieves detailed summary with pricing and country information
  - `search_catalog`: Searches catalog items by name or ID
  - `list_tools`: Lists all available tools/operations on the MCP server (no parameters required)

### Expected Output

#### For Single Item Operations (`get_catalog_item`, `get_summary_item`)

Returns an object containing:
- **item** (object): The catalog or summary item data
- **operation** (string): The operation that was performed

##### Catalog Item Fields (`get_catalog_item`)

- **id**: The item identifier
- **name**: Item name
- **price**: Item price
- **currency**: Currency code
- **status**: Item status (e.g., "active", "inactive")

##### Summary Item Fields (`get_summary_item`)

- **id**: The item identifier
- **name**: Item name
- **summary**: Summary price
- **sale_price**: Sale price
- **country**: Country code
- **currency**: Currency code
- **status**: Item status (e.g., "active", "inactive")

#### For Search Operation (`search_catalog`)

Returns an object containing:
- **results** (array): List of catalog items matching the search query
- **count** (integer): Number of results found
- **operation** (string): The operation that was performed

Each item in results contains:
- **id**: The item identifier
- **name**: Item name
- **price**: Item price
- **currency**: Currency code
- **status**: Item status (e.g., "active", "inactive")

#### For List Tools Operation (`list_tools`)

Returns an object containing:
- **tools** (array): List of all available tools on the MCP server
- **count** (integer): Number of tools available
- **operation** (string): The operation that was performed

Each tool in the array contains:
- **name**: The tool name
- **description**: Tool description
- **input_schema**: JSON schema for the tool's input parameters

### Example Interactions

#### Example 1: Basic Catalog Lookup

**User**: "Look up catalog item A123"

**You should**:
1. Extract the item ID: "A123"
2. Invoke this skill with `item_id: "A123"`
3. Present the results to the user in a clear format

**Expected Result**:
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

#### Example 2: Summary Lookup

**User**: "Get summary for catalog item B456"

**You should**:
1. Extract the item ID: "B456"
2. Detect that the user wants a summary
3. Invoke this skill with `item_id: "B456"` and `operation: "get_summary_item"`

**Expected Result**:
```json
{
  "item": {
    "id": "B456",
    "name": "Premium Subscription",
    "summary": 129.99,
    "sale_price": 99.99,
    "country": "US",
    "currency": "USD",
    "status": "active"
  },
  "operation": "get_summary_item"
}
```

#### Example 3: Catalog Search

**User**: "Search for premium items in the catalog"

**You should**:
1. Extract the search query: "premium"
2. Detect that the user wants to search
3. Invoke this skill with `query: "premium"` and `operation: "search_catalog"`

**Expected Result**:
```json
{
  "results": [
    {
      "id": "PROD-001",
      "name": "Premium Subscription",
      "price": 29.99,
      "currency": "USD",
      "status": "active"
    },
    {
      "id": "PROD-004",
      "name": "Premium Plus Bundle",
      "price": 49.99,
      "currency": "USD",
      "status": "active"
    }
  ],
  "count": 2,
  "operation": "search_catalog"
}
```

#### Example 4: List Available Tools

**User**: "Show me all available catalog functions"

**You should**:
1. Detect that the user wants to discover available operations
2. Invoke this skill with `operation: "list_tools"`
3. No other parameters needed

**Expected Result**:
```json
{
  "tools": [
    {
      "name": "get_catalog_item",
      "description": "Retrieve catalog item data by ID",
      "input_schema": {...}
    },
    {
      "name": "get_summary_item",
      "description": "Retrieve summary item data by ID",
      "input_schema": {...}
    },
    {
      "name": "search_catalog",
      "description": "Search catalog items by query string",
      "input_schema": {...}
    }
  ],
  "count": 3,
  "operation": "list_tools"
}
```

## Configuration

### MCP Server URL

Default: `http://localhost:3333/sse`

To customize, set the environment variable:
```bash
export MCP_SERVER_URL=http://your-server:port/sse
```

## Error Handling

If the skill fails, check:

1. **MCP Server Not Running**: Ensure the MCP server is started
   ```bash
   python mcp_server.py
   ```

2. **Connection Issues**: Verify the server URL is correct and accessible

3. **Missing Dependencies**: Ensure Python packages are installed
   ```bash
   pip install -r requirements.txt
   ```

When an error occurs, inform the user and suggest checking that the MCP server is running.

## Implementation Details

The skill uses:
- **[skill.py](skill.py)**: Main entrypoint, handles async execution and operation routing
- **[mcp_client.py](mcp_client.py)**: MCP HTTP/SSE client implementation
- **[mcp_server.py](mcp_server.py)**: Separate MCP server with multiple tools (must run independently)

The skill is implemented as a Python async function that:
1. Opens an SSE session with the MCP server
2. Determines which operation to perform based on the `operation` parameter
3. For `list_tools`: Uses the MCP protocol's built-in `list_tools()` method
4. For other operations: Validates and prepares the appropriate parameters (`item_id` for single lookups, `query` for search)
5. Calls the appropriate tool (`get_catalog_item`, `get_summary_item`, or `search_catalog`) via the MCP protocol
6. Extracts and parses the JSON response
7. Returns the result with operation metadata (single item, array of results, or tools list)

## Available Operations

The skill supports four operations:

1. **get_catalog_item**: Retrieves basic catalog item information by ID (id, name, price, currency, status)
2. **get_summary_item**: Retrieves detailed summary information by ID (id, name, summary, sale_price, country, currency, status)
3. **search_catalog**: Searches catalog items by query string, returns array of matching items
4. **list_tools**: Lists all available tools on the MCP server (uses MCP protocol's built-in discovery feature)

## Extending This Skill

To add more catalog operations:

1. Add new tools to [mcp_server.py](mcp_server.py):
   ```python
   @mcp.tool()
   def get_catalog_by_category(category: str) -> list:
       """Get catalog items by category"""
       # Implementation
   ```

2. Update [skill.py](skill.py) to:
   - Add the new operation to `valid_operations` list
   - Handle the new parameter requirements
   - Format the response appropriately

3. Update [skill.yaml](skill.yaml) to document the new operation and parameters

4. Update this SKILL.md to document the new functionality with examples

## References

- [README.md](README.md) - Technical overview and architecture
- [INSTALLATION.md](INSTALLATION.md) - Complete installation guide
- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [FastMCP Library](https://github.com/jlowin/fastmcp)
