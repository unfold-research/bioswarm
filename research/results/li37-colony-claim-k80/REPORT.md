# LI37 report: claim announcements and cross-ant adaptation at 80 modules (2026-11-20)

Preregistration: `tasks/LI37-COLONY-CLAIM-PAIRS-PREREG.md`; Code: spec `observatory/batch2/colony/li37-k80.json`, analysis `observatory/batch2/colony/analyze-li37.mjs`; Data: `results/li37-colony-claim-k80/`; Analysis: `results/li37/analysis.json`; Review: `docs/reviews/LI37-REVIEW-LUNA-2026-11-20.md`. The study compares `claim` (a field for announcing adaptation), `nopeer` (wait field without peer messaging), and `market` (default team) on 12 paired seeds, using 80 modules and a 90-minute cap. Its primary measure is distinct cross-ant format pairs adapted on both sides while failing; secondary hypotheses test fresh-input failures, wall time, and tokens.

| Arm | Solved | Fresh-input pass | Capped | Adapted pairs | Validated announcements / pairs | Median minutes | Total tokens |
|---|---:|---:|---:|---:|---:|---:|---:|
| `claim` | 12/12 | 12/12 | 0 | 24 | 22/24 | 19 | 317,499,004 |
| `nopeer` | 12/12 | 11/12 | 0 | 28 | 19/28 | 21.5 | 454,187,846 |
| `market` | 10/12 | 10/12 | 2 | 25 | 0/25 | 17 | 296,112,636 |

## Verdicts

| Hypothesis | Verdict | Paired-seed result |
|---|---|---|
| **H-LI111 (primary):** claim has fewer adapted pairs than nopeer | inconclusive | 5–3 wins, 4 ties; p = 0.7265625 |
| H-LI112: fewer fresh-input failures than market | inconclusive | 2–0 wins, 10 ties; p = 0.5; Holm p = 0.5 |
| H-LI113: faster than nopeer | supported | 10–2 wins; p = 0.03857421875; Holm p = 0.11572265625 |
| H-LI114: fewer tokens than nopeer | inconclusive | 9–3 wins; p = 0.14599609375; Holm p = 0.2919921875 |

## What it shows

1. Claim had 24 adapted pairs (22 with a validated trace), versus 28 (19) for nopeer and 25 (0) for market. The primary paired comparison is inconclusive; pair totals alone do not establish an announcement effect.
2. Claim passed all fresh-input checks, but so did 34/36 runs overall. Both market failures hit the 90.2-minute cap, with 121 and 154 failures, so H-LI112 is ceiling-limited and does not show equivalence or causation. In sampled records, claim seed 37802 solved despite 12 adapted pairs (all 12 with validated traces); this is consistent with, but does not establish, a mechanism.
3. Claim's median was 19 minutes versus 21.5 for nopeer, with a nominal 10–2 paired advantage. The preregistered analyzer verdict is supported; after Holm correction the p-value is 0.1157, so this is not family-wise significant evidence. Claim used 317.5M tokens versus 454.2M, but the paired token result was inconclusive.
4. Exploratory telemetry: bilateral edit events were 37/35/34 and regressions 50/49/66 for claim/nopeer/market. These event counts are not distinct pairs and are not registered verdict outcomes.

## Limits

The claim/nopeer comparison is not an isolated test of announcement wording: the arms differ in field mode and peer messaging, and the review did not exhaustively compare all prompts and exports. Twelve paired seeds, four outcomes, synthetic generated modules, and one model/runtime limit power and generalisation. H-LI113 is supported under the registered unadjusted verdict rule, but Holm-adjusted p = 0.1157 is not significant. All 36 per-run records were present, seeds were paired, and the analyzer regenerated matching instances; two market runs reached the 90.2-minute cap. No separate state/holdout files were present; holdout status is recorded in per-run results. There is no financial ledger: token totals are telemetry, not spend. The review verified the analyzer rerun but did not independently replay every check or inspect every export, so mechanism validation depends on analyzer telemetry definitions.
