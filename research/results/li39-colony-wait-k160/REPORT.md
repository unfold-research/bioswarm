# LI39 report: waiting for the trace in the Colony at 160 modules (2026-11-21)

Preregistration: `tasks/LI39-SECOND-FAMILY-COLONY-PREREG.md`. Code: spec `observatory/batch2/colony/li39-k160.json`, analysis `observatory/batch2/colony/analyze-li39.mjs`. Data: `results/li39-colony-wait-k160/`. Analysis: `results/li39/analysis.json`. Independent review (Claude Sonnet 5.5, CONVENTIONS rule 6): `docs/reviews/LI39-REVIEW-CLAUDE-2026-11-21.md`. Reproduction check (gpt-6-luna, re-ran the analysis from the raw data): `docs/reviews/LI39-REPRO-LUNA-2026-11-21.md`. Second model family for the latency cell (LI38): 12 paired seeds, 160 modules, gpt-6-luna in the Colony. In `wait`, owners receive field traces and edit only their files, while `market` uses peer messages; the arms differ in channel, ownership and runtime, not only in waiting, so read with LI38. Tokens are confounded with stalls: read H-LI122 beside solved and capped counts.

| Arm | Solved | Capped | Median minutes to first all-pass | Median run minutes | Median total tokens | Traces |
|---|---:|---:|---:|---:|---:|---:|
| `wait` | 10/12 | 0/12 | 26.7 | 33.6 | 1,565,601 | 1,329 |
| `market` | 5/12 | 3/12 | 181.0* | 35.0 | 1,254,677 | 0 |

*Unsolved runs score 181 minutes (cap + 1) for first all-pass.

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI119 (primary): wait reaches first all-pass sooner than market | inconclusive | 7 wins, 3 losses, 2 ties; p = 0.34375 |
| H-LI120: wait ends with fewer failing checks | inconclusive | 6 wins, 1 loss, 5 ties; Holm p = 0.375 |
| H-LI121: wait leaves fewer fresh-input failures | inconclusive | 6 wins, 2 losses, 4 ties; Holm p = 0.375 |
| H-LI122: wait uses fewer total tokens | inconclusive | 3 wins, 9 losses, 0 ties; Holm p = 0.375 |

## What it shows

1. **The primary result is not significant.** Re-deriving first empty-failure timeline times for each seed gives wait 7 wins, market 3, and 2 both-unsolved ties (39402, 39410); exact two-sided sign-test p = 0.34375. The reported medians use cap + 1 for runs without an all-pass. **Five of the seven `wait` wins are seeds where `market` never reached an all-pass** (39400, 39405, 39407, 39409, 39411). On the five seeds where both arms reached it (39401, 39403, 39404, 39406, 39408), `wait` won 2 and lost 3, with paired differences of +9.3, −7.3, +0.6, +12.0 and −0.1 minutes (positive: `wait` slower); only the last (6 seconds) is under one 15-second poll of the timeline. So the data are consistent with `wait` stalling less, not with it being faster once both finish. This is a post hoc reading (Coordination Research, 2026-11-21), not a registered test.
2. **Wait solved more runs, but did not win the registered secondary tests.** Raw records show 10/12 solved for wait and 5/12 for market; market hit the 180-minute cap in 3 runs. Median final failures were 0 versus 25. These descriptive differences do not alter the registered verdicts.
3. **Tokens were not lower for wait.** Median total tokens were 1,565,601 versus 1,254,677; H-LI122 favoured market in 9 paired seeds and wait in 3. With more market stalls and fewer solved runs, this is not evidence that market is intrinsically cheaper.

## Limits

