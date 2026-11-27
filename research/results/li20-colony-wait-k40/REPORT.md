# LI20 report: waiting for the trace inside the Colony, gpt-6-luna (2026-11-18)

Preregistration: `tasks/LI20-COLONY-WAIT-PREREG.md`. Code: `observatory/batch2/colony/` (configs `li20-k24.json`, `li20-k40.json`; scoring `evaluate.mjs`; verdicts `analyze-li20.mjs`). Data: `results/li20-colony-wait-k24/`, `-k40/`. Analysis: `results/li20/analysis.json`. Review: `docs/reviews/LI20-REVIEW-2026-11-18.md`. Real Colony agents (Colony `d0c8830`) with gpt-6-luna, the first study of the line outside the Claude family, on the headless runtime fleet; 16 paired cases (8 at 24 modules, 8 at 40). Run on the ChatGPT subscription, outside the ledger.

| Arm | Solved (strict check) | Pass on fresh inputs | Capped / stalled | Traces | Median wall time (minus 3-min quiet tail) |
|---|---|---|---|---|---|
| `fieldwait` (each ant owns its files; a helper owner changes a shared function only once the trace arrives) | 16 | **16 of 16** | 0 / 0 | 391 (182 from the parent) | 11.1 min |
| `market` (Colony default: parent delegates to 4 ants who talk by `ant_send`) | 14 | 13 of 16 | 0 / 0 | 0 | 10.1 min |

Summed over the 16 pairs, the field used 1.27 times the total tokens, 1.24 times the cost and 1.36 times the tool calls of the market.

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI68 (primary) the waiting field leaves fewer checks failing on fresh inputs | inconclusive | 3 to 0, p = 0.25 |
| H-LI69 the waiting field finishes sooner | refuted (not significant) | 5 to 11, p = 0.21 |
| H-LI70 the waiting field uses fewer tokens (cached input included) | refuted | as scored (input + output only) 6 to 10, p = 0.45; **on total tokens as registered, 3 to 13, p = 0.021** (review) |

## What it shows

1. **The LI15 confounds are gone.** No run was capped or stalled, no message limit was reached, and both arms got the same instance for each seed.
2. **On efficiency the market wins.** H-LI70 was scored without cached input, which is about 95% of tokens; on total tokens as registered the market used fewer in 13 of 16 pairs (p = 0.021, Holm 0.043), with lower cost (13 of 16) and fewer tool calls (14 of 16). It also finished sooner in 11 of 16.
3. **The field's quality edge is narrow.** All three field wins are spec-violating helpers in the market arm. Two are callers that worked around a faulty helper, which the agents' own runner (`test/run.mjs`) could not report because, unlike the scorer, it does not check that a caller uses its helper's result; the third is a helper returning a constant on an instance whose test inputs could not expose it. Traces carried requirements to helper owners, so no field caller worked around a helper, which fits the LI16 mechanism. But the field is not a pure peer field: 47% of traces came from the parent, and whether ants waited before editing can only be judged from what they wrote.

## Fixes for LI29

The runner now also fails a caller that does not use its helper's result, so the agents see the check they are scored by; tokens are scored on the total, cached input included; Holm covers both secondary hypotheses (`tasks/LI29-COLONY-K80-PREREG.md`).

## Limits

One model family run through a subscription, with 4 teams sharing one rate limit; synthetic tasks, some with test inputs too weak to tell a right helper from a wrong one; only 3 pairs differ on quality; the arms differ in more than ownership (the parent writes traces); a Claude reviewer.
