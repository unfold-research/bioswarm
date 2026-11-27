# LI29 report: waiting for the trace inside the Colony at 80 modules, gpt-6-luna (2026-11-19)

Preregistration: `tasks/LI29-COLONY-K80-PREREG.md`. Code: `observatory/batch2/colony/` (config `li29-k80.json`; scoring `evaluate.mjs`; verdicts `analyze-li29.mjs`). Data: `results/li29-colony-k80/`. Analysis: `results/li29/analysis.json`. Review: `docs/reviews/LI29-REVIEW-2026-11-19.md`. Same design as LI20 at twice the size: real Colony agents (Colony `d0c8830`) with gpt-6-luna on the headless runtime fleet, 8 paired cases at 80 modules, 200 ant messages per request and 60 per pair in both arms, with the three LI20 fixes in place (runner matches the scorer, total tokens, Holm on both secondaries). Run on the ChatGPT subscription, outside the ledger.

| Arm | Solved (strict check) | Pass on fresh inputs | Capped / stalled | Traces | Median wall time (with the 3-min quiet tail) |
|---|---|---|---|---|---|
| `fieldwait` (each ant owns its files; a helper owner changes a shared function only once the trace arrives) | **8** | 7 of 8 | 0 / 0 | 331 (62 from the parent) | 28.5 min |
| `market` (Colony default: parent delegates to 4 ants who talk by `ant_send`) | 7 | 7 of 8 | 0 / 1 (review; the script reports 0) | 0 | 22.2 min |

Summed over the 8 pairs, the field used 1.48 times the total tokens, 1.58 times the cost ([US$ redacted] against 6.47 at list price) and 1.57 times the tool calls of the market.

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI84 (primary) the waiting field leaves fewer checks failing on fresh inputs | inconclusive | 1 to 1, p = 1 |
| H-LI85 the waiting field finishes sooner | refuted (not significant) | 2 to 6, p = 0.29, Holm 0.29; one field win is a 39-min runtime hang in the market run (review) |
| H-LI86 the waiting field uses fewer tokens (cached input included) | refuted (not significant) | 1 to 7, p = 0.070, Holm 0.14 |

## What it shows

1. **At 80 modules both arms still solve almost everything.** The only unsolved run (market s29807) is a stall at the message cap: a helper was never defined, the parent could not forward the fix because of the message limit, escalated 12 times and stopped with one check failing. The 200-message cap was reached in 6 of 16 runs, in both arms, so the "equal budgets" decided an outcome. The stall detector only flags answers ending in a question, so it missed this one.
2. **The field costs more and is slower.** About 1.5 times the tokens and cost, never fewer tool calls (0 to 8, not preregistered), and about 6 minutes slower in the median. This repeats LI20.
3. **Neither hold-out loss is about coordination.** Field s29806 encodes empty tags as `-` and decodes them as `["-"]`; market s29807 has two local checks that fail only on triple letters. No test input covers either case.
4. **The field arm is still a manager plus a trace channel.** The parent wrote fewer traces than in LI20 (17% against 47%) and made no file edits, but it still sent 58 to 111 `ant_send` messages per run, about as many as the market parent.

## Limits

Eight pairs, of which only two differ on quality, each for an incidental reason; one model family through a shared subscription rate limit, 4 teams on 2 runtimes alongside sweep 4; synthetic tasks whose test inputs miss edge cases (empty arrays, triple letters); exports carry tool names but not arguments or error text, so waiting itself and the ownership guard cannot be checked; `antMessages` is still 0 in every record (the driver used predates the fix); a Claude reviewer. Fixes before the next Colony study: count stalls from escalations and from runs ending with failures, read `totals.antMessages`, and either raise the message cap or report it as an outcome.
