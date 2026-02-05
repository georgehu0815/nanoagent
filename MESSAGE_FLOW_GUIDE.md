# Nanobot Message Flow Guide

**Generated:** 2026-02-04
**Diagrams:**
- [nanobot_message_flow.png](nanobot_message_flow.png) - Visual flow diagram
- [message_flow_sequence.mmd](message_flow_sequence.mmd) - Mermaid sequence diagram

---

## Overview

This guide provides a detailed walkthrough of how a user message flows through the Nanobot system, from initial receipt to final response delivery. The complete journey involves **7 distinct phases** and typically takes **1-3 seconds** plus LLM processing time.

### Example Scenario

**User Input:** "What's the weather in Tokyo?"

**Expected Flow:**
1. User sends message via Telegram
2. System validates and queues message
3. Agent assembles context (history, memory, skills)
4. LLM decides to call `web_search` tool
5. Tool executes and returns weather data
6. LLM formats final response
7. Response sent back to user via Telegram

**Total Steps:** 21 distinct operations
**Typical Latency:** 1-3 seconds + LLM API calls (~2-5 seconds)

---

## Phase 1: Message Reception

### Step 1-3: Channel Handler Processing

**Location:** [nanobot/channels/telegram.py:100-150](nanobot/channels/telegram.py) or [nanobot/channels/whatsapp.py](nanobot/channels/whatsapp.py)

```python
# Step 1: User sends message
# Telegram: User taps send in bot chat
# WhatsApp: User sends message via linked device
# CLI: User types message and presses enter

# Step 2: Channel validates sender
def _handle_message(self, message):
    sender_id = message.from_user.id
    if not self.is_allowed(sender_id):
        return  # Silently drop unauthorized messages

    # Step 3: Publish to inbound queue
    inbound_msg = InboundMessage(
        channel="telegram",
        chat_id=str(sender_id),
        content=message.text,
        metadata={"message_id": message.message_id}
    )
    await self.bus.publish_inbound(inbound_msg)
```

**Key Components:**
- **Channel Handler**: Platform-specific message receiver
- **Validation**: Checks `allow_from` list (Telegram only)
- **InboundMessage**: Standardized message format

**Code References:**
- Telegram: [nanobot/channels/telegram.py:100-150](nanobot/channels/telegram.py)
- WhatsApp: [nanobot/channels/whatsapp.py:80-120](nanobot/channels/whatsapp.py)
- CLI: [nanobot/channels/cli.py:40-80](nanobot/cli/commands.py)
- Message Bus: [nanobot/bus/queue.py:30-50](nanobot/bus/queue.py)

**Timing:** <100ms

---

## Phase 2: Context Assembly

### Step 4-9: Building the System Prompt

**Location:** [nanobot/agent/context.py:50-150](nanobot/agent/context.py)

```python
# Step 4: Agent loop consumes from queue
async def run(self):
    while True:
        inbound_msg = await self.bus.inbound_queue.get()

        # Step 5: Build system prompt
        context = self.context_builder.build_system_prompt(
            channel=inbound_msg.channel,
            chat_id=inbound_msg.chat_id
        )
```

### Context Components

#### Step 6: Bootstrap Files
**Location:** [nanobot/agent/context.py:60-80](nanobot/agent/context.py)

```python
# Load bootstrap files from workspace
bootstrap_files = [
    "AGENTS.md",    # Agent behavior instructions
    "SOUL.md",      # Personality definition
    "USER.md",      # User context
    "TOOLS.md",     # Tool usage guidelines
    "IDENTITY.md"   # Identity definition
]

for filename in bootstrap_files:
    path = workspace_dir / filename
    if path.exists():
        content = path.read_text()
        system_parts.append(f"# {filename}\n{content}")
```

**Files Loaded:**
- `AGENTS.md`: How the agent should behave
- `SOUL.md`: Personality and communication style
- `USER.md`: Information about the user
- `TOOLS.md`: Guidelines for using tools
- `IDENTITY.md`: Agent's identity and role

#### Step 7: Conversation History
**Location:** [nanobot/session/manager.py:50-100](nanobot/session/manager.py)

