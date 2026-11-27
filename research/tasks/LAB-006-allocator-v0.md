# LAB-006 — Norevia Allocator v0 (cap [US$ redacted] Haiku 5.5)
Owner: Norevia Lab. See OVERNIGHT-2026-11-09.md.
Goal: turn what the tests supported into one reusable policy and measure it end-to-end.
1. Build `norevia/allocator/` (zero npm deps, model-agnostic, documented API): given a task, decide solo vs team (split when ≥ ~3 independent parts, per LAB-003 Q1), owners with part-only context, repair only while checks fail (retry with feedback, LAB-003 Q2), active stop when resolved (wound_resolution, LAB-004), verification gate before accepting, budget ceiling per task, no type memory (LAB-003 Q3 null). Every decision logged with its reason.
2. Evaluate, pre-registered, against SOLO, central orchestrator (uncapped), TEAM-TODAY-style coordination and always-split, on a mixed set: LAB-003 tasks of 1/3/8/15 packages + a LAB-004 micro-task pool. ≥ 3 repetitions. Primary: cost per accepted task; also acceptance, false success, latency.
Deliverable: code + README, report with the Allocator's position on the cost × acceptance × latency frontier and where it loses, ledger ≤ 30.
