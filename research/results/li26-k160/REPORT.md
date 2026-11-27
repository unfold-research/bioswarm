# LI26 report: 160 modules, where one manager must hold everything (2026-11-18)

Preregistration: `tasks/LI26-SCALE-160-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI26.json` (sweep 3, run in parallel with the end of sweep 2, LI20 and LI24). Data: `results/li26-k160/`. Verdicts: `results/li26/verdicts.json` (`verdict.mjs`). Review: `docs/reviews/LI26-REVIEW-2026-11-18.md`. Haiku 5.5, 8 cases at 160 modules, 6 act rounds for each arm (the manager's plan waves on top), [US$ redacted]

| Arm | Solved | Pass on fresh inputs | Waves to solve (mean, solved) | Act rounds to solve | Final failing checks (sum) | Output tokens per case |
|---|---|---|---|---|---|---|
| `stigwait` | 8 | **8 of 8** | 3.63 | 3.63 | 0 | 457k |
| `manager` | 4 | 3 of 8 | 10.25 | 5.00 | 5 (all symmetric) | 552k |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI74 (primary) at 160 modules with equal act rounds, waiting ends below the manager | inconclusive | 4 to 0, p = 0.125 |
| H-LI75 waiting leaves fewer checks failing on fresh inputs | inconclusive | 5 to 0, Holm p = 0.0625 |

## What it shows

1. **Act rounds were equal and the direction favours waiting, but the gap is explained by a symmetric tie-break, not by traces.** All 5 checks the manager left failing are symmetric encoder/decoder pairs whose both sides it rewrote in almost every act wave: 841 both-sides changes, 816 still failing (97%); stigwait 208 and 3. stigwait's harness sends each failing symmetric check to one side by a hash tie-break, and traces exist only on directed checks. So LI26 compares "tie-break plus trace" with "a manager without a tie-break" and does not isolate waiting for the trace. With 4 discordant cases the primary could not reach p < 0.05 (it needed 6 of 8).
2. **Tokens: about 1.2 times per case, not 2.4.** `tokensPerSolved` in `verdicts.json` (1,103,114 against 457,264) divides by cases solved, which counts the manager's unsolved cases twice. Per case the manager used 1.21 times the output tokens (1.34 without the shared round 0) and 1.26 times the cost; plan output is 16% of its tokens. The manager was still converging at the cap (mean 1.5, then 0.63 failing checks), so a few more rounds would probably finish it.
3. **Waiting for the trace again holds on fresh inputs** (8 of 8); the manager adds one fresh-input failure on a directed check in a case it solved in the run.

## Follow-up

LI27 (`tasks/LI27-TRACE-OR-TIEBREAK-PREREG.md`, sweep 4) adds `stigwait_both`, the trace rule without the one-side tie-break, at 80 and 160 modules with 12 cases each and tokens per case, to separate the trace from the tie-break.

## Limits

One model family (Haiku 5.5), synthetic string tasks, 8 cases, one size, one manager prompt design (a single call over about 115,000 input tokens, whose output varied from 3,441 to 64,000 tokens), a Claude reviewer. Registered after sweep 2's raw solved counts were seen (disclosed).
