# LAB-001 — Benchmark: biological swarm mechanisms vs artificial agent structures

Owner: **Norevia Lab**. Requested by the user via Norevia (lead), 2026-11-08. Status: **open**.
**Budget: [US$ redacted] hard cap** for model calls (approved by the user). Use a dedicated ledger for this task and enforce the cap in code. Zero-cost work (tools, task building, analysis) needs no approval.

## Goal (user's words, summarised)
Pragmatic, results now: how do biological-swarm features and capabilities perform against today's artificial agent structures? Build the benchmark, the tests and the engineering tools needed, then run it and report.

## Question
At matched budget (same model, same per-run call/cost ceiling), does each bio-inspired mechanism reach a higher accepted-outcome rate, lower cost per accepted task, lower latency or fewer false successes than the best artificial structure — and on which task types?

## Arms (minimum set)
**Artificial structures (baselines):** SOLO (one agent + probe repairs); central orchestrator (planner → solvers → integrator); fixed pipeline (solver → critic → revision); voting ensemble (N independent, select by probe); debate (2 agents × 2 rounds + judge); TEAM-TODAY (coordinator briefs, specialists with full context, fixed review round).
**Bio-inspired mechanisms:** response-threshold recruitment with habituation; stigmergy (shared artifact + marks with evaporation, no messages); quorum with scouts, recruitment to best site and cross-inhibition; division of labour / single owner per package (TEAM-CTRL); clonal/elastic expansion (escalate on failure, contract on success); adaptive activation (individual first, team on demand — TEAM-GATE).
**Ablations (at least):** stigmergy with vs without evaporation; threshold fixed vs habituating; quorum q=1 vs q=2. Each mechanism must also run alone, not only bundled.

## Lessons to respect (from existing results)
1. Mechanisms need an informative agent-visible signal: use per-package `probe/` vs hidden `final/` splits (`openbot-case/bench/tasks/` already has 17 validated tasks). The Observatory smoke test failed because visible tests were saturated.
2. Teams only pay off when work exceeds one context: build larger tasks by merging repositories (e.g. 3 bx/cx repos → 8–15 packages) and validate them (buggy fails final, reference passes both).
3. Select tasks where SOLO is not at ceiling (failures or false successes in calibration), and report false success separately — verifier gaps dominated every result so far.
4. Pre-register before the main run (arms, tasks, primary outcome = cost per accepted task with acceptance rate, decision rule per mechanism vs best artificial arm, repetitions). Exploratory arms added later must be labelled.

## Engineering tools to build (reusable, in `norevia/observatory/` or `openbot-case/bench/`)
- **Common harness**: arms as plugins over one Run API; per-run budget enforcement (max calls and max US$, checked before every call); in-run ledger; critical-path latency; message/token accounting; resumable runner.
- **Task builder**: merge repos, generate probe/final splits, validate, write an index with package counts and calibration difficulty.
- **Analysis**: paired comparisons per task, Wilson CIs for acceptance, bootstrap CIs for cost per accepted, Pareto view (cost × acceptance × latency), per-mechanism verdict table.
- Keep everything model-agnostic (model/effort as parameters) so later runs can use Sonnet or other providers.

## Deliverables (acceptance)
1. `PREREG` file written before the main run.
2. Validated task set (≥ 25 tasks, including ≥ 5 multi-repo tasks that exceed one comfortable context).
3. Results files (runs, summary JSON) and a short report: verdict per bio mechanism vs best artificial structure, with intervals, cost, latency, false success and limits.
4. Ledger total ≤ [US$ redacted] One dated line in `INDICE.txt`.
5. Reply to Norevia with a pointer to the report (≤ 8 lines).

## Constraints
Do not change other OpenBot agents, permissions, routines or production. Keep `openbot-case/` internal. Answers to your earlier questions: the runner uses Claude Code headless via `CLAUDE_CODE_EXECPATH` (confirmed in previous runs); this task comes before OpenBot-Bench item 3 and absorbs most of it.
