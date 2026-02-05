#!/usr/bin/env python3
"""
Render catalog_lookup_http skill architecture diagram to PDF
"""

from graphviz import Digraph

def create_architecture_diagram():
    """Create a comprehensive architecture diagram for catalog_lookup_http skill"""

    # Create a new directed graph
    dot = Digraph(comment='catalog_lookup_http Architecture', format='pdf')
    dot.attr(rankdir='TB', size='11,17', dpi='300')
    dot.attr('node', shape='box', style='rounded,filled', fontname='Arial')
    dot.attr('edge', fontname='Arial', fontsize='10')

    # Main title
    dot.attr(label='Catalog Lookup HTTP/SSE MCP Skill Architecture\nVersion 4.0.0',
             fontsize='20', fontname='Arial Bold', labelloc='t')

    # 1. Claude Code (Client)
    dot.node('claude', 'Claude Code\n(Client)',
             fillcolor='lightblue', fontsize='14', shape='box', style='filled,rounded')

    # 2. Skill Layer
    with dot.subgraph(name='cluster_skill') as c:
        c.attr(label='Skill Layer', style='dashed', color='blue')
        c.node('yaml', 'skill.yaml\nv4.0.0\n\n4 Operations:\n• get_catalog_item\n• get_summary_item\n• search_catalog\n• list_tools',
               fillcolor='lightyellow', fontsize='11')
        c.node('perms', 'Permissions\nGranted in settings',
               fillcolor='lightgreen', fontsize='10')

    # 3. skill.py (Entrypoint)
    dot.node('skill_py', 'skill.py\n(Python Handler)\n\n• Operation routing\n• Parameter validation\n• JSON serialization\n• Async execution',
             fillcolor='wheat', fontsize='11')

    # 4. mcp_client.py
    dot.node('mcp_client', 'mcp_client.py\n(MCP Client)\n\n• SSE connection\n• Session management\n• Tool invocation',
             fillcolor='lightcoral', fontsize='11')

    # 5. MCP Server
    dot.node('mcp_server', 'MCP Server\n(mcp_server.py)\n\nHTTP/SSE Transport\nlocalhost:3333',
             fillcolor='plum', fontsize='12', shape='box3d')

    # 6. MCP Tools
    with dot.subgraph(name='cluster_tools') as c:
        c.attr(label='MCP Tools', style='filled', color='lightgray', fillcolor='white')
        c.node('tool1', 'get_catalog_item\n\nInput: item_id\nOutput: Basic catalog data\n(id, name, price, currency, status)',
               fillcolor='lightcyan', fontsize='10')
        c.node('tool2', 'get_summary_item\n\nInput: item_id\nOutput: Summary data\n(summary, sale_price, country)',
               fillcolor='lightcyan', fontsize='10')
        c.node('tool3', 'search_catalog\n\nInput: query\nOutput: Array of items\nmatching search',
               fillcolor='lightcyan', fontsize='10')

    # Operations Panel (to the right)
    with dot.subgraph(name='cluster_ops') as c:
        c.attr(label='Operation Flows', style='filled', color='darkgreen', fillcolor='honeydew')
        c.node('op1', '1. get_catalog_item\nitem_id → Basic catalog data',
               fillcolor='white', fontsize='9', shape='note')
        c.node('op2', '2. get_summary_item\nitem_id → Summary with pricing',
               fillcolor='white', fontsize='9', shape='note')
        c.node('op3', '3. search_catalog\nquery → Array of results',
               fillcolor='white', fontsize='9', shape='note')
        c.node('op4', '4. list_tools\nno params → Tool schemas',
               fillcolor='white', fontsize='9', shape='note')

    # Key Features Panel
    with dot.subgraph(name='cluster_features') as c:
        c.attr(label='Key Features', style='filled', color='darkred', fillcolor='mistyrose')
        c.node('features',
               'Version 4.0.0\nHTTP/SSE Transport\nJSON Serialization Fix\nPermission Granted\nBackward Compatible\nTool Discovery',
               fillcolor='white', fontsize='9', shape='note')

    # Main flow edges
    dot.edge('claude', 'yaml', label='User Request', color='blue', penwidth='2')
    dot.edge('yaml', 'skill_py', label='Route to handler', color='blue')
    dot.edge('perms', 'skill_py', style='dashed', color='green')
    dot.edge('skill_py', 'mcp_client', label='Async call', color='blue')
    dot.edge('mcp_client', 'mcp_server', label='SSE Connection\nlocalhost:3333/sse', color='blue', penwidth='2')

    # Server to tools
    dot.edge('mcp_server', 'tool1', label='invoke', color='purple')
    dot.edge('mcp_server', 'tool2', label='invoke', color='purple')
    dot.edge('mcp_server', 'tool3', label='invoke', color='purple')

    # Return flow
    dot.edge('mcp_server', 'mcp_client', label='JSON Response', color='red', style='dashed')
    dot.edge('mcp_client', 'skill_py', label='CallToolResult', color='red', style='dashed')
    dot.edge('skill_py', 'yaml', label='Parse & Format', color='red', style='dashed')
    dot.edge('yaml', 'claude', label='Return to Client', color='red', style='dashed', penwidth='2')

    # Special list_tools flow
    dot.edge('mcp_client', 'mcp_server', label='session.list_tools()',
             color='orange', style='dotted', constraint='false')

    # Operation references
    dot.edge('yaml', 'op1', style='invis')
    dot.edge('yaml', 'op2', style='invis')
    dot.edge('yaml', 'op3', style='invis')
    dot.edge('yaml', 'op4', style='invis')

    dot.edge('yaml', 'features', style='invis')

    return dot

if __name__ == '__main__':
    print("Generating catalog_lookup_http architecture diagram...")

    diagram = create_architecture_diagram()

    # Save to PDF
    output_path = '/Users/ghu/.claude/skills/catalog_lookup_http_architecture'
    diagram.render(output_path, cleanup=True)

    print(f"✅ Diagram saved to: {output_path}.pdf")
    print(f"📍 File size: ", end='')

    import os
    size = os.path.getsize(f"{output_path}.pdf")
    print(f"{size / 1024:.1f} KB")
