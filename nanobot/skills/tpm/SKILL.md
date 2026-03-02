---
name: tpm
description: >
  Run TPM Data Agent queries against Microsoft Fabric and decode TPM data.
  Use when the user asks about TPM health, attestation status, firmware changes,
  TPM clear events, RQV measure failures, manufacturer identification, or wants to
  analyse TPM device telemetry. Triggers on: "TPM", "attestation", "tpmhealthcheck",
  "tpmhello", "tpmclear", "tpmstatechange", "RQV", "firmware version changed",
  "cannot be attested", "TPM manufacturer", "decode manufacturer ID", "IFX", "INTC",
  "MSFT" in TPM context, or any numeric manufacturer IDs from query results.
allowed-tools: Bash(tpm *)
---

# TPM Data Agent CLI Skill

Answer TPM telemetry questions by running the `tpm` CLI tool against the Fabric Data Agent MCP server.

**CLI location:** `/usr/local/bin/tpm`
**Source:** `/Users/ghu/work/CatalystDataLakeAgent/Demo_FabricDataAgent_TPM/tpm_cli.py`
**Auth:** DefaultAzureCredential (falls back to `az login` session automatically)

---

## Available Scenarios

!`tpm scenarios`

---

## Scenario Commands

### `tpm hello` — Hello scenario health check
Runs 3 queries against `tpmhello` table (last 7 days):
- **Query 1:** Overall success rate and failure rate (%)
- **Query 2:** Top 5 error codes with failure rate per bucket
- **Query 3:** Top 5 OEM device models with highest failure rate

```bash
tpm hello
tpm hello --save-report
tpm hello --dry-run
```

---

### `tpm attestation` — Attestation status distribution
Runs 1 query against `tpmhealthcheck` table:
- Device count + % by HealthStatus: `Attestable` / `Possibly attestable` / `Cannot be attested`
- Top 3 manufacturers (by TpmManufacturerName) where devices **cannot be attested**

```bash
tpm attestation
tpm attestation --save-report
```

---

### `tpm clear` — TPM clear reasons
Runs 1 query against `tpmclear` table:
- Top 3 `prov_data_reason` (provisioning clear reasons) by device count + %
- Top 3 `drv_data_requester` (driver requesters) by device count + %

```bash
tpm clear
tpm clear --save-report
```

---

### `tpm rqv` — RQV measure failure analysis
Runs 3 deep-dive queries for measure ID `50980214` (Mission Control):
- **Query 1:** Success / failure rate for the measure
- **Query 2:** Top failures in the failing slice — correlate by hardware, model, platform, firmware, OS SKU, OS build, TPM type, manufacturer
- **Query 3:** Pattern/regression analysis on failing devices — missing required attributes and why they are not attestable

```bash
tpm rqv
tpm rqv -v            # verbose: shows each MCP request
tpm rqv --save-report
```

---

### `tpm statechange` — TPM state changes since last run
Runs 1 query against `tpmstatechangedsincelastrun` table (3 sub-questions):
- Count of distinct devices with **firmware version changed** → top 3 TPM manufacturers
- Count of distinct devices with **manufacturer changed** → top 3 OEMs
- Count of distinct devices where **both** manufacturer and firmware changed → top 3 device models

Column reference:
- Firmware change: `data_currentFirmwareVersion` ≠ `data_lastFirmwareVersion`
- Manufacturer change: `data_currentManufacturerId` ≠ `data_lastManufacturerId`
- OS build change: `data_currentBuildNumber` ≠ `data_lastBuildNumber`

```bash
tpm statechange
tpm statechange --save-report
```

---

## Decode Command

### `tpm decode` — Decode numeric TPM Manufacturer IDs to vendor names
TCG spec: 4-byte big-endian ASCII packed into a 32-bit integer (e.g. `1229346816` → `IFX` → Infineon).

```bash
# Decode one or more IDs
tpm decode 1229346816 1297303124 1229870147

# JSON output (for scripting)
tpm decode --json 1229346816 1297303124 1229870147

# Pipe from another command
echo "1229346816 1297303124" | tpm decode

# Full TCG vendor table
tpm decode --table
```

**Example output:**
```
          ID  Code    Vendor
--------------------------------------
  1229346816  IFX     Infineon Technologies
  1297303124  MSFT    Microsoft
  1229870147  INTC    Intel
```

**Known vendors:**
!`tpm decode --table`

---

## Common Flags (all scenario commands)

| Flag | Description |
|------|-------------|
| `--save-report` | Save markdown report to `reports/<scenario>_report_<timestamp>.md` |
| `--dry-run` | Print the queries that would be sent — no MCP call made |
| `--token <JWT>` | Supply a bearer token explicitly (skips DefaultAzureCredential) |
| `-v` / `--verbose` | Show debug logging including MCP request/response details |

---

## Workflow

### When the user asks a TPM health question:
1. Pick the matching scenario from the table above
2. Run `tpm <scenario>` (add `--save-report` if user wants a file)
3. Present the Markdown response — it's already formatted with tables and insights
4. If manufacturer IDs appear as raw numbers, run `tpm decode <ids>` and enrich the response

### When manufacturer IDs appear in results:
```bash
tpm decode 1229346816 1297303124 1229870147
```
Then update the table replacing IDs with `Code — Vendor` columns.

### When asked to investigate a failure:
Start with the most relevant scenario; use `--dry-run` first if clarifying scope:
```bash
tpm rqv --dry-run     # shows all 3 query texts before committing
tpm rqv               # run the full analysis
```

---

## Decision Guide

| User asks... | Command |
|---|---|
| "TPM hello success rate / top errors / failing models" | `tpm hello` |
| "How many devices can / cannot be attested?" | `tpm attestation` |
| "Why are TPMs being cleared? Who is requesting it?" | `tpm clear` |
| "RQV measure failing, what's going on?" | `tpm rqv` |
| "What firmware / manufacturer changes happened?" | `tpm statechange` |
| "What does manufacturer ID 1229346816 mean?" | `tpm decode 1229346816` |
| "List all TCG vendors / manufacturer codes" | `tpm decode --table` |
| "Run all queries and save to file" | `tpm <scenario> --save-report` |

---

## Example: Full statechange flow with decode

```bash
# 1. Run the statechange query
tpm statechange

# 2. Decode the manufacturer IDs from the result
tpm decode 1229346816 1297303124 1229870147

# 3. Save a combined report
tpm statechange --save-report
```
