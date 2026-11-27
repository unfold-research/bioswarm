# LAB-003 — When does splitting pay, retry vs recruit, and type memory

Owner: **Norevia Lab**. Requested by the user via Norevia (lead), 2026-11-09. Status: **open**.
**Budget: [US$ redacted] hard cap** (approved by the user), dedicated ledger, cap enforced in code. Zero-cost work needs no approval.

## Rule for this run
Measure only what we do not already know. Latency from non-blocking design, or anything true by construction, is a functional check, not a result.

## Step 0 — fix acceptance first (no model spend, then a small calibration)
- Strengthen agent-visible probes per package so that a candidate passing the probe rarely fails hidden tests.
- Calibrate: report probe-pass → hidden-fail rate per task; select tasks where false success is low enough that acceptance is measurable, and keep false success as a separate outcome.
- Gate: do not start Q1–Q3 until calibrated false success is reported. If it cannot be brought down, report that as the main finding and stop.

## Q1 — When does splitting pay?
SOLO vs package-owner team (single owner per package, package-only context, repair only while probe fails) on tasks of 1, 3, 8 and ~15 packages (use the LAB-001 task builder). Output: cost per accepted task and acceptance vs package count, and the crossover point (with interval) where the team becomes cheaper per accepted task.

## Q2 — Retry or recruit?
Same extra budget (same number of extra calls): (a) the same agent re-reviews from probe feedback vs (b) new agents recruited by response threshold. Output: acceptance and cost difference with intervals. Answers whether LAB-001's THRESH gain is a swarm mechanism or just more attempts.

## Q3 — Does request-type memory help?
Same ordered sequence of ≥ 20 tasks, with vs without memory of how previous similar tasks were solved (bounded size). Output: first-pass failure rate and cost per accepted task, with intervals. Confirms or refutes LAB-002's exploratory 4/4.

## Design
One variable per comparison, 3 repetitions, same model (Haiku 5.5, low unless calibration says otherwise), pre-registered before the main runs. Primary outcome: cost per accepted task, reported with acceptance rate and false success.

## Deliverables (acceptance)
PREREG before main runs; calibration report (Step 0); results + short report with one answer per question, intervals and limits; ledger ≤ [US$ redacted]; one line in INDICE.txt; reply to Norevia with a pointer (≤ 8 lines). No changes to other agents or production; keep openbot-case internal.
