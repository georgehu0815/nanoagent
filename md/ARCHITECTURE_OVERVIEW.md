# Nanobot Architecture Overview

**Generated:** 2026-02-04
**Repository:** nanobot - Ultra-lightweight Personal AI Assistant

## Documentation Index

This repository contains comprehensive architecture documentation:

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** | This file - Executive summary |
| **[SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md)** | Detailed security analysis and recommendations |
| **[nanobot_architecture.png](nanobot_architecture.png)** | System architecture diagram (hub-and-spoke) |
| **[nanobot_security.png](nanobot_security.png)** | Security and trust zones diagram |
| **[nanobot_network.png](nanobot_network.png)** | Network topology and protocols diagram |

---

## Executive Summary

Nanobot is an **ultra-lightweight personal AI assistant** (~4,000 lines of code) designed for research, customization, and rapid prototyping. It features:

- **Multi-Channel Support**: Telegram, WhatsApp, CLI
- **Multi-LLM Integration**: OpenRouter, Anthropic, OpenAI, Azure, Groq, Gemini, Bedrock, vLLM
- **Tool System**: File operations, shell execution, web search/fetch, message sending, subagents
- **Skills Framework**: Markdown-based capability definitions
- **Persistent Memory**: Daily notes + long-term memory
- **Scheduled Tasks**: Cron service + heartbeat wake-up
- **24/7 Availability**: Long-running gateway service

---

## Architecture Diagrams

### 1. System Architecture (Hub-and-Spoke Pattern)

![Nanobot Architecture](nanobot_architecture.png)

**Key Components:**
- **Message Bus (Center)**: AsyncIO queues (InboundQueue, OutboundQueue)
- **Chat Channels**: Telegram (Python), WhatsApp (Node.js bridge), CLI
- **Agent Core**: Agent Loop, Context Builder, Session Manager, Memory Store
- **Tools & Skills**: Filesystem, Shell, Web, Message, Spawn Subagent
- **LLM Providers**: LiteLLM abstraction supporting 8+ providers
- **Background Services**: Cron scheduler, Heartbeat service (30min)
- **Data Storage**: Config, workspace files, session history, cron jobs

**Data Flow:**
```
Channels → InboundQueue → Agent Loop → Tools/LLM → OutboundQueue → Channels
```

**Architecture Pattern:** Hub-and-Spoke with Message Bus as central hub

---

### 2. Security Architecture (Trust Zones)

![Security Architecture](nanobot_security.png)

**Trust Zones:**

