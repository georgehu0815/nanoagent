---
name: hermes
description: Query the Hermes StarRocks analytics platform using the mcp-hermes CLI. Use when the user asks a business or data question against StarRocks, wants to explore available tables or columns, needs to generate SQL from natural language, or wants to execute a SELECT query. Triggers on "hermes", "hermes tools", "StarRocks", "query", "what tables", "show me data", "generate SQL", "find column", "active users", "revenue", or any analytics/data question.
---

# Hermes StarRocks CLI Skill

Answer business data questions by running the `mcp-hermes` CLI tools.

## Setup

- **CLI binary:** `/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes`
- **Prerequisite:** Azure CLI login (`az account show` to verify)

All commands use the full path to the venv binary above.

## Recommended Workflow

Always follow this order — skip steps that are not needed:

```
0. tools               → discover mcp tools and their purpose
1. get-tables          → discover what datasets exist
2. get-columns         → inspect schema before writing SQL
3. find-columns        → resolve unknown column names by keyword
4. find-terminologies  → map business terms to canonical definitions
5. find-joins          → validate join paths before multi-table SQL
6. sql                 → generate SQL from the user's question
7. execute             → run the final SELECT statement
```

## Commands

### 0. Explore available tools
```bash
python /Users/ghu/aiworker/mcp-hermes/cli.py tools
```

---

### 1. List available tables
```bash
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes get-tables
```
No arguments. Run this first when the user asks "what data is available?" or you don't know which tables to use.

---

### 2. Get table schema
```bash
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes get-columns --table <table_name>
```
Run before generating SQL. Replace `<table_name>` with a name from `get-tables`.

---

### 3. Fuzzy-search for columns
```bash
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes find-columns --search "<terms>" [--domain <domain>] [--dataset <dataset>]
```
- `--search`: comma-separated terms, e.g. `"device id,status,revenue"`
- `--domain`: optional scope, e.g. `sales`, `telemetry`, `iot`
- `--dataset`: optional narrow to a specific table

Use when: the user says "device id" but the actual column name is unknown.

---

### 4. Resolve business terminology
```bash
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes find-terminologies --search "<terms>" [--domain <domain>]
```
- `--search`: semicolon-separated business terms, e.g. `"active users; churn rate"`
- `--domain`: optional domain scope

Use when: the user uses business language like "active users", "DAU", "net revenue". Always do this before generating SQL for metric-heavy questions.

---

### 5. Validate join relationships
```bash
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes find-joins --datasets "<ds1>:<ds2>" [--domain <domain>]
```
- `--datasets`: colon-separated pairs; multiple pairs comma-separated, e.g. `"orders:customers,orders:products"`

Use when: the question requires joining two or more tables.

---

### 6. Generate SQL from natural language
```bash
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes sql --query "<question>" --domain "<domain>"
```
Output includes:
- `SQL:` — the generated statement
- `Confidence:` — 0–1 reliability score; surface this to the user
- `Summary:` — plain English explanation
- `Alternate solutions:` — shown if alternatives exist

**Always show the confidence score to the user.** If confidence < 0.7, warn them and show alternates.

---

### 7. Execute a SELECT query
```bash
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes execute --query "<SQL>"
```
- Only `SELECT` statements are accepted; the CLI enforces this
- Use the SQL from step 6, or a validated statement the user provides
- **Never execute raw unvalidated user SQL directly** — always confirm first

---

## Decision Guide

| User says... | Start with... |
|---|---|
| "what hermes mcp tools do you have?" | `tools` |
| "What tables exist?" / "What data do you have?" | `get-tables` |
| "What columns does X have?" | `get-columns --table X` |
| "Show me [business metric]" | `find-terminologies` → `sql` → `execute` |
| "Find me a column called [name]" | `find-columns --search "[name]"` |
| "Join X and Y" | `find-joins` → `sql` → `execute` |
| "Run this SQL: SELECT ..." | `execute` (confirm with user first) |
| Any analytics question | `find-terminologies` → `sql` → `execute` |

## Error Handling

If any command fails, always display:

```
Contact: Windows Data SDS Access Team
Email:   wddsdsaccessteam@microsoft.com
Service Tree: 58847a71-4fab-4e02-be7f-a04c68ab5cdb
Guide:   https://aka.ms/hermesmcp

Include: correlation_id + full error message
```

Common errors:

| Error | Fix |
|---|---|
| `DefaultAzureCredentialError` | Run `az login` |
| `401 Unauthorized` | Re-authenticate: `az login` |
| `httpx.ConnectError` | Check VPN / network |
| `HTTP 403` | Permission issue — contact support team |

## Example: Full end-to-end flow

User asks: *"what hermes mcp tools do you have?"*
```bash
# 0. Resolve "hermes mcp tools"
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes tools
```

User asks: *"Show active users by region for last quarter"*

```bash
# 1. Resolve "active users"
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes find-terminologies --search "active users" --domain analytics

# 2. Find the region column
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes find-columns --search "region" --domain analytics

# 3. Generate SQL
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes sql \
  --query "Show active users by region for last quarter" \
  --domain analytics

# 4. Execute (using the SQL from step 3 output)
/Users/ghu/aiworker/mcp-hermes/.venv/bin/hermes execute \
  --query "SELECT region, COUNT(DISTINCT user_id) FROM user_activity WHERE ..."
```
