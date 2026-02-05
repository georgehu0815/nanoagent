import os
from contextlib import asynccontextmanager
from mcp import ClientSession
from mcp.client.sse import sse_client

# Configuration: MCP server URL
# Can be overridden via environment variable MCP_SERVER_URL
DEFAULT_MCP_SERVER_URL = "http://localhost:3333/sse"

@asynccontextmanager
async def mcp_session():
    server_url = os.getenv("MCP_SERVER_URL", DEFAULT_MCP_SERVER_URL)
    async with sse_client(
        url=server_url
    ) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session