The gpt-6-luna reproduction check matched: running `node observatory/batch2/colony/analyze-li39.mjs` and comparing output with `results/li39/analysis.json` returned identical output; its independent timeline calculation also matched the primary pairs and p-value. It flagged no discrepancy, but noted it reproduces recorded data, not the experiment, and does not independently validate timestamp ordering or timeline completeness. The review found no equal finite primary times among non-tied pairs; exact ties and both-never-pass pairs are dropped/count as ties under the registered rule. Twelve synthetic pairs and one non-Claude model limit precision; runtime load and provider latency remain relevant. The review's reproduction is not a fresh run. Most importantly, channel, ownership and asynchronous tool runtime differ between arms, so LI39 tests a combined Colony policy, not waiting alone; interpret only alongside LI38. Tokens are confounded with stalls and must be read with solved/capped counts. Holdout failures also show quality distinctions missed by solved status: wait has 255 on seed 39404 and 1 on 39409, while its two other unsolved runs have 16 and 90; market's unsolved runs have substantial failures. No causal mechanism or general product default follows from these data alone.

**Answers to the independent Claude review.** It re-derived the 12 seed pairs and the sign tests and found all four verdicts match `results/li39/analysis.json` (no verdict changes). Its points, answered: (1) `antMessages` is 1,932 in both arms by coincidence, not a summing error. The bench restored the raw data and checked: per-run records and export totals agree in each arm, and the `wait` total is 1,732 over 11 seeds plus 200 for seed 39402. The field counts every message between ants of a team, including those to and from the parent. **`wait` was isolated from peer messaging:** classifying every message in the 24 exports (`ants.messages`, sender and recipient against the team's main task) gives, for `wait`, 0 ant-to-ant messages, 1,118 parent-to-ant and 814 ant-to-parent; for `market`, 173 ant-to-ant, 1,033 parent-to-ant and 726 ant-to-parent. Every `wait` run records `antLimits.peer: false` and `field: wait`. Per seed the two arms' totals never match; only the sums do. The arms therefore ran the registered channels: in `wait` the parent relays and the field carries traces; in `market` ants also message each other (Coordination Research, 2026-11-21, on benchhost). (2) The `fleetAtStart` log records 0 other runs even when the paired run started in the same second on the same runtime, so it does not show shared fleet conditions; this is an instrument limitation of the log, not of the pairing (both arms of each seed started together, per `run.log`). (3) "Never reached" mixes capped runs and runs that went quiet unsolved; both score cap+1 as registered. (4) The review's header names its model as gpt-6-luna because the shared review prompt template printed the bench's default model; the review was made by `claude-sonnet-5-5` (bench log and ledger entry `li39-k160-review-rerun-2026-11-21`). The template now names the actual reviewer.

## Deviation

The first independent Claude review was lost to a bench bug: the Claude review and the gpt-6-luna reproduction check were written to the same file, and the reproduction check overwrote the review (fixed in PR #137: separate `REVIEW-CLAUDE` and `REPRO-LUNA` files). With the Research Leader's approval, only the Claude review was rerun once, with the same prompt and context and `max_tokens` 16,000. Review spend, within the owner's [US$ redacted] cap: [US$ redacted] for an attempt that returned no text (max_tokens too low), [US$ redacted] for the overwritten review, and [US$ redacted] for the rerun, a total of [US$ redacted] The run data, the analysis and the verdicts are unchanged.

## Economy

Computed by `bench/economy.mjs` from the raw data (colony study, subscription). Colony runs on the subscription, outside the ledger; thinking is not split out.

| Arm | Requests | Input | Output | Thinking | Cost | Solved | Cost/solved | >[redacted]k (extra) | Truncated (wasted) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| market | 7,528 | 13,982,138 | 1,433,523 | 0 | [US$ redacted] | 5 | [US$ redacted] | 0 ([US$ redacted]) | 0 ([US$ redacted]) |
| wait | 12,492 | 18,072,296 | 1,891,254 | 0 | [US$ redacted] | 10 | [US$ redacted] | 0 ([US$ redacted]) | 0 ([US$ redacted]) |
| **total** | 20,020 | 32,054,434 | 3,324,777 | 0 | [US$ redacted] | | | 0 | 0 ([US$ redacted]) |

Thinking is not separated. Reserved -, actual [US$ redacted]
