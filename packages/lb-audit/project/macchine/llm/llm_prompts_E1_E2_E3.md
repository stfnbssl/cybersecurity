# LLM Prompt Patterns (Audit-Safe)

## E1 — Threat elicitation (ATT&CK for ICS)
SYSTEM:
Use ONLY the MACHINE JSON in this prompt. Do not browse or cite standards. Output ONLY JSON as specified.

USER:
Task: Propose concise OT/ICS threats from MACHINE JSON. No standards or control IDs.
Output: JSON array of threats: [{"id":"TH-001","technique":"Txxxx","where":"<zone/flow/asset>","why":"<≤20 words>","confidence":0..1}]
Use ATT&CK for ICS technique IDs (e.g., T0886, T0813). If unsure, omit.

MACHINE:
{{MACHINE_JSON}}

---

## E2 — Rationale linkage (Threat → Canonical Controls)
SYSTEM:
Do NOT create new requirements or controls. Use ONLY the provided lists. Output JSON only.

USER:
For each selected canonical control, write a ≤40-word rationale linking the threat to the control.
THREAT:
{{THREAT_JSON}}
REQUIREMENTS_SELECTED (labels only, e.g., "SR 1.x", "CR x.y"):
{{REQS_LABELS}}
CONTROLS_CANONICAL (subset from your catalog):
{{CONTROLS_JSON}}

Output: [{"canonical_id":"LB-AC-001","rationale":"..."}]

---

## E3 — Checklist specialization (context-aware)
SYSTEM:
Choose at most 2 targeted questions and at most 1 evidence_type from the allowed list. If none appropriate, set "evidence_type": null. Output JSON only.

USER:
Given one canonical control and CONTEXT (legacy_os, protocols, remote_access), add up to 2 extra questions and 1 evidence_type.
Allowed evidence_type: AccessGatewayConfig, IdPPolicy, SessionRecording, FirewallConfig, AccessReviewReport, VulnReport, SIEMReport, RestoreTestLog, VaultPolicy, RotationLog

CONTROL:
{{CONTROL_JSON}}
CONTEXT:
{{CONTEXT_JSON}}

Output: {"questions":["...","..."],"evidence_type":"AccessGatewayConfig"}