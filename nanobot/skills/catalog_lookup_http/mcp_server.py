from mcp.server.fastmcp import FastMCP

mcp = FastMCP("catalog-service-http", host="0.0.0.0", port=3333, debug=True)

@mcp.tool()
def get_catalog_item(item_id: str) -> dict:
    """
    Retrieve catalog item data by ID
    """
    return {
        "id": item_id,
        "name": "Premium Subscription",
        "price": 29.99,
        "currency": "USD",
        "status": "active"
    }

@mcp.tool()
def get_summary_item(item_id: str) -> dict:
    """
    Retrieve summary item data by ID
    """
    return {
        "id": item_id,
        "name": "Premium Subscription",
        "summary": 129.99,
        "sale_price": 99.99,
        "owner": "jeremy",
        "country": "US",
        "currency": "USD",
        "status": "active"
    }

@mcp.tool(name="search_catalog")
def search_catalog(query: str) -> list:
    """
    Search catalog items by query string
    """
    # Mock catalog data for demonstration
    print(f"[MCP Server] search_catalog called with query='{query}' - mcp_server.py:40")
    catalog_items = [
        {
            "id": "PROD-001",
            "name": "Premium Subscription",
            "price": 29.99,
            "currency": "USD",
            "status": "active"
        },
        {
            "id": "PROD-002",
            "name": "Basic Subscription",
            "price": 9.99,
            "currency": "USD",
            "status": "active"
        },
        {
            "id": "PROD-000",
            "name": "george 's Subscription",
            "price": 9.99,
            "currency": "USD",
            "status": "active"
        },
        {
            "id": "PROD-003",
            "name": "Enterprise Subscription",
            "price": 99.99,
            "currency": "USD",
            "status": "active"
        },
        {
            "id": "PROD-004",
            "name": "Premium Plus Bundle",
            "price": 49.99,
            "currency": "USD",
            "status": "active"
        },
        {
            "id": "PROD-005",
            "name": "Starter Pack",
            "price": 4.99,
            "currency": "USD",
            "status": "inactive"
        },
        {
            "id": "PROD-006",
            "name": "George's Special Pack",
            "price": 14.99,
            "currency": "USD",
            "status": "active"
        }
    ]

    # Filter items by query (case-insensitive search in name and id)
    query_lower = query.lower()
    results = [
        item for item in catalog_items
        if query_lower in item["name"].lower() or query_lower in item["id"].lower()
    ]

    # Debug logging
    print(f"[MCP Server] search_catalog called with query='{query}' - mcp_server.py:101")
    print(f"[MCP Server] Found {len(results)} results - mcp_server.py:102")
    for item in results:
        print(f"[MCP Server]    {item['id']}: {item['name']} - mcp_server.py:104")

    return results

if __name__ == "__main__":
    # Exposes:
    print("Starting MCP server on http://0.0.0.0:3333 - mcp_server.py:110")
    mcp.run(
        transport="sse"

    )
