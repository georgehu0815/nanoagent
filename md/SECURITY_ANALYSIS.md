# Nanobot Security & Network Analysis

**Generated:** 2026-02-04
**Diagram:** [nanobot_security.png](nanobot_security.png)

## Executive Summary

Nanobot is an ultra-lightweight AI assistant with a **hub-and-spoke architecture** centered on an AsyncIO message bus. This analysis identifies security boundaries, attack surfaces, and risk areas from both network and security perspectives.

### Trust Zones

The architecture is divided into three trust zones:

| Zone | Description | Color Code |
|------|-------------|------------|
| **UNTRUSTED ZONE** | External Internet-facing services | 🔴 Red |
| **EDGE ZONE** | Local network boundary (bridge) | 🟡 Yellow |
| **TRUSTED ZONE** | Local machine components | 🟢 Green |

---

## Architecture Overview

### Trust Zone Map

```
┌─────────────────────────────────────────────────────────────┐
│ UNTRUSTED ZONE (Internet)                                    │
│ ├─ Telegram Bot API (HTTPS)                                 │
│ ├─ WhatsApp Web (HTTPS, E2E encrypted)                      │
│ ├─ LLM Providers (HTTPS + API Keys)                         │
│ └─ Brave Search API (HTTPS + API Key)                       │
└─────────────────────────────────────────────────────────────┘
       │ HTTPS ✓           │ HTTPS ✓
       ▼                   ▼
┌──────────────────┐  ┌────────────────────────────────────┐
│ EDGE ZONE        │  │ ⚠️ CRITICAL SECURITY GAP           │
│ WhatsApp Bridge  │◄─┤ ws:// (NO TLS, NO AUTH)            │
│ Node.js          │  │ Plaintext WebSocket                │
└──────────────────┘  └────────────────────────────────────┘
       │ ws:// ⚠️
       ▼
┌─────────────────────────────────────────────────────────────┐
│ TRUSTED ZONE (Local Machine)                                 │
│ ├─ Channel Handlers (Telegram, WhatsApp, CLI)               │
│ ├─ Message Bus (AsyncIO Queues)                             │
│ ├─ Agent Loop (Core Engine)                                 │
│ ├─ Tools (Shell Exec, File R/W, Web Fetch)                  │
│ └─ Storage (Config, Sessions, Workspace, Media)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Network Protocols & Security

### External Communication

| Service | Protocol | Encryption | Authentication | Security Rating |
|---------|----------|------------|----------------|-----------------|
| **Telegram Bot API** | HTTPS | ✅ TLS 1.2+ | Bot Token | 🟢 Secure |
| **WhatsApp Web** | HTTPS | ✅ E2E Encrypted | QR Code | 🟢 Secure |
| **LLM Providers** | HTTPS | ✅ TLS 1.2+ | API Key (Header) | 🟢 Secure |
| **Brave Search** | HTTPS | ✅ TLS 1.2+ | API Key (Header) | 🟢 Secure |

### Local Communication

| Service | Protocol | Encryption | Authentication | Security Rating |
|---------|----------|------------|----------------|-----------------|
| **WhatsApp Bridge** | WebSocket (ws://) | ❌ **PLAINTEXT** | ❌ **NONE** | 🔴 **CRITICAL RISK** |
| **Message Bus** | In-memory | N/A (same process) | N/A | 🟢 Secure |
| **Gateway** | TCP (optional) | ❌ No TLS | ❌ None | 🔴 High Risk |

---

## Critical Security Findings

### 🔴 HIGH SEVERITY

#### 1. Plaintext Secrets Storage
**Location:** `~/.nanobot/config.json`, `~/.nanobot/whatsapp-auth/`

- API keys stored in plaintext JSON
- Bot tokens unencrypted
- WhatsApp session credentials exposed
- File permissions not enforced

**Impact:** Full compromise of all integrations if config file is accessed

**Recommendation:**
- Implement encryption at rest (e.g., `python-keyring`)
- Use HashiCorp Vault or AWS Secrets Manager
- Encrypt config file with user passphrase
- Set strict file permissions (0600)

#### 2. Unencrypted WebSocket (WhatsApp Bridge)
**Location:** [bridge/src/server.ts](bridge/src/server.ts)

- Uses `ws://` instead of `wss://`
- No authentication on connections
- Broadcasts messages to all clients
- Vulnerable to MITM attacks on localhost

**Impact:** Message interception, credential theft, session hijacking

