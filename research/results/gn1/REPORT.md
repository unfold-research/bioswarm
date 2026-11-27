# GN1 report: memory between related cases (2026-11-23)

Preregistration: `tasks/GN1-MEMORY-PREREG.md`; Code: spec `observatory/batch2/gn1/bench.json`, analysis `observatory/batch2/rc/analyze-gn1.mjs`; Data: `results/gn1/`; Analysis: `results/gn1/analysis.json`; Review: `docs/reviews/GN1-REVIEW-LUNA-2026-11-23.md`. The preregistered design used Haiku 5.5 and `stigwait` on 80-module tasks: one shared case 1 fed cases 2–3 in related-sequence notebook, library, and no-memory arms, with unrelated controls. Half the edges repeated; outcomes were first-pass failures, solve waves, tokens, and fresh-input failures. Genome Research, 2026-11-22 and 2026-11-23: the preregistered estimate ([US$ redacted] to 8.6 with pilot) exceeded the [US$ redacted] trigger, so 2 controls were expected; the selected 5 related + 2 controls left only 4 guard units, making the guard weak. Under the cost rule the sample was 5 related sequences, so 10 primary units: the primary holds only with 9 or more wins (9/10 gives one-sided p = 0.011; 8/10 gives p = 0.055); 8 to 2 is not an effect. Statement as preregistered: "With 12 units, the primary holds only with 10 or more wins (10/12 gives one-sided p = 0.019; 9/12 gives p = 0.073): 9 to 3 is not an effect." **Implementation choices fixed before the data, 2026-11-23:** (a) each member's note-writing request lists at most the last 40 failing checks seen during the case, identically in every arm, and records how many were omitted per member; (b) after case 2, the note request shows the member the case-1 notes of its arm in the same block as its other requests (notebook: its own notes; library: module lines, cut at 300 tokens); (c) the cost rule compares projected study spend excluding pilot against [US$ redacted] and also reduces the sample (2 controls, then 5 related) while projection exceeds [US$ redacted] less the pilot's actual spend, since the cap includes pilot spend with no extra margin; timestamped `results/gn1/plan.json` records the projection and choice before the first study wave; (d) against full reservations, each batch (part of a wave) reserves at most min([US$ redacted] [US$ redacted] less committed), with committed including pilot spend and unreconciled batches at full reservation, down to one request; if no request fits with nothing in flight, the study stops with a final exit in `results/gn1/cap-stop.json`, so no unit is silently dropped.

| Arm | Units solved | First-pass failing checks (sum; median) | Waves to solve (median) | Output tokens (sum) | Holdout failing |
|---|---:|---:|---:|---:|---:|
| `none` | 10/10 | 2,117; 212 | 3 | 3,203,559 | 0 |
| `notebook` | 10/10 | 2,053; 205.5 | 3.5 | 4,456,687 | 0 |
| `library` | 10/10 | 1,999; 199.5 | 3.5 | 5,031,574 | 0 |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| GN1-H1 (H-G23, primary): notebook vs none, first-pass failures | **supported** | 10 to 0 wins, p = 0.0009766; sequence-level 5 to 0, p = 0.03125 |
| GN1-H2 (H-G24): library vs none, first-pass failures | **supported** | 10 to 0, p = 0.0009766; Holm p = 0.003906; sequence-level 5 to 0 |
| GN1-H3 (H-G25): notebook vs none, solve waves | **refuted** | notebook better 1, none better 5, ties 4 |
| GN1-H4 (H-G26): notebook vs none, output tokens | **refuted** | notebook better 0, none better 10; Holm p = 1 |
| GN1-H5 (H-G27, no harm on holdout) | **inconclusive** | 10 ties; zero holdout failures in all arms; not refuted (no harm detected), never supported |

## What it shows

1. Notebook reduced summed first-pass failures by 64/2,117 (3.0%) against none; library reduced them by 118/2,117 (5.6%). All arms solved all 10 units. The observed reductions were concentrated in symmetric failures (527 none, 452 notebook, 438 library), not clearly in repeated edges: notebook had 970 repeated versus 1,044 new failures; library 940 versus 1,051. These are descriptive, not registered tests.
2. Notebook took more waves at the median (3.5 vs 3) and 39% more output tokens (4,456,687 vs 3,203,559); library used 57% more tokens than none. Note-writing cost was [US$ redacted] for notebook and [US$ redacted] for library. These findings explain why lower first-pass failures did not mean faster or cheaper completion.
3. Holdout was a floor: all arms had zero fresh-input failures (including case 2, seed 51000: 212/207/197 initial failures, zero holdout each). Stage-0 overlap was 22.25% notebook and 22.70% library; reductions were 3.02% and 5.57%. Exploratory notebook/library first-pass comparisons favored library 8 units to 2; notebook local failures rose 9→39.

