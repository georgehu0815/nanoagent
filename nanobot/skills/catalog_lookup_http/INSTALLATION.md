# Installation Guide: Catalog Lookup HTTP/SSE Skill

This guide walks you through installing and configuring the **Catalog Lookup HTTP/SSE** skill for Claude Code.

## Overview

This skill demonstrates how to integrate a Claude Code skill with an MCP server running over HTTP and Server-Sent Events (SSE). It consists of:

- **Skill Components**: The Claude Code skill files (`skill.yaml`, `skill.py`, etc.)
- **MCP Server**: A separate HTTP server that provides the catalog lookup functionality

---

## Prerequisites

Before you begin, ensure you have:

- **Claude Code** installed and configured
- **Python 3.10+** installed
- **pip** package manager

---

## Installation Steps

### 1. Locate Your Claude Code Skills Directory

The default skills directory location varies by platform:

- **macOS/Linux**: `~/.config/claude/skills/`
- **Windows**: `%APPDATA%\claude\skills\`

You can also check your Claude Code configuration to find the custom skills path if you've set one.

### 2. Copy the Skill to the Skills Directory

Copy this entire repository directory into your Claude Code skills directory.

**If you're currently IN the skill directory:**

```bash
# Example for macOS/Linux
cp -r . ~/.claude/skills/catalog_lookup_http
cp -r . ~/clawd/skills/catalog_lookup_http
cp -r . ~/.clawdbot/skills/catalog_lookup_http
cp -r . ~/aiworker/clawdbot/skills/catalog_lookup_http

# Or create a symbolic link if you want to keep it in the original location
ln -s "$(pwd)" ~/.claude/skills/catalog_lookup_http
```

**If you're in a different directory:**

```bash
# Replace with the actual path to your skill directory
cp -r /path/to/claude_catalog_skill_http_sse ~/.claude/skills/catalog_lookup_http

# Or with symbolic link
ln -s /path/to/claude_catalog_skill_http_sse ~/.claude/skills/catalog_lookup_http
```

Your skills directory should now contain:

```
~/.config/claude/skills/
└── catalog_lookup_http/
    ├── SKILL.md           # REQUIRED - Skill definition for Claude Code
    ├── skill.yaml         # Programmatic skill metadata
    ├── skill.py           # Python implementation entrypoint
    ├── mcp_client.py      # MCP HTTP/SSE client
    ├── mcp_server.py      # MCP server (runs separately)
    ├── requirements.txt   # Python dependencies
    ├── README.md          # This documentation
    ├── INSTALLATION.md    # Installation guide
    └── .env.example       # Configuration template
```

**Important**: `SKILL.md` is the **required file** that Claude Code uses to recognize and load this skill. The other files provide the programmatic implementation.

### 3. Install Python Dependencies

Navigate to the skill directory and install the required dependencies:

```bash
cd ~/.config/claude/skills/catalog_lookup_http
pip install -r requirements.txt
```

Or install globally:

```bash
pip install mcp fastapi uvicorn python-dotenv
```

**Note**: Consider using a virtual environment to isolate dependencies:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configure the Skill (Optional)

If you need to change the MCP server URL from the default `http://localhost:3333/sse`, you can set an environment variable:

```bash
# Create a .env file in the skill directory
echo "MCP_SERVER_URL=http://your-server:port/sse" > .env
```

Or export it in your shell:

```bash
export MCP_SERVER_URL=http://your-server:port/sse
```

---

## Running the MCP Server

The skill requires an MCP server to be running. Start the server in a separate terminal:

```bash
cd ~/.config/claude/skills/catalog_lookup_http
python mcp_server.py
```

You should see output indicating the server is running:

```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:3333 (Press CTRL+C to quit)
```

The server provides:
- **SSE endpoint**: `GET http://localhost:3333/sse` - For MCP communication
- **Tool endpoints**: `POST http://localhost:3333/tools/{tool_name}` - For tool execution

**Important**: Keep this server running while using the skill with Claude Code.

---

## Verify the Installation

### 1. Check that Claude Code Recognizes the Skill

Run Claude Code and list available skills:

```bash
claude /skills
```

You should see `catalog_lookup_http` in the list.

### 2. Test the Skill

In Claude Code, invoke the skill:

```bash
claude run catalog_lookup_http --item_id A123
```

Or use it naturally in conversation:

```
User: Look up catalog item A123 using the catalog skill
```

Expected response:

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

## Troubleshooting

### Skill Not Found

**Problem**: Claude Code doesn't recognize the skill.

**Solutions**:
- Verify the skill directory path is correct
- Ensure `SKILL.md` is present and properly formatted (this is the required file)
- Check that YAML frontmatter in `SKILL.md` is valid
- Restart Claude Code after copying the skill
- Check Claude Code logs for errors

### Connection Refused

**Problem**: Skill fails with "Connection refused" or "Cannot connect to MCP server"

**Solutions**:
- Ensure the MCP server is running (`python mcp_server.py`)
- Verify the server is listening on the correct port (default: 3333)
- Check firewall settings
- Verify `MCP_SERVER_URL` environment variable if customized

### Import Errors

**Problem**: `ModuleNotFoundError` or import errors when running the skill

**Solutions**:
- Install dependencies: `pip install -r requirements.txt`
- Ensure Python 3.10+ is being used
- Check that the correct Python interpreter is active (especially if using virtual environments)

### Permission Errors

**Problem**: Permission denied when accessing skill files

**Solutions**:
- Check file permissions: `chmod -R 755 ~/.config/claude/skills/catalog_lookup_http`
- Ensure the user running Claude Code has read access to the skill directory

---

## Production Deployment

For production use, consider:

### 1. Run MCP Server as a Service

Create a systemd service (Linux) or use process managers like `supervisor`:

```ini
# /etc/systemd/system/mcp-catalog.service
[Unit]
Description=MCP Catalog Service
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/skill
ExecStart=/usr/bin/python3 mcp_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

### 2. Deploy to Cloud

Deploy the MCP server as:
- **Azure Container Apps** (recommended)
- **Azure Kubernetes Service (AKS)**
- **AWS ECS/Fargate**
- **Google Cloud Run**

Update `MCP_SERVER_URL` to point to your cloud endpoint:

```bash
export MCP_SERVER_URL=https://your-mcp-server.azurecontainerapps.io/sse
```

### 3. Add Security

- Enable TLS/HTTPS
- Add authentication (JWT, API keys, Azure Managed Identity)
- Implement rate limiting
- Use environment variables for sensitive configuration

### 4. Monitoring

- Add logging and monitoring
- Set up health check endpoints
- Configure alerts for failures

---

## Uninstallation

To remove the skill:

```bash
# Remove the skill directory
rm -rf ~/.config/claude/skills/catalog_lookup_http

# Stop the MCP server if running
pkill -f mcp_server.py
```

---

## Advanced Configuration

### Custom MCP Server Port

Edit [mcp_server.py](mcp_server.py):

```python
if __name__ == "__main__":
    mcp.run(
        transport="http",
        host="0.0.0.0",
        port=8080  # Change to your desired port
    )
```

Then update the client configuration:

```bash
export MCP_SERVER_URL=http://localhost:8080/sse
```

### Using with Docker

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3333
CMD ["python", "mcp_server.py"]
```

Build and run:

```bash
docker build -t mcp-catalog-server .
docker run -p 3333:3333 mcp-catalog-server
```

---

## Support

For issues or questions:

1. Check the [README.md](README.md) for usage examples
2. Review Claude Code documentation
3. Check MCP documentation at https://modelcontextprotocol.io

---

## License

[Add your license information here]
