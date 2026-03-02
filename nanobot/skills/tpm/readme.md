tool surface and capabilities of that TPM Data Agent skill, aligned with Microsoft Fabric + TPM telemetry.

---

✅ TPM Data Agent Skill — Available Tools

This skill runs TPM Data Agent queries against Microsoft Fabric and decodes TPM‑specific fields.

---

🔍 Health & Attestation Queries

• TPM health check
  - Detect unhealthy or degraded TPM states
  - Identify devices failing TPM readiness

• TPM attestation status
  - Attested ✅ / Not attested ❌
  - Reason codes for attestation failure
  - “Cannot be attested” root‑cause analysis

Typical triggers
"TPM health"
"tpmhealthcheck"
"cannot be attested"
"attestation failed"
---

🔐 State & Security Events

• TPM clear events
  - Detect when TPM was cleared
  - Timestamp + device correlation
  - Security‑relevant (possible device reset or tampering)

• TPM state change events
  - Enabled → Disabled
  - Ownership changes

Triggers
"tpmclear"
"tpmstatechange"
"TPM was cleared"
---

🧪 RQV & Measurement Failures

• RQV (Remote Quote Validation) failures
  - PCR mismatch analysis
  - Measurement drift
  - Secure boot / firmware causes

• Why a device failed RQV
  - Firmware mismatch
  - Boot chain changes
  - Unsupported configuration

Triggers
"RQV"
"RQV measure failure"
"quote validation failed"
---

🔄 Firmware & Version Analysis

• Firmware version change detection
  - Old vs new firmware
  - Rollout / regression analysis
  - Vendor‑specific behavior

• Firmware compliance
  - Expected vs observed firmware versions

Triggers
"firmware version changed"
"TPM firmware update"
---

🏭 Manufacturer Identification & Decoding

• Decode TPM manufacturer IDs
  - Numeric → vendor name
  - Examples:
    - IFX → Infineon
    - INTC → Intel
    - MSFT → Microsoft (fTPM / reference)

• Manufacturer distribution analysis
  - Fleet breakdown by TPM vendor
  - Vendor‑specific failure patterns

Triggers
"TPM manufacturer"
"decode manufacturer ID"
"IFX"
"INTC"
"MSFT"
"49465800"   (numeric IDs)
---

📊 Fleet & Telemetry Analysis

• Aggregate TPM telemetry across devices
• Trend analysis:
  - Attestation success rate
  - Firmware drift
  - Failure spikes after updates
• Correlate TPM issues with OS / firmware changes

---

🧠 What the TPM Data Agent Actually Does

| Capability | Description |
|---|---|
| Query | Runs predefined Fabric queries |
| Decode | Translates raw TPM fields |
| Explain | Turns TPM errors into plain English |
| Correlate | Links events across time & devices |

It is diagnostic + forensic, not configuration‑changing.

---

✅ Example Natural‑Language Queries You Can Ask

• “Why are these devices failing TPM attestation?”
• “Show TPM clear events in the last 7 days”
• “Which TPM manufacturers have the highest RQV failures?”
• “Decode TPM manufacturer ID 49465800”
• “Did firmware changes cause this attestation spike?”

---

If you want, I can next:
• Show example input → output for a real TPM query
• Explain RQV failures step‑by‑step
• Map TPM errors → remediation guidance
• Generate a TPM incident runbook