# AU-R2 report: where thinking goes in the batch instrument (2026-11-22)

**Exploratory reanalysis, not a registered test.** Programme: `programs/autonomy.md` (agenda item 2; it tests AU-E2 and sizes the AU1 pilot, item 5). Code: `observatory/autonomy/au-r2/thinking.mjs`. Output: `results/au-r2/analysis.json`. Data: the raw batch files of LI24, LI26, LI27, LI33, LI34, LI35, LI36 and LI38 (`results/li24-k80/`, `li24-k120`, `li26-k160`, `li27-k80`, `li27-k160`, `li33-k80`, `li33-k160`, `li34-k80`, `li34-k120`, `li35-k40`, `li36-k120`, `li38-k160`), restored from R2. No model calls, no spend. LI37 was skipped: it is a Colony study with no batch wave files and no thinking split.

## Method

Every reply in the `wave-*.results.jsonl` files (96,052 replies, none failed or missing) was read for output tokens, thinking tokens (`usage.output_tokens_details.thinking_tokens`) and stop reason, and its custom id was parsed for role: **start** (the shared first wave, one per module), **member** (one module owner in an act wave) or **plan** (the manager's plan). Model, effort and output limit come from the matching request rows.

Outcomes come from each study's `state.json`:

- **Member and start replies:** the reply's module passes if no check naming that module (local, directed or symmetric) is failing after the reply's wave.
- **Plans:** a plan "improved" if the failing count after the act wave that follows it is below the count before the plan.
- **Cases:** solved at the end of the run. Fresh-input pass is solved with zero failing checks in `holdout.json` (LI27-k80 has no holdout file).

Cost is recomputed from each reply's usage at its own model's price (`observatory/lab007-economy/pricing.mjs`).

AU-E2 is read three ways:

1. **Reply level, stratified.** Within each cell of study size × arm × role × wave, the difference in mean thinking share between failing and passing replies. Cells are combined with weights n_f·n_p/(n_f+n_p), and a sign test is run over cells. Stratifying keeps later, harder waves from passing as an effect of thinking. Truncated replies are excluded here and reported separately.
2. **Case level:** within each arm, unsolved against solved cases.
3. **Arm level:** solved share against thinking share across arms.

The AU1 section uses `stigwait` cases at default effort on Haiku 5.5. Minimal detectable differences (MDD) are t-based, two-sided, power 0.8, 6 cases per arm. Each is given at α = 0.05 and at α = 0.025, which is Bonferroni or Holm's worst case for AU1's two comparisons with default. Solved share uses exact Fisher power.

## Thinking per reply by role

Thinking share of output tokens per arm and role, with module pass rate after the wave in brackets. All Haiku 5.5 at default effort, except LI35, which is Sonnet 5.5 at low effort (see below).

| Size | Start share | `stigwait` member share (pass rate) | `manager` member share (pass rate) | Plan share, mean thinking tokens | Other member arms |
|---|---:|---:|---:|---:|---|
| li24-k80 | 0.74 | 0.60 (0.35) | 0.64 (0.17) | 0.81, 11,682 | |
| li24-k120 | 0.74 | 0.60 (0.38) | 0.67 (0.31) | 0.92, 25,100 | |
| li26-k160 | 0.74 | 0.61 (0.44) | 0.67 (0.32) | 0.79, 12,240 | |
| li27-k80 | 0.74 | 0.59 (0.36) | 0.69 (0.12) | 0.80, 18,477 | `stigwait_both` 0.61 (0.03) |
| li27-k160 | 0.75 | 0.61 (0.47) | 0.68 (0.36) | 0.79, 10,562 | `stigwait_both` 0.62 (0.08) |
| li33-k80 | 0.74 | 0.60 (0.35) | 0.65 (0.17) | 0.80, 12,866 | `polarity` 0.82 (0.15); `oracle` 0.67 (0.93) |
| li33-k160 | 0.74 | 0.61 (0.45) | 0.68 (0.34) | 0.81, 13,351 | `polarity` 0.81 (0.26); `oracle` 0.66 (0.97) |
| li34-k80 | 0.74 | 0.59 (0.37) | 0.65 (0.17) | 0.80, 13,082 | |
| li34-k120 | 0.74 | 0.60 (0.37) | 0.66 (0.25) | 0.82, 15,109 | |
| li35-k40 | 0.05 | 0.11 (0.46) | 0.24 (0.25) | 0.14, 240 | |
| li36-k120 | 0.74 | 0.59 (0.37) | 0.66 (0.28) | 0.83, 15,172 | |
| li38-k160 | 0.73 | 0.59 (0.40) | 0.67 (0.35) | 0.82, 15,349 | |

At default effort the shares are fixed by role and barely move with size:

- start replies about 0.74 (about 1,100 thinking tokens each);
- `stigwait` members 0.59 to 0.61;
- manager members 0.64 to 0.69;
- plans 0.79 to 0.92, at 10,000 to 25,000 thinking tokens each.

In an 80-module `stigwait` case, thinking is about 237,000 of 368,000 output tokens: about 89,000 in the start wave and 148,000 in member replies.

## AU-E2: does thinking flag trouble?

| Reading | Failing | Passing | Result |
|---|---:|---:|---|
| Member replies, module outcome (stratified, 138 cells) | 54,703 | 23,445 | failing replies think more in 125 of 138 cells (sign test p < 0.0001); weighted difference +0.065 share, +395 thinking tokens |
| Same, pooled | | | share 0.67 against 0.61; Mann-Whitney AUC 0.59 |
| Same, per study | | | LI24 26/28 cells, LI26 11/12, LI27 16/18, LI33 38/42, LI34 17/19, LI36 8/9, LI38 9/10; difference +0.054 to +0.075 share |
| Start replies, module outcome (6 cells) | 14,436 | 279 | 6 of 6 cells; +0.44 share (few modules pass after the start wave) |
| Member replies, case outcome (stratified, 55 cells) | 29,338 | 48,810 | 41 of 55 cells (p = 0.0004), but only +0.015 share, +48 tokens; LI33 and LI34 about 0 |
| Plans, improved after the act wave | 5 | 634 | untestable: 5 plans did not improve |
| Cases within an arm, unsolved against solved | | | unsolved thought more in 6 of 11 comparisons: no pattern |
| Arms (30 arm × size cells at default effort) | | | correlation of solved share with thinking share −0.55; `polarity` 0.81 to 0.82 share with 0 of 28 solved |
| LI35 members (Sonnet, low effort, 9 cells) | 1,212 | 641 | 8 of 9 cells, +0.020 share, +19 tokens |

**Exploratory reading.** AU-E2 holds at the reply level. Within the same wave, arm and study, a member whose module still fails after its reply spent about 6.5 points more of its output on thinking, about 400 more thinking tokens. The direction is the same in every study.

It also holds across arms. The arm that failed everything (`polarity`) thought the most, and manager members think more and pass less than `stigwait` members. The `oracle` arm is the exception: it thinks more than `stigwait` (0.67) and passes the most (0.93 to 0.97).

It does not hold at the case level. Within an arm, unsolved cases did not think more.

This is association, not cause. A harder assignment draws both more thinking and more failure, so the data cannot say that less thinking would do as well. Only AU1 can.

## Truncation (stop reason `max_tokens`)

| Study | Role | Truncated / replies | Thinking share of truncated replies | Module passed after a truncated reply |
|---|---|---:|---:|---:|
| LI24 | plan | 24 / 108 (22%) | 0.97 | - |
| LI33 | member | 89 / 21,959 (0.4%; 87 of them `polarity`) | 0.99 | 0 of 89 |
| LI33 | plan | 2 / 155 | 0.94 | - |
| LI34 | start | 3 / 2,400 | 0.99 | 0 of 3 |
| LI35 | member | 10 / 1,863 | 1.00 | 2 of 10 |
| LI24, LI26, LI27 | member, start | 1 each | 0.95 to 0.99 | 0 |
| LI36, LI38 | all | 0 | - | - |

Truncated replies are almost all thinking: 0.88 to 1.00 of their output against 0.62 to 0.83 for replies that finished. Their module almost never passed (2 of 107 outside plans). Truncation is concentrated in plans at 120 modules with a 48,000-token budget (LI24-k120: 23 of 59 plans) and in `polarity` members. Since LI34, plan budgets have been 96,000 tokens or more and no plan was truncated.

## LI35 check: is its low thinking share a model label error?

**Partly.** The label in `results/li35/economy.json` is wrong, but the low share is real:

- `economy.json` says `"model": "claude-haiku-5-5"`. Every one of the 2,412 replies in `results/li35-k40/` was answered by `claude-sonnet-5-5`, and every request asked for effort `low` (480 start, 1,863 member, 69 plan; spec `observatory/batch2/rc/sweeps/li35-k40.json`). The label comes from `bench/economy.mjs`, which falls back to Haiku 5.5 when a study does not set `model`.
- The costs in that file are right. `bench/economy.mjs` prices each reply at the model it reports, and the recomputed costs at Sonnet prices match the file exactly: `stigwait` [US$ redacted] `manager` [US$ redacted] start [US$ redacted] At Haiku prices they would be [US$ redacted] 0.4159 and 0.0681.
- The thinking shares (start 0.05, `stigwait` 0.11, `manager` 0.22) match the raw data. They are low because LI35 ran Sonnet 5.5 at low effort: 1,902 of its 2,412 replies had no thinking at all.

So LI35 belongs in no "Haiku 5.5, default effort" table. The inventory row (`docs/AUTONOMY-INVENTORY.md`, section 2) should read "Sonnet 5.5, low effort", and the economy file's top-level label should be corrected when it is next regenerated. LI35 is, however, the lab's only data point for low effort. Members thought about 16 times less than Haiku at default (51 against 822 tokens per reply), and `stigwait` still solved 12 of 12 at 40 modules. That is a different model and size, so it is not evidence for AU1, only a reason to expect a large token cut.

## AU1 effect size: what 6 cases per arm can detect

Per-case spread of `stigwait` at default effort (Haiku 5.5, strict check, 6 act rounds; cost and tokens include the case's start wave, as AU1 will run its own):

| Source | Cases | Solved | Fresh-input pass | Act rounds mean (SD) | US$ per case mean (SD) | Output tokens per case mean (SD) | SD of ln output | Member thinking per case mean (SD) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| LI34-k80 (AU1 shape) | 12 | 12 | 12/12 | 3.33 (0.49) | 0.1331 (0.0043) | 365,540 (13,603) | 0.038 | 145,678 (7,591) |
| LI33-k80 | 16 | 16 | 16/16 | 3.63 (0.50) | 0.1345 (0.0049) | 369,433 (15,578) | 0.042 | 149,241 (9,298) |
| LI27-k80 | 12 | 11 | n/a | 3.83 (1.19) | 0.1336 (0.0029) | 367,201 (8,965) | 0.025 | 147,332 (6,217) |
| LI24-k80 | 8 | 8 | 8/8 | 3.63 (0.92) | 0.1349 (0.0021) | 371,206 (6,965) | 0.019 | 150,251 (4,876) |
| Pooled, 80 modules | 48 | 47 | 36/36 | 3.60 (0.79) | 0.1340 (0.0039) | 368,197 (12,285) | 0.033 | 148,041 (7,519) |
| LI34-k120 | 12 | 11 | 11/12 | 4.08 (1.16) | 0.1830 (0.0036) | 497,957 (11,578) | 0.023 | 200,170 (6,151) |

Act rounds count the act waves to zero failing checks. An unsolved case is counted as rounds + 1.

Minimal detectable difference with 6 cases per arm at power 0.8. The SD used is the larger of LI34-k80 and the pooled 80-module SD.

| Measure | SD | MDD at α = 0.05 | MDD at α = 0.025 (two comparisons) | Relative to the default mean |
|---|---:|---:|---:|---:|
| Output tokens per case | 13,603 | 24,402 | 27,588 | 6.7% / 7.5% |
| ln output tokens (ratio) | 0.038 | ratio 0.935 | ratio 0.927 | about 7% fewer tokens |
| US$ per case | 0.0043 | 0.0077 | 0.0087 | 5.8% / 6.6% |
| Act rounds to zero | 0.79 | 1.42 | 1.61 | +43% / +48% |
| Solved (binary, Fisher) | | 6/6 against at most 1/6 | | 80% power only if the low arm's true solve rate is at most 0.13 |
| Fresh-input pass | | same as solved | | every solved 80-module `stigwait` case also passed fresh inputs |

The multipliers are 1.79 SD for independent arms and 2.03 SD at α = 0.025. If the three runs share the 6 instances (paired), the multipliers are 1.42 and 1.67 times the SD of the differences. Same-instance correlations of ln output between two close arms were 0.82 (LI27-k80, LI33-k80) and 0.11 (LI27-k160), so pairing helps only if the instances are reused.

To detect a fall in solved share from 0.98 to 0.75 at 80% power would take 38 cases per arm. A fall to 0.67 would take 24, and a fall to 0.5 would take 14.

**Does more member thinking predict passing?** No, the reverse. Among `stigwait` member replies at 80 modules (8,588 replies), the module pass rate falls from 0.41 in the lowest thinking quartile of the same study and wave to 0.38, 0.34 and 0.28 in the highest. The stratified AUC of thinking tokens for passing is 0.38 (0.5 would mean no information). It is about 0.48 in wave 1 and 0.33 to 0.38 in waves 2 and 3. Over all Haiku default-effort members (78,240 replies) the AUC is 0.30. At the case level, member thinking correlates +0.25 with act rounds to zero (48 cases). Nothing in these data suggests members need their default thinking to pass. As above, the association cannot show that cutting it is safe.

### Recommendation (conservative effect size for AU1)

- **Power AU1 on output tokens per case (start wave + members), not on solved.** Register a 30% cut in output tokens per case at low or medium effort against default (ln ratio −0.36; AU-E1's own bar) as the effect of interest. With 6 cases per arm and α = 0.025 per comparison, the observed spread detects 7.5%. A 30% cut stays detectable even if lower effort makes the per-case SD 4.7 times larger than at default. The arithmetic supports a cut of that size: thinking is 64% of an 80-module case's output, so halving it saves about 32%.
- **As a standardized size:** 6 cases per arm detect d ≥ 1.8 at α = 0.05, or d ≥ 2.0 at α = 0.025. In raw units, the smallest differences worth registering are about 8% in output tokens or cost per case (about [US$ redacted] per case at default), and 1.6 act rounds.
- **Quality is a guard in AU1, not a test.** With 6 cases the pilot can only detect a collapse (6/6 against at most 1/6 solved). It cannot show that low effort solves as many cases. Register a stop or escalate rule instead: for example, 2 or more of 6 cases unsolved, any fresh-input failure, or a mean of 2 or more extra act rounds in an arm sends that cell to a larger study before any default changes. A claim of "no quality loss" needs about 24 to 38 cases per arm.

## Limits

- **Exploratory and post hoc,** on data collected for other questions. Nothing here is a registered test, and the p-values are descriptive.
- **The module outcome is coarse.** A module fails if any check naming it fails, including checks whose other side was never touched in that wave. Members in `stigwait` also reply to trace-only assignments.
- **Association only.** Thinking and failure share a cause (assignment difficulty). Stratifying by wave and arm reduces this but does not remove it.
- **The variance estimates come from default effort.** Lower effort may change both the mean and the spread. The 4.7× margin above covers spread, not a change in the distribution's shape.
- **Not comparable across cells.** All Haiku 5.5 data come from one provider and one instance generator. LI35 differs in model, effort and size.
- **LI27-k80 has no holdout file,** so fresh-input pass is unknown for its 12 cases.
- **Act rounds have a floor.** No 80-module `stigwait` case finished in fewer than 3 act rounds.

## Reproduction

From the repository root on the bench host (raw files are not in git):

```sh
for d in li24-k80 li24-k120 li26-k160 li27-k80 li27-k160 li33-k80 li33-k160 li34-k80 li34-k120 li35-k40 li36-k120 li38-k160; do scripts/raw.sh get results/$d; done
node observatory/autonomy/au-r2/thinking.mjs   # writes results/au-r2/analysis.json (about 15 s)
```