```python
# Get recent conversation history
session_key = f"{channel}-{chat_id}"
history = self.session_manager.get_history(
    session_key=session_key,
    limit=50  # Last 50 messages
)

# History format: List[dict]
# [
#   {"role": "user", "content": "Previous question"},
#   {"role": "assistant", "content": "Previous answer"},
#   ...
# ]
```

**Session Storage:**
- Format: JSONL (one message per line)
- Location: `~/.nanobot/sessions/{channel}-{chat_id}.jsonl`
- Default limit: 50 most recent messages
- Appended on every interaction

#### Step 8: Memory
**Location:** [nanobot/agent/memory.py:40-80](nanobot/agent/memory.py)

```python
# Load long-term memory
memory_content = []

# Read MEMORY.md (persistent)
memory_file = workspace_dir / "MEMORY.md"
if memory_file.exists():
    memory_content.append(memory_file.read_text())

# Read today's daily note
today = datetime.now().strftime("%Y-%m-%d")
daily_note = workspace_dir / "memory" / f"{today}.md"
if daily_note.exists():
    memory_content.append(daily_note.read_text())

system_parts.append(f"# Memory\n{''.join(memory_content)}")
```

**Memory Types:**
- **MEMORY.md**: Long-term persistent memory (manually curated)
- **YYYY-MM-DD.md**: Daily notes (date-specific context)

#### Step 9: Skills
**Location:** [nanobot/agent/skills.py:30-70](nanobot/agent/skills.py)

```python
# Load all skill definitions
skills = []

# Built-in skills
builtin_skills_dir = Path(__file__).parent / "skills"
skills.extend(load_skills_from_dir(builtin_skills_dir))

# Workspace skills
workspace_skills_dir = workspace_dir / "skills"
skills.extend(load_skills_from_dir(workspace_skills_dir))

# Each skill is a SKILL.md file with instructions
for skill in skills:
    system_parts.append(f"# Skill: {skill.name}\n{skill.content}")
```

**Available Skills:**
- `github/`: GitHub API integration
- `weather/`: Weather data retrieval
- `tmux/`: Terminal multiplexer control
- `summarize/`: Content summarization
- Custom: User-defined skills in workspace

**Assembled Context Structure:**
```
System Prompt:
  ├─ Bootstrap Files (AGENTS.md, SOUL.md, USER.md, TOOLS.md, IDENTITY.md)
  ├─ Memory (MEMORY.md + today's note)
  ├─ Skills (all skill definitions)
  └─ Tool Definitions (JSON schemas for all tools)

Conversation History:
  ├─ Message 1 (oldest)
  ├─ Message 2
  ├─ ...
  └─ Message 50 (most recent)

Current Message:
  └─ "What's the weather in Tokyo?"
```

**Code References:**
- Context Builder: [nanobot/agent/context.py:50-150](nanobot/agent/context.py)
- Session Manager: [nanobot/session/manager.py:50-100](nanobot/session/manager.py)
- Memory Store: [nanobot/agent/memory.py:40-80](nanobot/agent/memory.py)
- Skills Loader: [nanobot/agent/skills.py:30-70](nanobot/agent/skills.py)

**Timing:** 50-200ms (depends on file sizes)

---

## Phase 3: LLM Interaction (Round 1)

### Step 10: Initial LLM Call with Tools

**Location:** [nanobot/agent/loop.py:150-200](nanobot/agent/loop.py)

```python
# Step 10: Call LLM with tool definitions
response = await self.llm_provider.chat(
    messages=[
        {"role": "system", "content": system_prompt},
        *conversation_history,
        {"role": "user", "content": "What's the weather in Tokyo?"}
    ],
    tools=self.tool_registry.get_all_tool_definitions()
)

# Response contains:
# - content: Optional text response
# - tool_calls: List of tool invocations requested
```

**Tool Definitions Sent to LLM:**
```json
[
  {
    "type": "function",
    "function": {
      "name": "web_search",
      "description": "Search the web using Brave Search API",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {"type": "string", "description": "Search query"},
          "count": {"type": "integer", "default": 5}
        },
        "required": ["query"]
      }
    }
  },
  // ... other tools (read_file, write_file, exec, etc.)
]
```

**LLM Response (with tool call):**
```json
{
  "content": null,
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "web_search",
        "arguments": "{\"query\": \"weather Tokyo current\"}"
      }
    }
  ]
}
```