**Recommendation:**
- Upgrade to `wss://` with TLS certificates
- Implement authentication tokens
- Use Unix domain sockets instead of TCP
- Add HMAC signatures to messages

#### 3. Shell Command Execution
**Location:** [nanobot/agent/tools/shell.py:111-141](nanobot/agent/tools/shell.py)

- Uses `asyncio.create_subprocess_shell()` (full shell interpreter)
- LLM controls command strings
- Regex-based deny patterns (bypassable)
- No sandboxing or containerization

**Impact:** Arbitrary code execution, data exfiltration, system compromise

**Recommendation:**
- Use `subprocess.run()` with argument list (no shell)
- Implement command whitelist (not blacklist)
- Use Docker/Podman containers for isolation
- Add audit logging for all commands

#### 4. Unrestricted File Access
**Location:** [nanobot/agent/tools/filesystem.py](nanobot/agent/tools/filesystem.py)

- Agent can read/write any file the process user can access
- No path validation or sanitization
- Follows symlinks (potential TOCTOU attacks)
- No chroot or namespace isolation

**Impact:** Sensitive file disclosure, configuration tampering, data loss

**Recommendation:**
- Restrict file operations to workspace directory
- Validate and resolve all paths
- Do not follow symlinks
- Implement mandatory access control (MAC)

#### 5. No Input Rate Limiting
**Location:** All channel handlers

- No rate limiting on messages
- No protection against command spam
- No DoS prevention

**Impact:** Resource exhaustion, denial of service

**Recommendation:**
- Implement token bucket rate limiting per user
- Add per-minute/per-hour limits
- Queue and throttle tool executions
- Set maximum concurrent operations

#### 6. Process Isolation
**Location:** Entire architecture

- All tools run in the same process
- No sandboxing or containerization
- Shared memory and resources
- Single point of failure

**Impact:** One compromised tool compromises entire agent

**Recommendation:**
- Run tools in separate processes
- Use containers (Docker/Podman) for isolation
- Implement capability-based security
- Use seccomp/AppArmor profiles

---

### 🟡 MEDIUM SEVERITY

#### 1. Allow-List Default
**Location:** [nanobot/channels/base.py:59-82](nanobot/channels/base.py)

- Channels allow all users if `allow_from` is empty
- WhatsApp handler doesn't check `is_allowed()`
- No defense-in-depth

**Impact:** Unauthorized access to agent if misconfigured

**Recommendation:**
- Default to deny-all (require explicit allow-list)
- Enforce `is_allowed()` check in all handlers
- Log and alert on rejected messages

#### 2. Hardcoded User-Agent
**Location:** [nanobot/agent/tools/web.py](nanobot/agent/tools/web.py)

- Fixed User-Agent string in web requests
- Easily identifiable as bot traffic
- May be blocked by WAFs

**Impact:** Fingerprinting, blocking by services

**Recommendation:**
- Rotate User-Agent strings
- Use legitimate browser UA strings
- Make configurable per request

#### 3. No DNS Rebinding Protection
**Location:** [nanobot/agent/tools/web.py](nanobot/agent/tools/web.py)

- Only max redirects enforced
- No validation of redirect targets
- No private IP range blocking

**Impact:** SSRF attacks, internal network scanning

**Recommendation:**
- Block private IP ranges (RFC 1918)
- Validate redirect targets
- Implement DNS rebinding protection

#### 4. Regex Bypass Patterns
**Location:** [nanobot/agent/tools/shell.py:111-141](nanobot/agent/tools/shell.py)

- Deny patterns use regex (can be bypassed)
- Case-insensitive but incomplete
- Shell metacharacters can evade

**Impact:** Command injection via pattern evasion