| Zone | Components | Security Level |
|------|-----------|----------------|
| **🔴 UNTRUSTED ZONE** | Internet (Telegram, WhatsApp, LLM APIs) | External, authenticated |
| **🟡 EDGE ZONE** | WhatsApp Bridge (ws://localhost:3001) | Local, ⚠️ NO TLS/AUTH |
| **🟢 TRUSTED ZONE** | Nanobot process, storage, agent core | Local, same process |

**Critical Security Issues:**
1. ⚠️ **Plaintext secrets** in `~/.nanobot/config.json`
2. ⚠️ **Unencrypted WebSocket** (ws:// not wss://)
3. ⚠️ **Shell execution** with full shell interpreter
4. ⚠️ **Unrestricted file access** (no sandboxing)
5. ⚠️ **No input rate limiting**

**Security Boundaries:**
- Channel input → Agent (with `allow_from` filtering on Telegram only)
- Agent → Tools (LLM-controlled, partial validation)
- Agent → LLM APIs (HTTPS + API keys)
- Bridge → Agent (⚠️ NO AUTHENTICATION)

See [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md) for detailed findings and recommendations.

---

### 3. Network Topology & Protocols

![Network Topology](nanobot_network.png)

**Network Protocols:**

| Connection | Protocol | Port | Encryption | Auth | Status |
|------------|----------|------|------------|------|--------|
| **Telegram Bot API** | HTTPS | 443 | ✅ TLS 1.2+ | Bot Token | 🟢 Secure |
| **WhatsApp Web** | HTTPS + WSS | 443 | ✅ E2E Encrypted | QR Code | 🟢 Secure |
| **LLM APIs** | HTTPS | 443 | ✅ TLS 1.2+ | API Key | 🟢 Secure |
| **Brave Search** | HTTPS | 443 | ✅ TLS 1.2+ | API Key | 🟢 Secure |
| **WhatsApp Bridge** | WebSocket (ws://) | 3001 | ❌ **Plaintext** | ❌ None | 🔴 **INSECURE** |
| **Message Bus** | In-memory | N/A | N/A | N/A | 🟢 Secure |

**Network Flow:**
- **Outbound (Secure)**: Agent → HTTPS → External APIs
- **Inbound (Secure)**: Telegram/WhatsApp → HTTPS → Local handlers
- **Local (INSECURE)**: WhatsApp Bridge → ws:// → WhatsApp handler

---

## Core Architecture Patterns

### 1. Message Bus Pattern
Decouples chat channels from agent processing:
```
Channel → publish(InboundMessage) → Queue
Queue → Agent processes → publish(OutboundMessage)
OutboundMessage → dispatch → Channel
```

**Benefits:**
- Clean separation of concerns
- Easy to add new channels
- Non-blocking async processing
- Event-driven architecture

### 2. Provider Pattern
Pluggable LLM backends via abstract interface:
```python
class LLMProvider:
    def chat(messages, tools) -> LLMResponse
```

**Implementations:**
- LiteLLM (multi-provider)
- Azure OpenAI (direct)
- AWS Bedrock (coming soon)

### 3. Tool Registry Pattern
Dynamic tool registration and execution:
```python
@tool("exec")
def execute_shell(command: str) -> str:
    # Validate, execute, return result
```

**Built-in Tools:**
- `read_file`, `write_file`, `edit_file`, `list_dir`
- `exec` (shell commands)
- `web_search`, `web_fetch`
- `send_message`
- `spawn_subagent`

### 4. Skills System
Markdown-based capability definitions:
```
skills/
├── github/SKILL.md      # GitHub API integration
├── weather/SKILL.md     # Weather data
├── tmux/SKILL.md        # Terminal multiplexer
└── summarize/SKILL.md   # Content summarization
```

Skills teach the agent how to use tools for specific domains.

### 5. Session Management
Per-user conversation context:
```
~/.nanobot/sessions/
└── telegram-12345678.jsonl   # JSONL format (one message per line)
```

Each channel:chat_id gets its own session file.

---

## Key Entry Points

| Entry Point | Type | Purpose |
|-------------|------|---------|
| `nanobot agent` | CLI | Single message or interactive chat |
| `nanobot gateway` | Service | Long-running gateway (channels + services) |
| `nanobot channels login` | CLI | Link WhatsApp device (QR code) |
| `nanobot cron` | CLI | Manage scheduled tasks |
| `nanobot onboard` | CLI | Initialize configuration |
| `nanobot status` | CLI | Show system status |

---

## Technology Stack

### Python Core
- **Python 3.11+**: Main language
- **asyncio**: Async event handling
- **typer**: CLI framework
- **pydantic**: Configuration validation
- **litellm**: Multi-provider LLM abstraction
- **python-telegram-bot**: Telegram integration
- **httpx**: HTTP client
- **readability-lxml**: Web content extraction
- **croniter**: Cron scheduling

### Node.js Bridge
- **TypeScript**: Type-safe code
- **@whiskeysockets/baileys**: WhatsApp protocol
- **ws**: WebSocket server
- **pino**: Structured logging

### Data Storage
- **JSON**: Configuration files
- **JSONL**: Session history (append-only)
- **Markdown**: Workspace files (AGENTS.md, MEMORY.md, etc.)

---

## Directory Structure

```
~/.nanobot/
├── config.json                    # Main configuration (⚠️ plaintext secrets)
├── workspace/                     # Agent workspace
│   ├── AGENTS.md                 # Agent instructions
│   ├── SOUL.md                   # Personality definition
│   ├── USER.md                   # User context
│   ├── TOOLS.md                  # Tool usage guidelines
│   ├── IDENTITY.md               # Identity definition
│   ├── HEARTBEAT.md              # Periodic task list
│   ├── MEMORY.md                 # Long-term memory
│   ├── memory/                   # Daily notes
│   │   ├── 2024-01-01.md
│   │   └── 2024-01-02.md
│   └── skills/                   # Custom skills
├── sessions/                     # Conversation history
│   ├── telegram-12345678.jsonl
│   └── whatsapp-1234567890@s.whatsapp.net.jsonl
├── media/                        # Downloaded media files
├── whatsapp-auth/                # WhatsApp session (⚠️ plaintext)
└── data/
    └── cron/
        └── jobs.json             # Scheduled jobs
```

---

## Workspace Files

| File | Purpose |
|------|---------|
| **AGENTS.md** | Instructions for how agents should behave |
| **SOUL.md** | Agent personality and communication style |
| **USER.md** | Information about the user for context |
| **TOOLS.md** | Guidelines for tool usage |
| **IDENTITY.md** | Agent identity definition |
| **HEARTBEAT.md** | Tasks to execute every 30 minutes |
| **MEMORY.md** | Long-term persistent memory |
| **memory/YYYY-MM-DD.md** | Daily notes (date-specific) |

These files are included in every agent context to guide behavior.

---

## Agent Processing Flow

### 1. Message Reception
```
User → Channel → InboundMessage → MessageBus.publish_inbound()
```

### 2. Context Building
```python
context = ContextBuilder.build_system_prompt()
# Includes:
# - Bootstrap files (AGENTS.md, SOUL.md, USER.md, etc.)
# - Conversation history (last N messages)
# - Memory (MEMORY.md + today's daily note)
# - Skills (all loaded skill definitions)
```

### 3. LLM Interaction
```python
response = LLMProvider.chat(
    messages=[system_prompt, *history, user_message],
    tools=ToolRegistry.get_all_tools()
)
```

### 4. Tool Execution Loop
```python
while response.tool_calls and iterations < 20:
    for tool_call in response.tool_calls:
        result = ToolRegistry.execute(tool_call)
    response = LLMProvider.chat([...previous, tool_results])
```

### 5. Response Dispatch
```
OutboundMessage → MessageBus.publish_outbound() → Channel.send()
```

---

## Background Services

### Cron Service
Executes scheduled tasks on cron expressions:
```json
{
  "id": "daily_summary",
  "expression": "0 9 * * *",  // Every day at 9 AM
  "payload": {
    "channel": "telegram",
    "chat_id": "12345678",
    "content": "Create a daily summary"
  }
}
```

### Heartbeat Service
Wakes agent every 30 minutes (configurable) to check `HEARTBEAT.md`:
```markdown
# Heartbeat Tasks

- Check for urgent notifications
- Monitor system health
- Review pending items
```

If HEARTBEAT.md has content, agent processes it proactively.

---

## Security Considerations

### Current State
- ❌ Secrets stored in plaintext
- ❌ WebSocket bridge unencrypted (ws://)
- ❌ Shell commands use full shell interpreter
- ❌ No file access restrictions
- ❌ No rate limiting
- ❌ No process isolation

### Recommended Immediate Actions
1. **Encrypt config.json** (use python-keyring or vault)
2. **Upgrade to wss://** for WhatsApp bridge
3. **Add rate limiting** (token bucket per user)
4. **Sandbox shell execution** (containers or command whitelist)
5. **Implement audit logging** (all tool executions)

See [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md) for complete findings and recommendations.

---

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| **Lines of Code** | ~4,000 | 99% smaller than Clawdbot |
| **Startup Time** | <1 second | Fast initialization |
| **Memory Usage** | ~50-100 MB | Lightweight Python process |
| **Message Latency** | <1s + LLM time | Async processing |
| **Tool Execution** | Max 20 iterations | Prevents infinite loops |
| **Session Storage** | JSONL (append-only) | Fast writes, sequential reads |

---

## Use Cases

### 1. Research Assistant
- Web search and content extraction
- Summarization and analysis
- Knowledge management (persistent memory)

### 2. Software Engineer
- Code reading/writing/editing
- Shell command execution
- GitHub integration (via skills)
- Project management

### 3. Market Analyst
- 24/7 monitoring (heartbeat service)
- Scheduled reports (cron jobs)
- Real-time alerts (via channels)

### 4. Daily Routine Manager
- Morning/evening routines (cron)
- Reminders and task tracking
- Context-aware assistance (memory)

---

## Extensibility

### Adding a New Channel
1. Implement `BaseChannel` interface
2. Register in `ChannelManager`
3. Add config schema to `ChannelConfig`
4. Publish/subscribe to message bus

### Adding a New Tool
1. Create tool class extending `Tool`
2. Define JSON schema for parameters
3. Implement `_execute()` method
4. Register in `ToolRegistry`

### Adding a New Skill
1. Create `skills/myskill/SKILL.md`
2. Write instructions in markdown
3. Auto-loaded on agent startup
4. No code changes needed

### Adding a New LLM Provider
1. Implement `LLMProvider` interface
2. Add config to `ProviderConfig`
3. Register in provider factory
4. Use via config: `providers.mymodel.enabled = true`

---

## Comparison: Nanobot vs. Traditional Agents

| Feature | Nanobot | Traditional Agent Frameworks |
|---------|---------|------------------------------|
| **Lines of Code** | ~4,000 | 50,000-100,000+ |
| **Dependencies** | Minimal | Heavy (LangChain, etc.) |
| **Startup Time** | <1 second | 5-10 seconds |
| **Configuration** | Single JSON file | Multiple config files |
| **Learning Curve** | Low (simple codebase) | High (complex abstractions) |
| **Customization** | Easy (direct code) | Hard (framework constraints) |
| **Multi-Channel** | Built-in | Often requires plugins |
| **Persistent Memory** | Native (markdown files) | Often requires RAG/vector DB |
| **Scheduled Tasks** | Built-in (cron) | Often requires external scheduler |

---

## Best Practices

### For Development
1. **Read before modifying**: Use the `Read` tool first
2. **Test in workspace**: Set `restrict_to_workspace=true`
3. **Version control**: Use git to track changes
4. **Backup config**: Regularly backup `~/.nanobot/`

### For Security
1. **Set allow_from**: Always restrict channel access
2. **Review shell commands**: Monitor executed commands
3. **Encrypt secrets**: Don't commit config.json
4. **Use local-only**: Avoid exposing gateway to network

### For Operations
1. **Monitor logs**: Check agent behavior regularly
2. **Rotate API keys**: Periodically update credentials
3. **Clean sessions**: Delete old session files
4. **Update regularly**: Keep dependencies updated

---

## Troubleshooting

### Common Issues

**Issue: "WhatsApp bridge not connecting"**
```bash
# Check if bridge is running
ps aux | grep "node.*bridge"

# Check WebSocket is listening
lsof -i :3001

# View bridge logs
tail -f ~/.nanobot/logs/bridge.log
```

**Issue: "Telegram bot not responding"**
```bash
# Check bot token
nanobot status

# Test token with curl
curl -s "https://api.telegram.org/bot<TOKEN>/getMe"

# Check allow_from list
cat ~/.nanobot/config.json | jq '.channels.telegram.allow_from'
```

**Issue: "Shell commands failing"**
```bash
# Check deny patterns
cat ~/.nanobot/config.json | jq '.tools.exec'

# Enable workspace restriction
# Edit config: tools.exec.restrict_to_workspace = true
```

**Issue: "API key errors"**
```bash
# Check config
cat ~/.nanobot/config.json | jq '.providers'

# Test API key
curl -H "Authorization: Bearer <KEY>" https://api.openai.com/v1/models
```

---

## Future Enhancements

### Planned Features
- [ ] Multi-user workspaces with isolation
- [ ] Role-based access control (RBAC)
- [ ] Encrypted secrets storage
- [ ] TLS for WhatsApp bridge (wss://)
- [ ] Docker/Podman sandboxing for tools
- [ ] Web UI for configuration
- [ ] Plugin system for third-party extensions
- [ ] Vector database integration for RAG
- [ ] Voice interface (speech-to-text/text-to-speech)

### Community Requests
- [ ] Discord channel support
- [ ] Slack channel support
- [ ] Matrix protocol support
- [ ] Local LLM optimizations (llama.cpp)
- [ ] Kubernetes deployment guide
- [ ] Multi-agent coordination

---

## Contributing

Nanobot is designed for research and customization. Key areas for contribution:

1. **Security**: Implement encryption, sandboxing, rate limiting
2. **Channels**: Add new chat platforms (Discord, Slack, Matrix)
3. **Providers**: Add new LLM providers or optimize existing ones
4. **Tools**: Create new tool definitions or improve existing ones
5. **Skills**: Share useful skill definitions (domain-specific)
6. **Documentation**: Improve guides, tutorials, examples

---

## Resources

### Code References
- [nanobot/agent/loop.py:1-500](nanobot/agent/loop.py) - Main agent loop
- [nanobot/bus/queue.py:1-100](nanobot/bus/queue.py) - Message bus implementation
- [nanobot/channels/base.py:1-200](nanobot/channels/base.py) - Channel interface
- [nanobot/providers/litellm_provider.py:1-300](nanobot/providers/litellm_provider.py) - LLM provider
- [nanobot/agent/tools/](nanobot/agent/tools/) - Tool implementations
- [bridge/src/server.ts:1-200](bridge/src/server.ts) - WhatsApp bridge

### Documentation
- [README.md](README.md) - Getting started
- [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md) - Security deep-dive
- [TELEGRAM_GUIDE.md](TELEGRAM_GUIDE.md) - Telegram setup
- [WHATSAPP_GUIDE.md](WHATSAPP_GUIDE.md) - WhatsApp setup
- [AZURE_OPENAI_GUIDE.md](AZURE_OPENAI_GUIDE.md) - Azure setup
- [AZURE_TESTING_GUIDE.md](AZURE_TESTING_GUIDE.md) - Azure testing

---

## Conclusion

Nanobot demonstrates that a production-ready AI agent can be built with minimal code while maintaining:

- ✅ **Simplicity**: Easy to understand and modify
- ✅ **Extensibility**: Easy to add channels, tools, providers
- ✅ **Reliability**: Stable message bus architecture
- ✅ **Performance**: Low latency, low resource usage
- ⚠️ **Security**: Needs hardening for production use

The hub-and-spoke architecture with a message bus provides clean separation of concerns and makes it easy to reason about system behavior.

For security-sensitive deployments, review [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md) and implement recommended mitigations before production use.

---

**Last Updated:** 2026-02-04
**Version:** 1.0
**Maintainer:** Architecture documentation generated by Claude Sonnet 4.5
