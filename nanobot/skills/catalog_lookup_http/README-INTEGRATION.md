# Integrating catalog_lookup_http as an Executable Tool

## Current State

The `catalog_lookup_http` skill is currently **prompt-based only**:
- ✅ Skill appears in agent's system prompt
- ✅ SKILL.md is readable by the agent
- ❌ skill.py is NOT automatically executed by Clawdbot
- ❌ Agent hallucinates responses instead of calling real MCP server

## Solution: Register as a Clawdbot Plugin Tool

To make this skill **actually executable**, convert it to a Clawdbot plugin:

### Step 1: Create Plugin Structure

```
plugins/catalog-lookup-http/
├── package.json
├── src/
│   ├── index.ts          # Plugin entry point
│   ├── tool.ts           # Tool registration
│   └── mcp-bridge.ts     # Bridge to Python MCP client
└── skill/
    ├── skill.py          # Existing Python implementation
    ├── mcp_client.py
    └── requirements.txt
```

### Step 2: Implement Plugin (TypeScript)

**plugins/catalog-lookup-http/src/index.ts**:
```typescript
import type { ClawdbotPlugin } from "clawdbot/plugin-sdk";
import { registerCatalogLookupTool } from "./tool.js";

export default function plugin(api: ClawdbotPlugin) {
  registerCatalogLookupTool(api);
}
```

**plugins/catalog-lookup-http/src/tool.ts**:
```typescript
import { spawn } from "node:child_process";
import path from "node:path";
import type { ClawdbotPlugin } from "clawdbot/plugin-sdk";

export function registerCatalogLookupTool(api: ClawdbotPlugin) {
  api.registerTool({
    name: "catalog_lookup",
    description: "Retrieve catalog item information via HTTP/SSE MCP server",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["get_catalog_item", "get_summary_item", "search_catalog", "list_tools"],
          description: "Operation to perform",
          default: "get_catalog_item"
        },
        item_id: {
          type: "string",
          description: "Catalog item ID (required for get_catalog_item and get_summary_item)"
        },
        query: {
          type: "string",
          description: "Search query (required for search_catalog)"
        }
      }
    },
    async execute(toolCallId, params, signal) {
      const skillDir = path.join(__dirname, "../skill");
      const pythonPath = path.join(skillDir, ".venv/bin/python3");
      const skillPath = path.join(skillDir, "skill.py");

      return new Promise((resolve, reject) => {
        const proc = spawn(pythonPath, [
          "-c",
          `import json, sys; from skill import handler; print(json.dumps(handler(json.load(sys.stdin))))`
        ], {
          cwd: skillDir,
          stdio: ["pipe", "pipe", "pipe"]
        });

        proc.stdin.write(JSON.stringify(params));
        proc.stdin.end();

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => stdout += data);
        proc.stderr.on("data", (data) => stderr += data);

        proc.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`Skill failed: ${stderr}`));
            return;
          }

          try {
            const result = JSON.parse(stdout);
            resolve({
              role: "toolResult",
              toolCallId,
              toolName: "catalog_lookup",
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            });
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  });
}
```

### Step 3: Update Configuration

**~/.clawdbot/config.yaml**:
```yaml
plugins:
  - path: ./plugins/catalog-lookup-http
    enabled: true

skills:
  entries:
    catalog-lookup-http:
      enabled: true
```

### Step 4: Rebuild and Test

```bash
cd plugins/catalog-lookup-http
pnpm install
pnpm build

cd ../..
pnpm clawdbot agent --local --agent main --message "Look up catalog item A123"
```

## Option 2: Use as Documentation-Only Skill

Keep the current implementation but update SKILL.md to clarify that the agent should:

1. Read the skill documentation
2. Manually execute Python commands using the `exec` tool
3. Parse and present results

This is less seamless but requires no code changes.

## Recommendation

**Use Option 1 (Plugin Tool)** for:
- Seamless integration
- Automatic execution
- Type-safe parameters
- Better error handling

**Use Option 2 (Documentation)** for:
- Quick prototyping
- One-off tasks
- Educational purposes
