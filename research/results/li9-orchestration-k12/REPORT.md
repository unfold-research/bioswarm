# LI9 report: the bio-inspired router against a manager agent at equal N (2026-11-17)

Preregistration: `tasks/LI9-ORCHESTRATION-PREREG.md`. Data: `results/li9-orchestration-k5/` and `results/li9-orchestration-k12/` (`analysis.json`, `strict/analysis.json`, `holdout.json`, raw waves, `state.json`, `run.log`). Verdicts: `observatory/batch2/rc/analyze-li9.mjs`. Claude Haiku 5.5, Message Batches API, 0 failed requests, [US$ redacted] for both sizes.

20 codebases (10 of 5 modules, 10 of 12), one Haiku member per module, three arms on the same cases and the same shared round 0. Scoring is the strict check (a directed helper must itself be correct).

| Arm | Solved k=5 | Solved k=12 | Failing checks left (k=12, strict) | Output tokens per case (pooled) | Hold-out of solved cases |
|---|---|---|---|---|---|
| `routed` (bio: geometry router + messages) | 10 | 7 (10 under the registered check) | 3 directed | 39,827 | 18 of 20 (strict on hold-out inputs: 15 of 20) |
| `manager` (a lead agent assigns work with instructions) | 10 | 9 (10 registered) | 1 directed | 28,549 | 20 of 20 (strict: 20 of 20) |
| `chat` (leaderless conversation) | 0 | 0 | 100 symmetric, 1 directed | 77,337 | n/a |

Failing checks after each wave (registered check; waves are shared, so the manager acts only every second wave):

| Wave | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| k=12 `routed` | 222 | 51 | 28 | 5 | 1 | 2 | 0 |
| k=12 `manager` | 222 | 222 (planning) | 45 | 45 (planning) | 8 | 8 (planning) | 0 |
| k=12 `chat` | 222 | 141 | 111 | 102 | 100 | 100 | 100 |

## Verdicts (as registered)

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI25 the router solves at least 4 more cases than the manager | **refuted** | 17 against 19; per case the manager ended lower in 2, the router in 0 |
| H-LI26 the router uses fewer output tokens | **refuted** | 39,827 against 28,549 per case |
| H-LI27 a manager beats leaderless conversation | **supported** | 19 against 0; 20 of 20 cases lower (p = 0.002 per size) |

## What it shows

1. **At 5 and 12 modules a manager is as good as the router and cheaper.** One lead agent that sees every specification and every failing check, and tells each member what to change, solved 19 of 20 under the strict check, the router 17. The manager carries the helper requirements directly to the helper owner (it reads them in the caller's specification) and picks one format per symmetric edge, so it does both of the router's jobs by central knowledge.
2. **Two of the router's three strict losses are caller workarounds** (k12s9706, k12s9708): on a directed edge the router lets both sides act, and the caller adapted to a wrong helper. The third, and the manager's only strict miss (k12s9702), is a generator blind spot (a helper that already upper-cases under a caller that upper-cases); without it the manager has 20 of 20 and the router 18. The hold-out's two router failures are other defects, not these workarounds (corrected after the retrospective review, `docs/reviews/LI9-REVIEW-2026-11-17.md`).
3. **The router is faster per wave.** It used every wave; the manager needs a planning wave before each act wave. At k=12 the router was at 5 failing checks after wave 3, the manager at 45. Under the registered check the router leads per wave until the end; under the strict check it ends wave 6 with 3 failing checks against the manager's 1.
4. **Leaderless conversation fails again.** `chat` solved nothing: at k=12, 600 of 600 occasions on which both sides changed a failing symmetric edge left it failing (format swaps), as in LI7 and LI8. An arbiter mostly removes this: under the manager both sides still changed a failing edge 90 times at k=12, 48 of them still failing after.

## What it does not show

The manager's advantage is information: it holds the whole specification, like LI7's single agent, and at 12 modules that fits in one call (manager prompts up to 11,685 input tokens). Whether a central manager still works when the codebase no longer fits its attention is the question of LI10 (40 and 80 modules, registered before this result was known: `tasks/LI10-SCALE-BIO-VS-MARKET-PREREG.md`).

## Limits

One model (Haiku 5.5), 20 cases, synthetic executed code with planted coupling, 6 act rounds. The manager writes at most 60 words per member; a richer manager prompt could do better, a router with a stop-signal for caller workarounds could too. Edges within a case are not independent.