**Code References:**
- Agent Loop: [nanobot/agent/loop.py:150-200](nanobot/agent/loop.py)
- LiteLLM Provider: [nanobot/providers/litellm_provider.py:100-150](nanobot/providers/litellm_provider.py)
- Tool Registry: [nanobot/agent/tools/registry.py:40-80](nanobot/agent/tools/registry.py)

**Timing:** 1-3 seconds (depends on LLM provider and model)

---

## Phase 4: Tool Execution

### Step 11-13: Execute Requested Tool

**Location:** [nanobot/agent/tools/registry.py:100-150](nanobot/agent/tools/registry.py)

```python
# Step 11: Execute tool
tool_results = []
for tool_call in response.tool_calls:
    # Step 12: Validate parameters against JSON schema
    tool = self.tool_registry.get_tool(tool_call.function.name)
    params = json.loads(tool_call.function.arguments)

    validated_params = tool.validate_parameters(params)

    # Step 13: Execute tool
    result = await tool.execute(**validated_params)

    tool_results.append({
        "tool_call_id": tool_call.id,
        "role": "tool",
        "name": tool_call.function.name,
        "content": result
    })
```

### Example: Web Search Tool Execution

**Location:** [nanobot/agent/tools/web.py:80-120](nanobot/agent/tools/web.py)

```python
class WebSearchTool(Tool):
    async def _execute(self, query: str, count: int = 5) -> str:
        # Call Brave Search API
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": self.api_key
        }

        response = await self.http_client.get(
            "https://api.search.brave.com/res/v1/web/search",
            params={"q": query, "count": count},
            headers=headers
        )

        # Parse results
        results = response.json()["web"]["results"]

        # Format output
        output = []
        for result in results[:count]:
            output.append(f"- {result['title']}: {result['description']}")

        return "\n".join(output)
```

**Tool Result:**
```
- Tokyo Weather - Japan Meteorological Agency: Current temperature 22°C, sunny skies
- Weather in Tokyo, Japan - Weather.com: Sunny today with high of 24°C, low of 18°C
- Tokyo Weather Forecast - AccuWeather: Clear conditions, 22°C, humidity 60%
```

**Code References:**
- Tool Registry: [nanobot/agent/tools/registry.py:100-150](nanobot/agent/tools/registry.py)
- Web Search Tool: [nanobot/agent/tools/web.py:80-120](nanobot/agent/tools/web.py)
- Tool Base Class: [nanobot/agent/tools/base.py:30-100](nanobot/agent/tools/base.py)

**Timing:** 200-1000ms (depends on tool type and external API)

---

## Phase 5: LLM Interaction (Round 2)

### Step 14: LLM Call with Tool Results

**Location:** [nanobot/agent/loop.py:220-260](nanobot/agent/loop.py)

```python
# Step 14: Send tool results back to LLM
response = await self.llm_provider.chat(
    messages=[
        {"role": "system", "content": system_prompt},
        *conversation_history,
        {"role": "user", "content": "What's the weather in Tokyo?"},
        {"role": "assistant", "content": None, "tool_calls": [...]},
        {"role": "tool", "name": "web_search", "content": "- Tokyo Weather..."}
    ],
    tools=self.tool_registry.get_all_tool_definitions()
)

# LLM now has search results and can formulate final answer
```

**LLM Final Response:**
```json
{
  "content": "Based on the current weather data, Tokyo is experiencing sunny conditions with a temperature of 22°C (72°F). The humidity is around 60%, and there are clear skies expected throughout the day with a high of 24°C.",
  "tool_calls": null  // No more tools needed
}
```

**Tool Iteration Loop:**
The agent supports up to **20 tool iterations** per message. This allows complex multi-step workflows:

```python
# Example multi-step flow:
# 1. web_search("Tokyo weather") → Get weather data
# 2. read_file("notes.md") → Check if user preferences exist
# 3. write_file("weather_log.md") → Log the weather
# 4. send_message() → Send notification to another channel
```

**Code References:**
- Tool Loop: [nanobot/agent/loop.py:220-280](nanobot/agent/loop.py)
- Max Iterations: [nanobot/config/schema.py:50](nanobot/config/schema.py) (default: 20)

**Timing:** 1-3 seconds per LLM call

