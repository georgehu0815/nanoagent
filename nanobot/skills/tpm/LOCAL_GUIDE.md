# TPM Skill — Run Locally (Bash Blocked)

The TPM skill requires the `tpm` CLI, but **bash execution is not available in this environment**.
Run the command below on your local machine and paste the output back here — I'll interpret the results for you.

---

## Prerequisites

**Auth** (one-time setup):
```bash
az login
```
DefaultAzureCredential picks up your `az login` session automatically.

**CLI location:** `/usr/local/bin/tpm`

---

## Commands by Scenario

### Health check
```bash
tpm hello
tpm hello --save-report    # also writes a markdown report file
tpm hello --dry-run        # preview queries without running them
```

### Attestation status
```bash
tpm attestation
tpm attestation --save-report
```

### TPM clear reasons
```bash
tpm clear
tpm clear --save-report
```

### RQV measure failures
```bash
tpm rqv
tpm rqv -v                 # verbose — shows each MCP request
tpm rqv --save-report
```

### State changes (firmware / manufacturer)
```bash
tpm statechange
tpm statechange --save-report
```

### Decode manufacturer IDs
```bash
tpm decode 1229346816 1297303124 1229870147   # one or more IDs
tpm decode --json 1229346816                   # machine-readable output
tpm decode --table                             # full TCG vendor table
```

---

## Common Flags

| Flag | What it does |
|------|-------------|
| `--save-report` | Saves a markdown report to `reports/<scenario>_report_<timestamp>.md` |
| `--dry-run` | Prints the queries that would be sent — no network call |
| `--token <JWT>` | Supplies a bearer token explicitly (bypasses DefaultAzureCredential) |
| `-v` / `--verbose` | Shows debug logging including MCP request/response |

---

## Quick-pick by question

| You want to know... | Command |
|---|---|
| TPM hello success/error rates, failing models | `tpm hello` |
| How many devices can / cannot be attested | `tpm attestation` |
| Why TPMs are being cleared, who's requesting it | `tpm clear` |
| RQV measure failing — root cause | `tpm rqv` |
| Firmware or manufacturer changes across fleet | `tpm statechange` |
| What manufacturer ID `1229346816` means | `tpm decode 1229346816` |
| All TCG vendor codes | `tpm decode --table` |

---

## Workflow

1. Run the matching command above in your terminal
2. Paste the full output back into this chat
3. I'll analyse the results, decode any raw manufacturer IDs, and summarise findings
