# LI11 report: two natural mechanisms in isolation against a manager agent at 40 and 80 modules (2026-11-17)

Preregistration: `tasks/LI11-MECHANISMS-PREREG.md`. Data: `results/li11-mechanisms-k40/` and `results/li11-mechanisms-k80/`. Verdicts: `observatory/batch2/rc/analyze-li11.mjs`. Independent review: `docs/reviews/LI11-REVIEW-2026-11-17.md`. Claude Haiku 5.5, Message Batches API, 0 failed requests, [US$ redacted]

16 codebases (8 of 40 modules, 8 of 80), one Haiku member per module, four arms on the same cases and the same round 0.

| Arm | Registered | **Strict** (scoring) | Strict, scored on hold-out inputs | Strict, without upper-case blind-spot edges | Output tokens per strict solve |
|---|---|---|---|---|---|
| `pheromone` (requirement trace on the failing check, sent only to the helper owner; no messages) | 16 | **15** | 15 | 16 | 141,730 |
| `manager` (market: lead agent assigns work) | 14 | 11 | 10 | 13 | 415,368 |
| `routed` (LI7 to LI10 router, messages) | 16 | 6 | 1 | 7 | 744,512 |
| `threshold` (each side of a symmetric edge acts with probability 1/2; no messages) | 1 | 1 | 0 | 1 | 6,158,408 |

## Verdicts (as registered)

| Hypothesis | Verdict | Numbers and caveat |
|---|---|---|
| H-LI32 noise breaks symmetry | **supported**, weak | 36 of 716 symmetric edges left failing (5%). But `threshold` is worse than the hash arbiter on symmetric edges (routed only 36, threshold only 0), and 31 of the 36 had passed and were broken again (churn). Noise beats simultaneous action (LI7 to LI10: 90 to 100% left), not an arbiter |
| H-LI33 information in the field replaces messages | **supported as registered, not as worded** | strict: pheromone only 17, routed only 0 (p = 0.00002); strict directed failures 1 against 18. On the registered check the two are identical on directed edges (0 discordant). The trace is written by the harness and is word for word the requirement the strict check scores |
| H-LI34 pheromone beats the manager | **inconclusive** | lower at the end in 4 cases, higher in 0 (p = 0.125); 13 manager plans truncated at 80 modules |
| H-LI35 pheromone cheapest per solved case | **supported** | partly mechanical: the caller is never woken, no chat schema, and the trace makes solves early |

## What it shows

1. **Delivering the requirement to whoever can act on it, and to nobody else, removes the router's failure.** `pheromone` left 1 strict directed failure in 16 codebases (the blind spot), the router 18. It never woke a caller (0 of 853 directed requests), so no caller could work around a helper. This is **polarity**: the signal goes to the source, not to the one who suffers it.
2. **But the trace was an oracle.** The harness wrote the caller's requirement onto the check; no agent had to discover or carry it, and it arrived at wave 1, a wave before any message could (round 0 is shared and silent). LI11 therefore shows the value of *a correct trace delivered with polarity*, not that agents leave such traces themselves. That is what stigmergy would need, and LI12 tests it.
3. **The manager stays the strongest non-oracle arm** (11 strict, 13 without the blind spot), slowed by plan waves and truncated plans at 80 modules.
4. **Chance alone is not enough.** Random response breaks symmetric ties better than simultaneous action, but churns where an arbiter does not, and without messages or a trace its directed edges fail (29 caller workarounds).

## Limits

As LI10: feedback during the run is the registered (beatable) check, scoring is strict; hold-out file published on registered solves (strict hold-out numbers above, from the review); the upper-case generator blind spot is still present; `strict/state.json` is not committed (re-create it with `recheck-strict.mjs <dir> <config>`). One model, 16 cases.