---

## Phase 6: Session Storage

### Step 15-17: Persist Conversation

**Location:** [nanobot/session/manager.py:120-160](nanobot/session/manager.py)

```python
# Step 15: Save user message
await self.session_manager.save_message(
    session_key=f"{channel}-{chat_id}",
    message={
        "role": "user",
        "content": "What's the weather in Tokyo?",
        "timestamp": datetime.now().isoformat()
    }
)

# Step 16: Save assistant message
await self.session_manager.save_message(
    session_key=f"{channel}-{chat_id}",
    message={
        "role": "assistant",
        "content": "Based on the current weather data...",
        "timestamp": datetime.now().isoformat(),
        "metadata": {
            "tool_calls": 1,
            "tokens_used": 850
        }
    }
)

# Step 17: Append to JSONL file
# File: ~/.nanobot/sessions/telegram-12345678.jsonl
# Format: One JSON object per line
```

**JSONL Session File Example:**
```jsonl
{"role":"user","content":"What's the weather in Tokyo?","timestamp":"2026-02-04T21:00:00"}
{"role":"assistant","content":"Based on the current weather data...","timestamp":"2026-02-04T21:00:03"}
```

**Session Management:**
- **Format:** JSONL (JSON Lines) - one message per line
- **Location:** `~/.nanobot/sessions/{channel}-{chat_id}.jsonl`
- **Retention:** Indefinite (no automatic cleanup)
- **Loading:** Most recent 50 messages loaded by default

**Code References:**
- Session Manager: [nanobot/session/manager.py:120-160](nanobot/session/manager.py)
- Session Schema: [nanobot/bus/events.py:30-50](nanobot/bus/events.py)

**Timing:** 10-50ms (file I/O)

---

## Phase 7: Response Dispatch

### Step 18-21: Send Response to User

**Location:** [nanobot/channels/telegram.py:180-220](nanobot/channels/telegram.py)

```python
# Step 18: Publish to outbound queue
outbound_msg = OutboundMessage(
    channel="telegram",
    chat_id="12345678",
    content="Based on the current weather data, Tokyo is...",
    metadata={"reply_to": original_message_id}
)
await self.bus.publish_outbound(outbound_msg)

# Step 19: Channel receives callback
async def _handle_outbound(self, outbound_msg: OutboundMessage):
    # Step 20: Format response
    # Telegram uses HTML, not plain text
    formatted = self._sanitize_markdown(outbound_msg.content)

    # Step 21: Send via Telegram API
    await self.bot.send_message(
        chat_id=outbound_msg.chat_id,
        text=formatted,
        parse_mode="HTML"
    )
```

### Channel-Specific Formatting

#### Telegram
**Location:** [nanobot/channels/telegram.py:16-76](nanobot/channels/telegram.py)

```python
def _sanitize_markdown(self, text: str) -> str:
    """Convert markdown to Telegram HTML"""
    # 1. Extract and protect code blocks
    # 2. Extract and protect inline code
    # 3. Convert markdown to HTML
    # 4. Escape HTML special characters
    # 5. Restore code blocks
    return html_output
```

#### WhatsApp
**Location:** [nanobot/channels/whatsapp.py:140-180](nanobot/channels/whatsapp.py)

```python
async def _handle_outbound(self, outbound_msg: OutboundMessage):
    """Send via WebSocket to bridge"""
    await self.websocket.send(json.dumps({
        "type": "send_message",
        "to": outbound_msg.chat_id,
        "message": outbound_msg.content  # Plain text
    }))
```

#### CLI
**Location:** [nanobot/cli/commands.py:200-220](nanobot/cli/commands.py)

```python
async def _handle_outbound(self, outbound_msg: OutboundMessage):
    """Print to stdout with formatting"""
    console.print(Panel(
        outbound_msg.content,
        title="Assistant",
        border_style="green"
    ))
```

**Code References:**
- Outbound Queue: [nanobot/bus/queue.py:60-90](nanobot/bus/queue.py)
- Telegram Formatting: [nanobot/channels/telegram.py:16-76](nanobot/channels/telegram.py)
- WhatsApp Bridge: [nanobot/channels/whatsapp.py:140-180](nanobot/channels/whatsapp.py)

