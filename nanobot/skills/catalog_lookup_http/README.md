# Claude Code Skill: Catalog Lookup (HTTP/SSE MCP)

A Claude Code skill that demonstrates how to integrate with an **MCP server over HTTP + Server-Sent Events (SSE)** for catalog item lookups.

## Quick Start

**New to this skill?** → See [INSTALLATION.md](INSTALLATION.md) for detailed setup instructions.

### Installation Summary

1. Copy this directory to your Claude Code skills folder:
   ```bash
   cp -r . ~/.config/claude/skills/catalog_lookup_http
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the MCP server:
   ```bash
   python mcp_server.py
   ```

4. Use the skill in Claude Code:
   ```
   Look up catalog item A123
   ```

---

## Architecture

```
Claude Code Skill
  ↓
MCP Client (SSE)
  ↓
MCP HTTP Server
  ↓
Tool Functions (get_catalog_item)
```

This architecture separates concerns:
- **Skill** ([skill.py](skill.py)): Orchestration and Claude Code integration
- **MCP Client** ([mcp_client.py](mcp_client.py)): Handles HTTP/SSE communication
- **MCP Server** ([mcp_server.py](mcp_server.py)): Implements business logic and data access

---

## Files

| File | Purpose |
|------|---------|
| [SKILL.md](SKILL.md) | **REQUIRED** - Claude Code skill definition with frontmatter and instructions |
| [skill.yaml](skill.yaml) | Programmatic skill manifest (metadata, inputs, outputs) |
| [skill.py](skill.py) | Python entrypoint - invoked by Claude Code to execute the skill |
| [mcp_client.py](mcp_client.py) | MCP HTTP/SSE client for server communication |
| [mcp_server.py](mcp_server.py) | MCP HTTP server with catalog lookup tool |
| [requirements.txt](requirements.txt) | Python dependencies |
| [INSTALLATION.md](INSTALLATION.md) | Complete installation and setup guide |
| [.env.example](.env.example) | Environment variable configuration template |

**Note**: This is a **programmatic skill** that combines:
- `SKILL.md` for Claude Code to understand when/how to invoke the skill
- `skill.py` + supporting files for the actual Python implementation

---

## Skill Architecture: SKILL.md vs skill.yaml

This skill uses a **hybrid approach**:

### SKILL.md (Required by Claude Code)
- **Purpose**: Claude Code's entry point for discovering and understanding the skill
- **Format**: YAML frontmatter + Markdown instructions
- **Contains**: When to invoke the skill, description, configuration
- **Claude uses this to**: Decide when to automatically invoke the skill and what context to provide

### skill.yaml + skill.py (Programmatic Implementation)
- **Purpose**: Defines the actual executable behavior
- **Format**: YAML config + Python code
- **Contains**: Input/output schemas, implementation logic
- **Used for**: Executing the skill's actual functionality (MCP communication)

**Why both?**
- `SKILL.md` follows Claude Code's standard discovery mechanism
- `skill.yaml` + `skill.py` provide a structured programmatic interface
- This separation allows clear documentation (SKILL.md) while maintaining clean code architecture (skill.py)

If you're building a simple instruction-based skill, you only need `SKILL.md`. For complex programmatic skills like this one that interact with external services, both are useful.

---

## Usage

### Using the Skill

Once installed, you can invoke the skill naturally in Claude Code:

```
User: Look up catalog item A123
Claude: [Invokes catalog_lookup_http skill]
```

Or explicitly:

```bash
claude run catalog_lookup_http --item_id A123
```

### Example Input

```json
{
  "item_id": "A123"
}
```

### Example Output

```json
{
  "item": {
    "id": "A123",
    "name": "Premium Subscription",
    "price": 29.99,
    "currency": "USD",
    "status": "active"
  }
}
```

---

## Configuration

### MCP Server URL

By default, the skill connects to `http://localhost:3333/sse`. To customize:

**Option 1**: Environment variable
```bash
export MCP_SERVER_URL=http://your-server:port/sse
```

**Option 2**: Create a `.env` file
```bash
cp .env.example .env
# Edit .env and set MCP_SERVER_URL
```

### Server Port

Edit [mcp_server.py](mcp_server.py:22-26) to change the port:

```python
mcp.run(
    transport="http",
    host="0.0.0.0",
    port=3333  # Change this
)
```

---

## Development

### Prerequisites

