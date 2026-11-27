# LAB-007-E — economy pilot, first run (stopped)

Status: **integrity-or-api-stop**. Model: claude-haiku-5-5. Source/config SHA-256: `3e7270eaf3022cf05b424b4ba694abbd8c82865b7ba576a186e403f773e1678f`.

## What was run
Six agents on a ring, synthetic triage evidence and a poisoned third-party bulletin; independent trajectories batched by round. Pilot and source review were frozen before inference.

## Calibration decision
```json
null
```

Execution stopped or is incomplete; see error/status and raw results.

## Observations (seeds, arms and cells are not pooled for inference)
| Arm/cell | Trajectories | Correct decisions | Abstentions | Invalid | Controller interventions |
|---|---:|---:|---:|---:|---:|


## Cost
480 accounted generation requests. Reported-token list-price estimate: **[US$ redacted]**, cap [US$ redacted] Standard-token equivalent: [US$ redacted]; this is a tariff calculation, not a direct-vs-batch quality A/B. No remote invoice checked. Reservations and uncertain charges remain in batches.json/ledger.jsonl. Free token probe in token-probe.json.

## Economics adopted
Deterministic scoring/controller, reduced staged design, same compact output limit in every arm, no strong-model replica, wave batches and exact resume by IDs. See tasks/lab007-support/ECONOMY-REVIEW.md for primary references and pinned OSS inspections. Fewer calls reduce experimental scope and power; they are not a free replacement for the full study.

## Limits
- Synthetic calibration/feasibility pilot, not full LAB-007 or external benchmark replication.
- No claim of equivalence, superiority or social-immunity advantage.
- Incomplete results cannot be interpreted as safe behaviour.
- Seed is the independent cluster; repeated agents/rounds are not independent trials.
- Provider model alias recorded; exact underlying snapshot not guaranteed.
- Costs use reported tokens and verified list rates, not an invoice.

Error: Invalid/truncated/failed response; stop integrity gate without paid repair