**Timing:** 100-500ms (depends on external API latency)

---

## Complete Timing Breakdown

| Phase | Steps | Duration | Notes |
|-------|-------|----------|-------|
| **1. Reception** | 1-3 | <100ms | Channel validation + queue publish |
| **2. Context Assembly** | 4-9 | 50-200ms | File I/O for bootstrap, memory, skills |
| **3. LLM Call (1)** | 10 | 1-3s | LLM API latency (depends on provider) |
| **4. Tool Execution** | 11-13 | 200-1000ms | Depends on tool (web search, file ops) |
| **5. LLM Call (2)** | 14 | 1-3s | LLM API latency |
| **6. Session Storage** | 15-17 | 10-50ms | JSONL append operations |
| **7. Response Dispatch** | 18-21 | 100-500ms | Channel API call (Telegram/WhatsApp) |
| **TOTAL** | **21 steps** | **2.5-8s** | Typical: 3-5 seconds |

**Factors Affecting Latency:**
- LLM provider speed (Claude Opus slower than Haiku)
- Network latency to external APIs
- Tool execution time (web search vs local file read)
- Number of tool iterations (1 vs multiple)
- Message queue congestion (if high traffic)

---

## Tool Iteration Examples

### Example 1: Single Tool Call (Weather Query)
```
User → "What's the weather in Tokyo?"
  ↓
LLM → tool_call: web_search("weather Tokyo")
  ↓
Tool → Returns weather data
  ↓
LLM → Formats response
  ↓
User ← "Tokyo is sunny, 22°C"

Total: 2 LLM calls, 1 tool execution
```

### Example 2: Multiple Tool Calls (Research Task)
```
User → "Research competitive products and create a summary"
  ↓
LLM → tool_call: web_search("competitive products")
  ↓
Tool → Returns search results
  ↓
LLM → tool_call: web_fetch("https://competitor1.com")
  ↓
Tool → Returns page content
  ↓
LLM → tool_call: web_fetch("https://competitor2.com")
  ↓
Tool → Returns page content
  ↓
LLM → tool_call: write_file("summary.md", content)
  ↓
Tool → Creates file
  ↓
LLM → Formats response
  ↓
User ← "I've researched 3 competitors and saved the summary"

Total: 5 LLM calls, 4 tool executions
```

### Example 3: Subagent Spawning (Parallel Tasks)
```
User → "Generate 3 different blog post ideas in parallel"
  ↓
LLM → tool_call: spawn_subagent(task="Blog idea 1")
LLM → tool_call: spawn_subagent(task="Blog idea 2")
LLM → tool_call: spawn_subagent(task="Blog idea 3")
  ↓
Tools → Execute in parallel (each with its own LLM calls)
  ↓
LLM → Aggregates results
  ↓
User ← "Here are 3 blog post ideas: ..."

Total: 1 parent + 3 subagent processes
```

---

## Error Handling

### Validation Errors
```python
try:
    validated_params = tool.validate_parameters(params)
except ValidationError as e:
    # Return error to LLM as tool result
    tool_result = {
        "error": f"Invalid parameters: {e.message}",
        "expected": tool.parameter_schema
    }
    # LLM sees error and can retry with correct params
```

### Tool Execution Errors
```python
try:
    result = await tool.execute(**params)
except ToolExecutionError as e:
    # Log error and return to LLM
    logger.error(f"Tool {tool.name} failed: {e}")
    tool_result = {
        "error": str(e),
        "tool": tool.name
    }
    # LLM can try alternative approach
```

### LLM API Errors
```python
try:
    response = await self.llm_provider.chat(...)
except LLMProviderError as e:
    # Send error message to user
    await self.bus.publish_outbound(OutboundMessage(
        channel=channel,
        chat_id=chat_id,
        content=f"Sorry, I encountered an error: {e}"
    ))
```

---

## Advanced Flows

### Heartbeat-Triggered Flow
```
Heartbeat Service (every 30 minutes)
  ↓
Read HEARTBEAT.md
  ↓
If tasks exist:
  ↓
Create InboundMessage with task
  ↓
Publish to InboundQueue
  ↓
[Same flow as user message]
  ↓
Response sent to configured channel
```

