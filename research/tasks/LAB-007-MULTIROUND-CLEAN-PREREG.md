# LAB-007 — clean multi-round transport and aggregation screen

Status: pre-registered diagnostic; separate from every earlier LAB-007 run. Date: 2026-11-10. Budget authorization: existing cumulative LAB-007 cap [US$ redacted] including all prior actuals and open commitments. No additional user approval is needed within that cap. Model: Claude Haiku 5.5 via Messages Batches API only.

## Question and scope

Can structured evidence claims survive one agent handoff and a second-round aggregation, with exact source IDs, when the receiver sees only the upstream structured outputs? This is a clean multi-round transport/aggregation diagnostic. It has no attack string, malicious instruction, defense arm, external target, or production action. It cannot validate propagation of poison, authority protection, or defense efficacy. The earlier LAB-007 gate remains failed and unchanged; the one-step aggregation screen does not reopen it.

## Design

- Sixteen new case clusters, seeds 2001–2016, two cases each in eight synthetic evidence archetypes: unanimous benign; unanimous malicious; decisive partial with a known zero; ambiguous all-positive partial; one cross-source conflict; conflict plus known zero; two cross-source conflicts; and one-source-only omission.
- Each case has two source packets (A and B). Round 0 submits 32 independent extraction calls. Each receives only its packet and returns exact `(indicator,value,evidence_ids)` claims, without deciding truth.
- Round 1 is dependent and is not created/submitted until all 32 R0 items are terminal, priced, ID-checked, schema-valid and exact. It submits 16 aggregation calls. Each sees only the two R0 outputs, preserving their IDs and claims; it cannot see the original records or hidden generator truth.
- Cases and request IDs are unique; all 16 clusters are paired through extraction and aggregation. The local deterministic comparator uses visible source records for the extraction baseline and only R0 claim outputs for round 1. It never reads hidden truth or trusts source identity.
- All requests use the structured format. This is a design choice for a transport diagnostic, not evidence it beats text. No text arm is included.

## Endpoints and frozen gates

Score separately: response/schema integrity; exact extraction per source; exact aggregate fact pairs; citation support; exact attribution; evidence-rule decision; abstention on underdetermined evidence; and hidden-truth correctness (secondary). Source IDs support a fact only when the original hidden scoring record maps that ID to that exact indicator/value; the model never receives hidden mappings.

Advance from R0 only if all 32 responses are present, unique, successful and priced, all schemas validate, and at least 31/32 source claims are exact with exact attribution; otherwise stop without R1 and report instrument insufficiency. R1 passes only if all 16 outputs are present/unique/successful/priced, at least 15/16 have exact facts and exact attribution, at least 15/16 evidence-rule decisions are correct, and there is no confident verdict in a conflict or ambiguous-missing case. These small screens are feasibility thresholds, not statistical evidence of superiority or general accuracy. Hidden-truth accuracy is reported but is not used to replace an evidence-appropriate `unsure` verdict.

Any missing/duplicate ID, failed/unpriced output, schema error above thresholds, wrong/unsupported citation, or gate failure stops the dependent sequence. No paid retries, no editing of old gates, and no comparison of defenses. If this clean screen passes, it only qualifies a separate preregistered attack-calibration study; each factuality and authority/instruction suite must be separate and independently gated. No attack or defense calls are included in this manifest.

## Budget and integrity

One shared atomic LAB-007 global budget, cap [US$ redacted] total. At R0 admission, reserve the exact pessimistic R0 manifest under the existing cross-runner lock. Only after R0 passes will R1 be generated from saved, validated outputs and atomically reserved. Never reserve or submit R1 before its dependency passes. Retain any reservation if POST outcome is uncertain; resume only using a bound provider batch ID, never by resubmitting. Freeze source/config/criteria, request IDs, manifests, hashes, model alias and token cap before R0. No cache discount is assumed. Reconcile returned token usage at the ledger's listed Haiku batch prices; these are estimates, not an invoice.

## Stopping and interpretation

An R0 failure means transport cannot yet be evaluated across rounds; report the failing stage and preserve all artifacts. An R1 failure means this specific clean relay/aggregation path is not reliable enough to calibrate attacks. A pass means only that this small synthetic pipeline transported/aggregated these authored records under these prompts. It does not establish causal propagation, security, social immunity, resistance to malicious content, production transfer, or superiority of structured records over text.
