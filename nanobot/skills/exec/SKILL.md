---
name: exec
description: >
  Run shell commands on the nanobot server. Use when the user asks to run a
  command, script, or CLI tool; check a process, port, or file; inspect logs;
  or perform any task that requires executing a program locally.
---

# Exec Tool

Run any shell command on the nanobot server and return its output.

**Tool name:** `exec`
**Parameters:**
- `command` *(required)* — the shell command string
- `working_dir` *(optional)* — override the working directory (default: workspace root)

**Output limit:** 10,000 characters. Longer output is truncated automatically.
**Timeout:** 60 s by default (configurable via `tools.exec.timeout` in `nanobot.yaml`).

---

## Basic Usage

```
exec(command="echo hello")
exec(command="python3 script.py")
exec(command="cat /var/log/app.log | tail -50")
exec(command="ls -lh /tmp", working_dir="/")
```

Pipe, redirect, and chain operators all work — the command runs through `/bin/sh -c`.

---

## Patterns

### Check if a program is installed
```
exec(command="which tpm && tpm --version")
```

### Read the last N lines of a log
```
exec(command="tail -100 /var/log/nanobot/app.log")
```

### Run a Python one-liner
```
exec(command="python3 -c \"import json,sys; print(json.dumps({'ok':True}))\"")
```

### Check a port
```
exec(command="lsof -i :8080 | head -5")
```

### Capture stderr separately
stderr is appended under a `STDERR:` heading in the result when non-empty.

### Long-running commands
Increase timeout in config if a command regularly exceeds 60 s:
```yaml
tools:
  exec:
    timeout: 300
```

---

## Safety Guards

The following are **always blocked** regardless of config:

| Pattern | Blocked command examples |
|---------|--------------------------|
| `rm -r` / `rm -rf` | `rm -rf /tmp/foo` |
| `del /f` / `del /q` | Windows destructive deletes |
| `rmdir /s` | Windows recursive remove |
| `format` (standalone) | `format C:` |
| `mkfs` / `diskpart` | Disk operations |
| `dd if=` | Raw disk writes |
| `> /dev/sd*` | Write to block device |
| `shutdown` / `reboot` / `poweroff` | System power |
| Fork bomb `:(){ ... }` | Process exhaustion |

### Optional allowlist (restrict to specific commands)

Set `allow_patterns` in `nanobot.yaml` to restrict exec to a whitelist.
If set, **only** commands matching one of the patterns are permitted.

```yaml
tools:
  exec:
    allow_patterns:
      - "^tpm "          # only tpm * commands
      - "^python3 "      # only python3 * commands
```

Leave `allow_patterns` empty (the default) to permit all commands not matched by the deny list.

### Optional extra deny patterns

Add regex patterns to block specific commands beyond the built-in guards:

```yaml
tools:
  exec:
    deny_patterns:
      - "\\bcurl\\b"     # block curl
      - "\\bwget\\b"     # block wget
```

### Workspace restriction

Set `tools.restrict_to_workspace: true` to prevent path traversal and absolute
paths outside the workspace:

```yaml
tools:
  restrict_to_workspace: true
```

---

## Decision Guide

| Task | Command |
|------|---------|
| Run a skill's CLI tool (e.g. `tpm`, `hermes`) | `exec(command="<tool> <args>")` |
| Check running processes | `exec(command="ps aux | grep <name>")` |
| Inspect a log file | `exec(command="tail -200 <path>")` |
| Test network connectivity | `exec(command="curl -sf <url>")` |
| Run a Python/Node/shell script | `exec(command="python3 <script>")` |
| Check disk / memory usage | `exec(command="df -h && free -h")` |
| Preview a command without running it | Ask the user to confirm, or use `--dry-run` if the CLI supports it |

---

## Error Handling

| Return value | Meaning |
|---|---|
| `Error: Command blocked by safety guard (dangerous pattern detected)` | Matches a deny pattern — do not retry as-is |
| `Error: Command blocked by safety guard (not in allowlist)` | `allow_patterns` is set and command doesn't match — check config |
| `Error: Command blocked by safety guard (path outside working dir)` | `restrict_to_workspace` is on and the path escapes the workspace |
| `Error: Command timed out after N seconds` | Increase `tools.exec.timeout` in `nanobot.yaml` — some CLIs (e.g. `tpm hello`) take 2–3 min |
| `STDERR:\n...` appended to output | Command wrote to stderr — check for warnings or errors |
| Non-zero `Exit code: N` appended | Command failed — check stderr output above it |
