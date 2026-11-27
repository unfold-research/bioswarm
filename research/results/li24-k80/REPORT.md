# LI24 report: harder tasks with equal act rounds, control for LI19 (2026-11-18)

Preregistration: `tasks/LI24-ACT-ROUNDS-CONTROL-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI24.json` (sweep 3, run in parallel with the end of sweep 2 and LI20). Data: `results/li24-k80/`, `-k120/`. Verdicts: `results/li24/verdicts.json` (`verdict.mjs`). Review: `docs/reviews/LI24-REVIEW-2026-11-18.md`. Haiku 5.5, 16 cases (8 at 80 modules, 8 at 120), the same harder tasks as LI19, 6 act rounds for every arm with the manager's plan waves on top, [US$ redacted] (2.35 at k80, 3.00 at k120).

| Arm | Solved | Pass on fresh inputs | Waves to solve (mean, solved cases) | Final failing checks (k80 / k120) | Output tokens |
|---|---|---|---|---|---|
| `stigwait` (helper owner acts only once the caller's trace is on the check) | 16 | **16 of 16** | 3.63 | 0 / 0 | 6.97M |
| `manager` (market, plan waves extra) | 7 | 7 of 16 | 11.14 | 33 / 328 | 8.84M |

Output tokens include the shared round 0 in both arms.

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI71 (primary) waiting ends with fewer failing checks than the manager, equal act rounds | **supported** as registered; at k80 alone, where the control held, inconclusive (review) | 9 to 0, p = 0.0039; k80 only 5 to 0, p = 0.0625 |
| H-LI72 waiting solves in fewer waves than the manager | **supported** (counts plan waves, so partly by design) | 16 to 0, Holm p = 6.1e-5 |
| H-LI73 waiting uses fewer tokens than the manager | **supported** | 14 to 2, Holm p = 0.0042; per case 436k against 552k output tokens (1.27x) |

## What it shows

1. **The control held only at 80 modules.** There every manager case got exactly 6 act rounds; it solved 3 of 8 and the primary is 5 to 0, p = 0.0625, inconclusive. At 120 modules the manager was starved of act rounds again: 23 of 59 plans stopped at the 48,000-token limit, mostly on thinking (92% of plan output tokens, because `effort: null` leaves adaptive thinking on), truncated plans returned no assignments, and the runner stops at wave 13, a wave limit the preregistration says does not exist. All 4 unsolved k120 manager cases were short of act rounds; k120s24207 never acted (13 plans, all truncated, 319 failing checks). The registered 9 to 0 depends on these cases.
2. **What the manager still fails is symmetric collisions.** Apart from 24207, every leftover manager failure is a symmetric check. In every act wave where such a check failed, the owners of both sides changed their module; over the whole run that happened 2,007 times in the manager arm and 93% still failed afterwards, against 599 times and 2% for stigwait. This is the LI26 pattern and carries the same tie-break confound, so it is not evidence about trace-waiting. Part of it may be module churn rather than both sides being assigned (the review found a plan that assigned only the decoder side).
3. **Waiting for the trace again solves everything and holds on fresh inputs** (16 of 16, by wave 3 to 5). No case solved in the run by either arm fails on fresh inputs.
4. **The runner died once and was resumed cleanly** (`run-part1.log`). The resume reused the batches already submitted for k80 wave 3 and k120 wave 2 and fetched their results about 18.5 h later; nothing was submitted twice and no wave was skipped.

## Limits

One model family (Haiku 5.5), synthetic string-function tasks, 8 cases per size, one prompt design for the manager, a Claude reviewer. The preregistration was written after sweep 2's raw counts were seen (disclosed). `tokensPerSolved` in `verdicts.json` (2.9x) counts unsolved cases twice against the manager; the per-case ratio is 1.27x. The config hash matches the sources at the preregistration commit, not the current tree (later LI27 arms, unused here). A clean control needs low or no thinking for the manager (or a larger `managerMax`), partial plans kept, manager cases ended on act rounds rather than wave 13, and a pairing with LI27's tie-break arms.