## Limits

The analysis regenerates from git: the rerun review ran `analyze-gn1.mjs` and matched `results/gn1/analysis.json`, and the 2026-11-23 environment review regenerated it from git alone (no R2) with all numbers and verdicts matching. The first review could not, because its copy lacked `observatory/batch2/ne/tasks.mjs` (imported by `rc/code.mjs`), a bench packaging bug fixed in PR #188. On 2026-11-23 `analyze-gn1.mjs` was changed so statement (2) and `reading` follow the 10 units actually run instead of the preregistered 12, and `analysis.json` was regenerated; no number or verdict changed. Run state (`pilot/state.json`, `study/state.json`) is in R2 under `RAW-MANIFEST.json`; there is no separate `holdout.json`. `cap-stop.json` is also absent; the run log instead records completion at 63 records and [US$ redacted] under the [US$ redacted] cap, with no cap-stop exit. The sampled runs use `stigwait`, share case-1 instance hashes across arms, and show notes only in memory arms. The cost rule reduced the planned sample to five related sequences (10 correlated units) and two controls (four weak-guard units); only five independent related sequences remain. One Haiku model, synthetic tasks, shared starting case, same-model note writing/reading, 300-token notes, and secondary outcomes limit inference. All arms solved 10/10, but first-pass reductions were modest (2,117→2,053 and 1,999); holdout zeroes are not evidence of equivalence. Reductions were not concentrated on repeated edges, so the mechanism is unestablished. Registered refutation is directional: H3 and H4 are refuted as recorded; Holm adjustment does not change it. The guard held (medians 212.5 vs 213.5 first-pass, 3.5 vs 3.5 waves) but is weak. Other readings are exploratory.

Review rerun (2026-11-23, after the bench gave the review its code dependencies, PR #188): it ran `analyze-gn1.mjs` and its regenerated output matched `results/gn1/analysis.json` as committed then. The first review, which could not regenerate it, is kept at docs/reviews/GN1-REVIEW-LUNA-2026-11-23-initial.md.

## Economy

Computed by `bench/economy.mjs` from the raw data and the shared ledger (script study, claude-haiku-5-5).

| Arm | Requests | Input | Output | Thinking | Cost | Solved | Cost/solved | >[redacted]k (extra) | Truncated (wasted) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| shared | 2,036 | 5,956,222 | 2,592,099 | 1,658,581 | [US$ redacted] | n/d | n/d | 0 ([US$ redacted]) | 2 ([US$ redacted]) |
| none | 3,802 | 11,118,686 | 4,840,652 | 3,087,082 | [US$ redacted] | n/d | n/d | 0 ([US$ redacted]) | 0 ([US$ redacted]) |
| notebook | 4,995 | 15,749,328 | 6,708,173 | 4,298,593 | [US$ redacted] | n/d | n/d | 0 ([US$ redacted]) | 4 ([US$ redacted]) |
| library | 5,035 | 16,072,198 | 7,580,237 | 5,121,796 | [US$ redacted] | n/d | n/d | 0 ([US$ redacted]) | 1 ([US$ redacted]) |
| **total** | 15,868 | 48,896,434 | 21,721,161 | 14,166,052 | [US$ redacted] | | | 0 | 7 ([US$ redacted]) |

n/d: no per-arm solved count recorded for this script study.

The arm rows add up every stage of the raw data: pilot 1,176 requests, [US$ redacted]; study 14,692 requests, [US$ redacted]

Ledger (146 entries named `gn1-*`), actual by stage: pilot [US$ redacted] (14 batches, 1,176 requests, reserved [US$ redacted]); study [US$ redacted] (132 batches, 14,692 requests, reserved [US$ redacted]). Raw usage priced with pricing.mjs: [US$ redacted]

Thinking is 65% of output tokens. Reserved [US$ redacted] actual [US$ redacted] (ledger).