### Cron-Triggered Flow
```
Cron Service (based on cron expression)
  ↓
Load job from jobs.json
  ↓
Create InboundMessage with job.payload
  ↓
Publish to InboundQueue
  ↓
[Same flow as user message]
  ↓
Response sent to job.channel:job.chat_id
```

---

## Performance Optimization Tips

### 1. Reduce Context Size
```python
# Limit conversation history
session_manager.get_history(limit=20)  # Instead of 50

# Minimize bootstrap files
# Only include essential instructions in AGENTS.md
```

### 2. Use Faster LLM Models
```json
{
  "providers": {
    "litellm": {
      "model": "claude-3-haiku",  // Faster than opus
      "enabled": true
    }
  }
}
```

### 3. Reduce Tool Iterations
```json
{
  "agent": {
    "max_tool_iterations": 10  // Instead of 20
  }
}
```

### 4. Cache Frequently Used Data
```python
# Cache skills and bootstrap files
@lru_cache(maxsize=1)
def load_bootstrap_files():
    # Only load once, cache result
    pass
```

---

## Debugging Tips

### Enable Verbose Logging
```bash
export NANOBOT_LOG_LEVEL=DEBUG
nanobot gateway
```

### Monitor Message Flow
```python
# Add logging at each phase
logger.debug(f"Phase 1: Received message from {channel}")
logger.debug(f"Phase 2: Context size: {len(system_prompt)} chars")
logger.debug(f"Phase 3: LLM call took {duration}s")
logger.debug(f"Phase 4: Executed {len(tool_calls)} tools")
```

### Inspect Session Files
```bash
# View session history
cat ~/.nanobot/sessions/telegram-12345678.jsonl | jq .

# Count messages
wc -l ~/.nanobot/sessions/telegram-12345678.jsonl
```

### Test Tool Execution Directly
```python
from nanobot.agent.tools.web import WebSearchTool

tool = WebSearchTool(api_key="...")
result = await tool.execute(query="test query")
print(result)
```

---

## Code References Summary

| Component | File Location | Lines |
|-----------|---------------|-------|
| **Channel Handlers** | [nanobot/channels/](nanobot/channels/) | |
| - Telegram | [telegram.py:100-220](nanobot/channels/telegram.py) | 100-220 |
| - WhatsApp | [whatsapp.py:80-180](nanobot/channels/whatsapp.py) | 80-180 |
| - CLI | [cli/commands.py:150-250](nanobot/cli/commands.py) | 150-250 |
| **Message Bus** | [bus/queue.py](nanobot/bus/queue.py) | 30-90 |
| **Agent Loop** | [agent/loop.py](nanobot/agent/loop.py) | 100-300 |
| **Context Builder** | [agent/context.py](nanobot/agent/context.py) | 50-150 |
| **Session Manager** | [session/manager.py](nanobot/session/manager.py) | 50-160 |
| **Memory Store** | [agent/memory.py](nanobot/agent/memory.py) | 40-80 |
| **Skills Loader** | [agent/skills.py](nanobot/agent/skills.py) | 30-70 |
| **LLM Provider** | [providers/litellm_provider.py](nanobot/providers/litellm_provider.py) | 100-200 |
| **Tool Registry** | [agent/tools/registry.py](nanobot/agent/tools/registry.py) | 40-150 |
| **Tools** | [agent/tools/](nanobot/agent/tools/) | |
| - Web Search | [web.py:80-120](nanobot/agent/tools/web.py) | 80-120 |
| - Shell Exec | [shell.py:111-200](nanobot/agent/tools/shell.py) | 111-200 |
| - File Ops | [filesystem.py:50-150](nanobot/agent/tools/filesystem.py) | 50-150 |

---

## Conclusion

The Nanobot message flow is designed for:
- ✅ **Clarity**: Each phase has a clear purpose
- ✅ **Extensibility**: Easy to add new tools, channels, or modify flow
- ✅ **Reliability**: Error handling at each step
- ✅ **Performance**: Async processing throughout
- ✅ **Observability**: Can log and monitor each phase

The **21-step flow** from user input to response demonstrates the system's sophistication while maintaining code simplicity through clear separation of concerns.

---

**Last Updated:** 2026-02-04
**Version:** 1.0
**Total Flow Steps:** 21
**Average Latency:** 3-5 seconds
