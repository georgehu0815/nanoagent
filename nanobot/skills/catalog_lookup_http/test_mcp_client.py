#!/usr/bin/env python3
"""
Test script for MCP client
Tests the client connection and tool invocation
"""
import asyncio
import sys
from mcp_client import mcp_session


async def test_client_connection():
    """Test that the client can connect to the server"""
    print("Test 1: Testing client connection...")
    try:
        async with mcp_session() as session:
            print("✓ Successfully connected to MCP server")
            return True
    except Exception as e:
        print(f"✗ Failed to connect to MCP server: {e}")
        return False


async def test_list_tools():
    """Test that the client can list available tools"""
    print("\nTest 2: Testing tool listing...")
    try:
        async with mcp_session() as session:
            tools = await session.list_tools()
            print(f"✓ Found {len(tools.tools)} tool(s):")
            for tool in tools.tools:
                print(f"  - {tool.name}: {tool.description}")
            return True
    except Exception as e:
        print(f"✗ Failed to list tools: {e}")
        return False


async def test_call_tool():
    """Test calling the get_catalog_item tool"""
    print("\nTest 3: Testing tool invocation...")
    test_item_id = "TEST-123"

    try:
        async with mcp_session() as session:
            result = await session.call_tool(
                "get_catalog_item",
                {"item_id": test_item_id}
            )
            print(f"✓ Successfully called tool 'get_catalog_item'")
            print(f"  Request: item_id={test_item_id}")
            print(f"  Response: {result.content}")
            return True
    except Exception as e:
        print(f"✗ Failed to call tool: {e}")
        return False


async def test_multiple_calls():
    """Test multiple sequential calls"""
    print("\nTest 4: Testing multiple sequential calls...")
    test_ids = ["ITEM-1", "ITEM-2", "ITEM-3"]

    try:
        async with mcp_session() as session:
            for item_id in test_ids:
                result = await session.call_tool(
                    "get_catalog_item",
                    {"item_id": item_id}
                )
                print(f"✓ Call for {item_id} succeeded")
            return True
    except Exception as e:
        print(f"✗ Multiple calls failed: {e}")
        return False


async def run_all_tests():
    """Run all tests and report results"""
    print("=" * 60)
    print("MCP Client Test Suite")
    print("=" * 60)

    tests = [
        test_client_connection,
        test_list_tools,
        test_call_tool,
        test_multiple_calls
    ]

    results = []
    for test in tests:
        result = await test()
        results.append(result)

    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")

    if passed == total:
        print("✓ All tests passed!")
        return 0
    else:
        print(f"✗ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)
