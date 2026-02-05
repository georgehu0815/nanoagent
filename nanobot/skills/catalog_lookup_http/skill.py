import asyncio
import json
import sys
from mcp_client import mcp_session

async def run(inputs: dict) -> dict:
    # Default to get_catalog_item for backward compatibility
    operation = inputs.get("operation", "get_catalog_item")

    # Debug logging (to stderr to not interfere with JSON output)
    print(f"[Skill] Invoked with inputs: {inputs}", file=sys.stderr)
    print(f"[Skill] Operation: {operation}", file=sys.stderr)

    # Validate operation
    valid_operations = ["get_catalog_item", "get_summary_item", "search_catalog", "list_tools"]
    if operation not in valid_operations:
        raise ValueError(f"Invalid operation '{operation}'. Must be one of: {valid_operations}")

    async with mcp_session() as session:
        # Special handling for list_tools operation
        if operation == "list_tools":
            tools_response = await session.list_tools()
            tools_list = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema
                }
                for tool in tools_response.tools
            ]
            return {
                "tools": tools_list,
                "operation": operation,
                "count": len(tools_list)
            }

        # Prepare parameters based on operation
        if operation == "search_catalog":
            if "query" not in inputs:
                raise ValueError("search_catalog operation requires 'query' parameter")
            params = {"query": inputs["query"]}
        else:
            if "item_id" not in inputs:
                raise ValueError(f"{operation} operation requires 'item_id' parameter")
            params = {"item_id": inputs["item_id"]}

        print(f"[Skill] Calling MCP tool '{operation}' with params: {params}", file=sys.stderr)
        result = await session.call_tool(operation, params)
        print(f"[Skill] MCP response content: {result.content}", file=sys.stderr)

    # Extract JSON text from CallToolResult and parse it
    if result.content and len(result.content) > 0:
        # For search operations, MCP returns multiple TextContent items
        # Each item is a separate JSON object that needs to be parsed
        if operation == "search_catalog" and len(result.content) > 1:
            data = [json.loads(content.text) for content in result.content]
        else:
            data = json.loads(result.content[0].text)
    else:
        data = None

    # Return appropriate structure based on operation
    if operation == "search_catalog":
        # Ensure data is a list
        if data is None:
            data = []
        elif not isinstance(data, list):
            data = [data]

        return {
            "results": data,
            "operation": operation,
            "count": len(data)
        }
    else:
        return {
            "item": data,
            "operation": operation
        }

def handler(inputs: dict) -> dict:
    return asyncio.run(run(inputs))
