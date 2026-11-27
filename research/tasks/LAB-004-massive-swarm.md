# LAB-004 — Massive swarm: 1,000 real LLM agents on micro-tasks + calibrated extension to 100,000

Owner: **Norevia Lab**. Requested by the user via Norevia (lead), 2026-11-09. Status: **open**.
**Budget: [US$ redacted] hard cap** (approved by the user), dedicated ledger, enforced in code before every call. Zero-cost work needs no approval.

## Why
The user wants scale "scandalously larger" than 1–3 agents, cheap and fast. Cost so far came from each agent re-reading a whole repository (20–100k tokens/call). Change the format: many agents, tiny verifiable tasks, tiny contexts (≈ 1–2k tokens/call), cheap model.

## Design
1. **Environment(s) of micro-tasks with automatic verification**, built to need collective coordination. At least one of:
   - a pool of ≥ 500 short functions with tests (agents claim, solve, verify; duplicate work and conflicts are possible);
   - a grid world (SwarmBench-style) with spatially scattered resources, local visibility and limited messages (foraging/transport).
   Each task must be checkable by code; report false success separately.
2. **Model: Claude Haiku 5.5 only** (user correction 2026-11-09: it is the only model enabled on the key). No Luna, no OpenCode. Keep cost down with tiny contexts, prompt caching and the Message Batches API where latency allows; measure cost from provider-reported usage. If the budget cannot reach N = 1,000 real agents, report the largest real N reached and extend by the calibrated simulation.
3. **Scale:** real LLM runs with N = 10, 30, 100, 300, 1,000 agents. Use high concurrency within rate limits, batching and prompt caching where available.
4. **Calibrated simulation:** fit per-agent error rate, error correlation, cost and latency from the real runs; simulate N up to 100,000 with the same coordination rules; validate the simulator against held-out real points before reporting any extrapolation.

## Arms
**Bio flags (from `norevia/research/FLAGS.md`, next batch):** `locust_phase_switch` (solitary ↔ gregarious by local density, hysteresis, flip on failure), `renal_compaction` (discard transient context, reabsorb functional items), `ecoli_run_tumble` (keep approach while improving, change when not), `informed_leaders` (weight agents holding verified evidence), `wound_resolution` (active shutdown of extra agents when resolved). Plus `stigmergy_board` and `quorum_stop` re-tested at scale (they only make sense with many agents).
**Artificial baselines:** central orchestrator assigning tasks; independent agents with no coordination; majority voting.
One flag at a time against the same baselines and budget per task.

## Measure (only what we do not already know)
- Coverage and accepted tasks per US$ and per minute, vs N (curves 10 → 1,000 real, → 100,000 simulated).
- Duplicate work, conflicts, idle agents, messages per accepted task.
- Phase transitions: does agreement/order jump at a critical N or density (locust/Vicsek prediction) or rise smoothly?
- Error correlation vs N and its effect on voting/quorum.
- Per flag: verdict vs best artificial baseline with intervals.

## Deliverables (acceptance)
PREREG before main runs; environment code + validator; results, summary JSON, curves; simulator with its validation against held-out real runs; short report with one verdict per flag, scale curves and limits; ledger ≤ [US$ redacted]; one line in INDICE.txt; update the status column of the tested flags in `norevia/research/FLAGS.md` (only the status cells, with the LAB-004 reference); reply to Norevia with a pointer (≤ 8 lines).
Constraints: no changes to other agents or production; keep `openbot-case/` internal; label exploratory analyses; micro-task results do not by themselves transfer to real code work — say so.