**Recommendation:**
- Use whitelist instead of blacklist
- Parse commands (don't use regex)
- Implement AST-based validation

#### 5. No Audit Logging
**Location:** Throughout codebase

- No security event logging
- No audit trail for sensitive operations
- No alerting on suspicious activity

**Impact:** No forensics, no incident response capability

**Recommendation:**
- Implement comprehensive audit logging
- Log all tool executions with parameters
- Log all file and network operations
- Alert on suspicious patterns

#### 6. Environment Variable Leakage
**Location:** [nanobot/providers/litellm_provider.py:42-55](nanobot/providers/litellm_provider.py)

- API keys set in `os.environ`
- Visible in process listings
- Inherited by child processes

**Impact:** Credential disclosure via process inspection

**Recommendation:**
- Don't use environment variables for secrets
- Use in-memory configuration objects
- Clear sensitive env vars after use

---

### 🔵 LOW SEVERITY

#### 1. Media File Type Validation
**Location:** [nanobot/channels/telegram.py](nanobot/channels/telegram.py)

- Relies on file extension only
- No content-type validation
- No malware scanning

**Impact:** Malicious file upload

**Recommendation:**
- Validate file magic numbers
- Scan uploads with ClamAV
- Set file size limits

#### 2. Symlink Following
**Location:** [nanobot/agent/tools/filesystem.py](nanobot/agent/tools/filesystem.py)

- File tools follow symlinks
- Potential TOCTOU attacks

**Impact:** Unauthorized file access via symlinks

**Recommendation:**
- Use `O_NOFOLLOW` flag
- Resolve symlinks before validation

#### 3. Predictable File Paths
**Location:** [nanobot/channels/telegram.py](nanobot/channels/telegram.py)

- Media files use predictable naming: `{file_id[:16]}{ext}`
- Session files use predictable structure

**Impact:** Information disclosure, file enumeration

**Recommendation:**
- Use cryptographically random filenames
- Add HMAC to prevent guessing

#### 4. No Rate Limit Headers
**Location:** [nanobot/agent/tools/web.py](nanobot/agent/tools/web.py)

- Web tools don't respect rate limit headers
- No retry-after handling

**Impact:** API rate limit violations

**Recommendation:**
- Parse and respect rate limit headers
- Implement exponential backoff

---

## Attack Surface Analysis

### Entry Points (Attack Vectors)

| Entry Point | Trust Level | Input Validation | Auth Required | Attack Surface |
|-------------|-------------|------------------|---------------|----------------|
| **Telegram Bot** | Untrusted | Markdown sanitization | Bot token | Medium |
| **WhatsApp Bridge** | Untrusted | None | QR code | High |
| **CLI Input** | Trusted | None | Local access | Low |
| **Web URLs (LLM-controlled)** | Untrusted | Scheme validation only | N/A | High |
| **Shell Commands (LLM-controlled)** | Untrusted | Regex deny patterns | N/A | Critical |
| **File Paths (LLM-controlled)** | Untrusted | None | N/A | High |

### Data Flow Security

```
User Input (Untrusted)
  ↓
Channel Handler
  ↓ [Validation: allow_from filter]
Message Bus
  ↓
Agent Loop
  ↓ [Validation: None - trusts LLM output]
Tool Execution (LLM-controlled)
  ↓ [Validation: Partial - regex patterns only]
System Operations (Shell, File, Network)
```

**Key Risk:** Agent trusts LLM output, minimal validation before system operations

---

## Authentication & Authorization

### Authentication Mechanisms

| Component | Method | Storage | Security Level |
|-----------|--------|---------|----------------|
| **Telegram** | Bot Token | config.json (plaintext) | 🔴 Low |
| **WhatsApp** | QR Code + Session | Multi-file auth (plaintext) | 🔴 Low |
| **LLM APIs** | API Keys | config.json (plaintext) | 🔴 Low |
| **Azure AD** | DefaultAzureCredential | OS credential store | 🟢 High |
| **Brave Search** | API Key | config.json (plaintext) | 🔴 Low |

### Authorization Model

- **Channel-level:** `allow_from` list (user IDs)
  - Telegram: Enforced
  - WhatsApp: Not enforced (bug)
  - CLI: Always allowed (local only)

- **Tool-level:** No authorization (all tools available to all users)

- **File-level:** Relies on OS permissions only

**Gaps:**
- No role-based access control (RBAC)
- No per-user tool restrictions
- No workspace isolation per user

---

## Data Protection

### Data at Rest

| Data Type | Location | Encryption | Backup | Retention |
|-----------|----------|------------|--------|-----------|
| **API Keys** | `~/.nanobot/config.json` | ❌ Plaintext | Not managed | Indefinite |
| **Session History** | `~/.nanobot/sessions/*.jsonl` | ❌ Plaintext | Not managed | Indefinite |
| **WhatsApp Creds** | `~/.nanobot/whatsapp-auth/` | ❌ Plaintext | Not managed | Indefinite |
| **Memory Notes** | `~/.nanobot/workspace/memory/` | ❌ Plaintext | Not managed | Indefinite |
| **Media Files** | `~/.nanobot/media/` | ❌ Plaintext | Not managed | Indefinite |
| **Cron Jobs** | `~/.nanobot/cron/jobs.json` | ❌ Plaintext | Not managed | Indefinite |

**Risks:**
- All data readable if file system is compromised
- No secure deletion
- No data lifecycle management
- No PII handling

### Data in Transit

| Connection | Encryption | Certificate Validation | Secure |
|------------|------------|------------------------|--------|
| Telegram → Agent | ✅ HTTPS (TLS 1.2+) | ✅ Default | 🟢 Yes |
| WhatsApp → Bridge | ✅ HTTPS (E2E) | ✅ Default | 🟢 Yes |
| Bridge → Agent | ❌ **ws:// Plaintext** | ❌ N/A | 🔴 **No** |
| Agent → LLM APIs | ✅ HTTPS (TLS 1.2+) | ✅ Default | 🟢 Yes |
| Agent → Web | ✅ HTTPS (TLS 1.2+) | ✅ Default | 🟢 Yes |

**Critical Gap:** WhatsApp bridge-to-agent communication is unencrypted

---

## Compliance & Privacy

### GDPR Considerations

- **Personal Data:** Session history contains user messages (PII)
- **Right to Erasure:** No mechanism to delete user data
- **Data Minimization:** No automatic data cleanup
- **Consent:** No explicit consent mechanism
- **Data Processing Agreement:** Not applicable (self-hosted)

### Sensitive Data Handling

| Data Type | Current Handling | Recommendation |
|-----------|------------------|----------------|
| **API Keys** | Plaintext in config | Encrypt at rest |
| **User Messages** | Stored indefinitely | Implement retention policy |
| **Voice Recordings** | Transcribed, file deleted | Document policy |
| **Media Files** | Stored locally | Add expiration |
| **Session State** | No cleanup | Implement TTL |

---

## Threat Model

### Threat Actors

1. **Malicious User (External)**
   - Access: Telegram/WhatsApp message input
   - Goal: Command injection, data exfiltration
   - Mitigation: Input validation, rate limiting

2. **Compromised LLM (Supply Chain)**
   - Access: Tool execution control
   - Goal: System compromise via shell/file tools
   - Mitigation: Sandboxing, tool whitelisting

3. **Local Attacker (Insider)**
   - Access: File system, process memory
   - Goal: Steal API keys, session data
   - Mitigation: Encryption at rest, secure deletion

4. **Network Attacker (MITM)**
   - Access: localhost WebSocket
   - Goal: Intercept WhatsApp messages
   - Mitigation: Use wss://, Unix sockets

### Attack Scenarios

#### Scenario 1: Shell Command Injection
```
Attacker → Telegram → Agent → Shell Tool
1. User sends crafted message to bot
2. LLM decides to execute shell command
3. Attacker payload bypasses regex deny patterns
4. Arbitrary code execution on host
```

**Mitigations:**
- Command whitelisting
- Containerization
- No shell interpreter

#### Scenario 2: Credential Theft
```
Local Attacker → File System → config.json
1. Attacker gains read access to ~/.nanobot/
2. Reads config.json (plaintext)
3. Extracts all API keys and tokens
4. Uses keys to impersonate agent
```

**Mitigations:**
- Encryption at rest
- File permissions (0600)
- Secrets manager integration

#### Scenario 3: MITM on WhatsApp Bridge
```
Attacker → localhost → WebSocket (ws://)
1. Attacker connects to ws://localhost:3001
2. Receives all WhatsApp messages (plaintext)
3. Can send spoofed messages to agent
4. No authentication required
```

**Mitigations:**
- Use wss:// with TLS
- Require authentication token
- Use Unix domain sockets

#### Scenario 4: SSRF via Web Tool
```
LLM → Web Fetch Tool → Internal Network
1. LLM decides to fetch URL
2. Attacker provides internal IP (e.g., http://169.254.169.254/)
3. Agent fetches cloud metadata service
4. Credentials leaked in response
```

**Mitigations:**
- Block private IP ranges
- Implement DNS rebinding protection
- Allowlist domains

---

## Security Best Practices (Recommendations)

### Immediate Actions (High Priority)

1. **Encrypt Secrets at Rest**
   - Use `python-keyring` or HashiCorp Vault
   - Encrypt config.json with user passphrase
   - Set file permissions to 0600

2. **Upgrade WebSocket to TLS**
   - Change `ws://` to `wss://`
   - Generate TLS certificates (self-signed for localhost)
   - Add authentication tokens

3. **Add Rate Limiting**
   - Implement per-user rate limits
   - Add token bucket algorithm
   - Set max concurrent operations

4. **Sandbox Shell Execution**
   - Use Docker/Podman containers
   - Switch to `subprocess.run()` with argument lists
   - Implement command whitelisting

5. **Audit Logging**
   - Log all tool executions
   - Log security events (auth failures, blocked commands)
   - Implement log rotation

### Medium-Term Actions

1. **Implement RBAC**
   - Define user roles (admin, user, readonly)
   - Restrict tools per role
   - Add per-user workspaces

2. **Add Security Monitoring**
   - Detect suspicious patterns (repeated command failures)
   - Alert on high-risk operations (rm, wget sensitive URLs)
   - Implement anomaly detection

3. **Input Validation Framework**
   - Centralized validation for all tools
   - Whitelist-based approach
   - Schema validation for all parameters

4. **Data Lifecycle Management**
   - Implement retention policies
   - Auto-delete old sessions
   - Secure deletion for sensitive files

### Long-Term Actions

1. **Zero Trust Architecture**
   - Mutual TLS (mTLS) for all connections
   - Certificate-based authentication
   - Continuous verification

2. **Formal Security Audit**
   - Penetration testing
   - Code audit by security experts
   - Compliance certification (if needed)

3. **Security Hardening**
   - SELinux/AppArmor profiles
   - Seccomp filters
   - Namespaces and cgroups

4. **Incident Response Plan**
   - Define response procedures
   - Implement alerting and monitoring
   - Regular security drills

---

## Security Configuration Guide

### Recommended config.json Settings

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "<use secrets manager>",
      "allow_from": ["12345678"]  // ⚠️ Always set explicit allow-list
    },
    "whatsapp": {
      "enabled": false  // ⚠️ Disable until wss:// is implemented
    }
  },
  "tools": {
    "exec": {
      "timeout": 30,
      "restrict_to_workspace": true  // ⚠️ Always enable
    }
  },
  "gateway": {
    "host": "127.0.0.1",  // ⚠️ Never use 0.0.0.0 unless required
    "port": 18790
  }
}
```

### File Permissions

```bash
# Secure the nanobot directory
chmod 700 ~/.nanobot
chmod 600 ~/.nanobot/config.json
chmod 700 ~/.nanobot/whatsapp-auth
chmod 600 ~/.nanobot/whatsapp-auth/*
```

### Environment Variables

```bash
# Don't use these (stored in plaintext environment)
# NANOBOT_PROVIDERS__AZURE__API_KEY=...

# Instead, use a secrets manager or encrypted config
```

---

## Security-Critical Files

| File | Risk Level | Description |
|------|------------|-------------|
| [nanobot/providers/litellm_provider.py:42-55](nanobot/providers/litellm_provider.py) | 🔴 High | Sets API keys in environment |
| [nanobot/agent/tools/shell.py:111-141](nanobot/agent/tools/shell.py) | 🔴 Critical | Shell command execution |
| [nanobot/channels/base.py:59-82](nanobot/channels/base.py) | 🟡 Medium | Permission filtering |
| [nanobot/config/loader.py](nanobot/config/loader.py) | 🔴 High | Config file loading |
| [bridge/src/server.ts](bridge/src/server.ts) | 🔴 Critical | WebSocket bridge (no TLS/auth) |
| `~/.nanobot/config.json` | 🔴 Critical | Plaintext secrets storage |
| `~/.nanobot/whatsapp-auth/` | 🔴 High | WhatsApp credentials |

---

## Conclusion

Nanobot's architecture provides a clean separation of concerns via the message bus pattern, but has several **critical security gaps** that should be addressed:

### Top 3 Priorities

1. **Encrypt secrets at rest** (config.json, auth files)
2. **Secure WebSocket communication** (ws:// → wss://)
3. **Sandbox tool execution** (containers, command whitelisting)

### Risk Assessment

| Category | Current Risk | With Mitigations |
|----------|--------------|------------------|
| **Credential Theft** | 🔴 High | 🟢 Low |
| **Command Injection** | 🔴 Critical | 🟡 Medium |
| **Data Exfiltration** | 🔴 High | 🟡 Medium |
| **MITM Attacks** | 🔴 High | 🟢 Low |
| **Unauthorized Access** | 🟡 Medium | 🟢 Low |

This analysis should guide security improvements and help prioritize remediation efforts.

---

**Document Version:** 1.0
**Last Updated:** 2026-02-04
**Reviewed By:** Claude Sonnet 4.5 (Architecture Analysis)
