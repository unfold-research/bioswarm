# LI10 report: the bio router against a manager agent, conversation and one agent at 40 and 80 modules (2026-11-17)

Preregistration: `tasks/LI10-SCALE-BIO-VS-MARKET-PREREG.md`. Data: `results/li10-scale-k40/` and `results/li10-scale-k80/` (`analysis.json` registered check, `strict/analysis.json` strict check as registered for scoring, `holdout.json`, raw waves, `state.json`, `run.log`). Verdicts: `observatory/batch2/rc/analyze-li10.mjs`. Independent review: `docs/reviews/LI10-REVIEW-2026-11-17.md`. Claude Haiku 5.5, Message Batches API, 0 failed requests, [US$ redacted]

16 codebases (8 of 40 modules, 8 of 80; up to 80 directed and 60 symmetric edges each), one Haiku member per module.

| Arm | Solved, registered check (k40 + k80) | Solved, **strict** (scoring) | Strict, without the 10 upper-case edges (see Review) | Hold-out of registered solves | Output tokens per solved case (strict) | First wave with zero failing (registered) |
|---|---|---|---|---|---|---|
| `routed` (bio) | 8 + 8 | **4 + 1 = 5** | 5 | 4 of 16 | 874,395 | 3 to 6 |
| `manager` (market: hierarchy) | 8 + 7 | **8 + 5 = 13** | 14 | 15 of 15 | 343,797 | 6 to 17 |
| `chat` (market: conversation) | 0 | 0 | 0 | n/a | no solves | never |
| `solo` (one agent, 64k output) | 8 + 6 | 14 | 14 | 14 of 14 | n/a | 1 to 6 |

## Verdicts (as registered, strict scoring)

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI28 bio router beats hierarchical orchestration | **refuted** | 5 against 13; router lower in 1 case, higher in 10 (p = 0.012) |
| H-LI29 bio router beats conversation | **supported** | 5 against 0; lower in 16 of 16 (p = 0.00003) |
| H-LI30 the task needs a team at 80 modules | **refuted** | one agent solved 6 of 8; both failures were replies cut at 64,000 output tokens |
| H-LI31 router cheaper per solved case | **refuted** | 874,395 against 343,797 |

## What it shows

1. **The router's speed was bought with workarounds.** Under the run's own check the router reached zero failures in waves 3 to 6 everywhere, the manager in waves 6 to 17. But on a directed edge the router wakes both sides, and the caller, who can read the helper's code, often codes around a wrong helper (`if (typeof r === 'number') ... else recompute`) instead of getting it fixed. The strict check and the hold-out (4 of 16 pass) expose it: 26 of the router's 32 strict misses. The manager names who must change, so the fix lands in the helper.
2. **Conversation without an arbiter still fails completely.** Chat left every symmetric edge failing in every case; at 80 modules 3,775 of 3,783 occasions on which both sides changed a failing edge left it failing (format swaps). Router and manager both cure this.
3. **The manager does not break at 80 modules yet,** but it slows down: 14 of 58 manager plans at 80 modules were cut at 32,000 tokens, and each act round costs it two waves.
4. **80 modules still fit one agent when its reply fits.** One agent with every specification solved every case whose reply parsed; the two it lost were output-limit truncations. The tasks here do not yet need a team.

## Review (independent, summary)

The reviewer re-derived every number and found the verdict logic faithful. Main objections, all accepted: (a) **the runner steers by the registered check and scores by the strict one**, so arms were never shown the defects they are scored on; this mostly hits the router, and a re-run with strict feedback is needed before calling the router worse at solving (planned for LI12); (b) a **generator blind spot**: when the caller's spec upper-cases the helper's result, a helper that already upper-cases is invisible to any feedback yet fails the strict check (10 edges; removing them moves the manager from 13 to 14 and changes no verdict); (c) the hold-out was run on registered solves (strict and hold-out together: router 3 of 16, manager 12 of 16); (d) solo's two losses are output truncation, which weakens H-LI30's reading; (e) truncated manager plans used waves; (f) `recheck-strict.mjs` and `holdout.mjs` used a default shape when no config is given (now warned; the published numbers used the config).

## What it means for the line

The router as built conflates two mechanisms on directed edges: recruitment (a message carries the requirement) and both-sides action (which invites workarounds). LI11 (`pheromone`: the requirement written on the failing check, only the helper owner woken) tests the corrected polarity; LI12 should give every arm the strict check as feedback.