- Python 3.10+
- Claude Code installed
- Dependencies: `mcp`, `fastapi`, `uvicorn`

### Running Locally

1. Start the MCP server:
   ```bash
   python mcp_server.py
   ```

2. In another terminal, use Claude Code to test the skill

### Customizing the Tool

Edit [mcp_server.py](mcp_server.py) to modify the `get_catalog_item` function:

```python
@mcp.tool()
def get_catalog_item(item_id: str) -> dict:
    """
    Retrieve catalog item data by ID
    """
    # Add your custom logic here
    # Connect to database, call APIs, etc.
    return {
        "id": item_id,
        "name": "Your Item",
        # ...
    }
```

---

## Why HTTP/SSE MCP?

This approach offers several advantages:

✅ **Network-agnostic**: Works across containers, networks, and cloud environments
✅ **Scalable**: Deploy MCP server independently from Claude Code
✅ **Observable**: HTTP requests are easy to log, monitor, and debug
✅ **Secure**: Add authentication, rate limiting, and TLS at the HTTP layer
✅ **Cloud-ready**: Deploy to Azure Container Apps, AKS, AWS ECS, etc.

Contrast with stdio-based MCP:
- stdio: Good for local, single-process tools
- HTTP/SSE: Better for distributed, production-grade systems

---

## Production Deployment

For production use, see [INSTALLATION.md](INSTALLATION.md#production-deployment) for detailed guidance on:

- Running as a system service
- Deploying to cloud platforms (Azure, AWS, GCP)
- Adding authentication and security
- Monitoring and observability
- Docker containerization

### Quick Production Checklist

- [ ] Enable TLS/HTTPS
- [ ] Add authentication (JWT, API keys, MSI)
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Deploy behind load balancer/reverse proxy
- [ ] Use environment variables for configuration
- [ ] Add health check endpoints
- [ ] Configure automatic restarts

---

## Recommended Cloud Deployments

### Azure
- **Azure Container Apps** (recommended) - Managed containers with auto-scaling
- **Azure Kubernetes Service (AKS)** - Full Kubernetes control
- **Azure App Service** - Platform-as-a-service option

### AWS
- **AWS Fargate** - Serverless containers
- **Amazon ECS** - Container orchestration
- **AWS Lambda** (with adapter) - Serverless functions

### Google Cloud
- **Cloud Run** - Fully managed containers
- **Google Kubernetes Engine (GKE)** - Managed Kubernetes

---

## Security Model

The skill follows a secure separation of concerns:

| Component | Responsibility | Security Boundary |
|-----------|----------------|-------------------|
| **Skill** | Orchestration only | Runs in Claude Code process |
| **MCP Server** | Data access & business logic | Separate process/container |
| **Tools** | Explicitly declared | Auditable via MCP protocol |

Benefits:
- Skill code is minimal and reviewable
- Server can enforce authentication independently
- Tools are explicitly declared and discoverable
- Clear audit trail for all operations

---

## Troubleshooting

### Connection Issues

**Problem**: "Cannot connect to MCP server"

**Solution**: Ensure the MCP server is running:
```bash
python mcp_server.py
```

### Skill Not Found

**Problem**: Claude Code doesn't recognize the skill

**Solution**: Verify installation location:
```bash
ls ~/.config/claude/skills/catalog_lookup_http/skill.yaml
```

### Import Errors

**Problem**: `ModuleNotFoundError`

**Solution**: Install dependencies:
```bash
pip install -r requirements.txt
```

For more troubleshooting, see [INSTALLATION.md](INSTALLATION.md#troubleshooting).

---

## Contributing

To extend this skill:

1. **Add new tools**: Modify [mcp_server.py](mcp_server.py) and add `@mcp.tool()` decorators
2. **Update skill interface**: Edit [skill.yaml](skill.yaml) for new inputs/outputs
3. **Enhance client**: Modify [mcp_client.py](mcp_client.py) for advanced MCP features
4. **Update entrypoint**: Edit [skill.py](skill.py) to handle new tool calls

---

## Learn More

- **Claude Code Documentation**: [https://docs.anthropic.com/claude-code](https://docs.anthropic.com/claude-code)
- **MCP Protocol**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- **FastMCP**: [https://github.com/jlowin/fastmcp](https://github.com/jlowin/fastmcp)

---

## License

[Specify your license here]

---

## Support

Questions or issues? See [INSTALLATION.md](INSTALLATION.md#support) for support resources.
