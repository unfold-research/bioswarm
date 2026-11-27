# LI31 report: emergent symmetry breaking inside the Colony, gpt-6-luna (2026-11-19)

Preregistration: `tasks/LI31-COLONY-CLAIM-PREREG.md`. Code: `observatory/batch2/colony/` (config `li31-k40.json`; scoring `evaluate.mjs`; verdicts `analyze-li31.mjs`). Data: `results/li31-colony-claim-k40/`. Analysis: `results/li31/analysis.json`. Reviews: `docs/reviews/LI31-REVIEW-2026-11-19.md` (Claude Opus 5.5) and `docs/reviews/LI31-REVIEW-LUNA-2026-11-19.md` (gpt-6-luna, outside the Claude family, so method rule 6 is met for this study). Real Colony agents (Colony `ca8e3df`, with lab telemetry) with gpt-6-luna on the headless runtime fleet, 8 cases per arm at 40 modules heavy in format pairs (40 symmetric and 10 directed edges), a parent and 4 ants of 10 modules each, 200 ant messages per request and 60 per pair in every arm. Run on the ChatGPT subscription, outside the ledger.

**Rerun, disclosed.** Market s31401 died on a provider error at its first turn ("Unable to verify model access", one call, 3.4 min, nothing written). The LI31 preregistration has no rule for this (LI32's now allows exactly this case); it was rerun about 2 hours later on another runtime and under different fleet load; the original record is kept in `provider-error/`. Its wall time is not strictly comparable.

| Arm | Solved (strict check) | Pass on fresh inputs | Capped / stalled | Simultaneous changes (primary) | Regressions | Traces | Median wall time (with the 3-min quiet tail) | Total tokens |
|---|---|---|---|---|---|---|---|---|
| `claim` (field, wait for the trace; on a failing format pair announce "I adapt, keep yours" and adapt; ants cannot message each other) | 8 | **8 of 8** | 0 / 0 | **142** | **38** | 343 | 20.9 min | 383M |
| `nopeer` (field, wait for the trace, no rule for format pairs; ants cannot message each other) | 8 | 7 of 8 | 1 / 0 | 194 | 45 | 341 | 17.1 min | 350M |
| `market` (Colony default team; ants talk by `ant_send`) | 8 | 4 of 8 | 0 / 0 | 189 | 63 | 0 | 15.0 min | 193M |

The capped run is nopeer s31402 (60.2 min): one parent turn ran 39 minutes with 128k output tokens. The message cap never bound (lowest remaining budget 30 of 200).

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI90 (primary) announcing who adapts lowers simultaneous changes of both sides of a failing format pair (claim against nopeer) | inconclusive | 6 to 2, p = 0.29 |
| H-LI91 announcing who adapts leaves fewer checks failing on fresh inputs (claim against nopeer) | inconclusive | 1 to 0, p = 1, Holm 1 |
| H-LI92 announcing who adapts finishes sooner (claim against nopeer) | inconclusive | 5 to 3, p = 0.73, Holm 1 |
| H-LI93 the announcing field leaves fewer checks failing on fresh inputs than the default team (claim against market) | inconclusive | 4 to 0, p = 0.125, Holm 0.375 |

`node observatory/batch2/colony/analyze-li31.mjs` reproduces `results/li31/analysis.json` (both reviews).

## What it shows

1. **The primary metric mostly counted first implementations.** An event was counted when both module files of a failing format pair changed between 15-second snapshots. In 313 of 525 events one side was still the initial stub, so it was the first write of a module, not two sides reacting to each other; and each file holds several functions, so a change to the pair cannot be told from a change to anything else in the file (both reviews). Exploratory, not preregistered: with first writes removed, claim had fewer events than nopeer in 7 of 8 seeds (p = 0.07). The strict count (pairs across ants, both owners edited, no other failing check) is 2, 7 and 11 events, too few to read.
2. **The mechanism fired in only 5 of 8 claim teams.** The 62 "Eu me adapto…" announcements came from seeds 31400 to 31403 and 31407 (19, 1, 11, 15, 16); seeds 31404 to 31406 never announced. Announcements were often posted in bursts before most formats had changed. Whether the other side kept its format cannot be seen at function level: in 45 of 50 announcements matched to a pair the owner edited the announced file within 5 minutes, possibly in another function. Every announced pair passes at the end.
3. **The parent arbitrated anyway.** Although told not to decide who changes in format pairs, the parent sent 127 (claim) and 93 (nopeer) messages naming an encoder or decoder with an order to fix it, mostly pushing the decoder side to adapt. That is a tie-break from above in both treatment arms, so neither ran without an arbiter; it confounds H-LI90 and H-LI92.
4. **`peer: false` held.** No ant-to-ant message got through in claim or nopeer; 12 and 37 attempts were refused.
5. **Market's fresh-input losses are partly weak tests, partly unresolved format sniffing.** Each failing market team fails exactly one check: s31403 and s31406 encode an empty `tags` array as `-` and decode it as `["-"]` (no test input has an empty array); s31404's decoder sniffs between two field orders and misreads a single-digit field, a leftover of the format pair the tests did not catch; s31402 is a directed check (a helper's value off by 4). Format-sniffing decoders in the final code (rough count): claim 2, nopeer 6, market 5. So claim's 8 against market's 4 is consistent with better integration but does not isolate the announcement.
6. **Claim used about twice the tokens of market, mostly cached.** About 97% of all tokens are cached input. Uncached input is 11.7M, 11.1M and 6.8M and output 0.55M, 0.65M and 0.38M, so claim is about 1.7 times market on uncached input and 1.45 times on output. Market was also the fastest in the median.

## What changed for LI32

LI32 (`tasks/LI32-COLONY-CLAIM-REPLICATION-PREREG.md`, Colony `ffa0d13`) replicates the design with the fixes the reviews asked for: a function-level primary measure (bilateral adaptation of cross-ant format pairs: encoder and decoder edits within 60 seconds while the pair fails, first writes excluded), from telemetry that now records the functions each edit touched and the replaced text; a `claim` parent told by the Colony not to say which side changes; the announcement as a required step before rewriting one's side; and 12 cases per arm. H-LI95 repeats H-LI93 on fresh seeds.

## Product findings

What the telemetry says about Colony itself (one-at-a-time message delivery, a parent that mostly re-runs an unchanged test suite, claim notices delivered as work orders, a parent context always near full, a runaway parent turn, unhelpful field errors) is in `results/li31-colony-claim-k40/COLONY-TELEMETRY.md`, with proposed changes. It is reported, not tested.

## Limits

Eight cases per arm; solved is 8 of 8 everywhere, so only the hold-out and dynamics metrics can separate arms; one model family on a shared subscription; synthetic tasks whose test inputs miss edge cases (empty arrays); a file-level, 15-second instrument that cannot see which function changed; the parent's directives gave both treatment arms a tie-break; one market run rerun under different load.
