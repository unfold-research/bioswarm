# LI32 report: field announcements and cross-ant function adaptation (2026-11-19)

Preregistration: `tasks/LI32-COLONY-CLAIM-REPLICATION-PREREG.md`. Code: spec `observatory/batch2/colony/li32-k40.json`, analysis `observatory/batch2/colony/analyze-li32.mjs`. Data: `results/li32-colony-claim-k40/`. Analysis: `results/li32/analysis.json`. Review: `docs/reviews/LI32-REVIEW-LUNA-2026-11-19.md`. The study used 12 paired seeds per arm, 40 modules, 40 symmetric and 10 directed edges, eight checks per module, four ants, and the same 60-minute cap and message limits as registered. `claim` and `nopeer` used a field with peer messaging disabled; `market` was the default team. The primary measure counted cross-ant encoder/decoder function edits within 60 seconds while the pair was failing; first writes were excluded.

| Arm | Solved | Fresh-input pass | Bilateral events | Regressions | Announcements | Median wall min | Tokens |
|---|---:|---:|---:|---:|---:|---:|---:|
| `claim` | 12/12 | 12/12 | 42 | 55 | 278 | 12.1 | 156,258,451 |
| `nopeer` | 12/12 | 12/12 | 116 | 79 | 0 | 9.8 | 111,400,288 |
| `market` | 12/12 | 12/12 | 109 | 58 | 0 | 9.3 | 102,491,988 |

## Verdicts

| Hypothesis | Verdict | Paired result |
|---|---|---|
| **H-LI94 (primary):** announcing lowers bilateral adaptation vs `nopeer` | supported | 10–1, one tie; p = 0.01171875 |
| H-LI95: fewer fresh-input failures vs `market` | inconclusive | 0–0, 12 ties; p = 1 |
| H-LI96: fewer regressions vs `nopeer` | inconclusive | 7–3, two ties; p = 0.34375; Holm p = 0.6875 |
| H-LI97: faster completion vs `nopeer` | refuted | 3–9; p = 0.14599609375; Holm p = 0.43798828125 |

## What it shows

1. The registered primary comparison favored `claim` in 10 of 11 non-tied seeds. Aggregate detected event counts were 42 vs 116, but the paired test is by seed; these are event counts, not counts of unique pairs or independent interactions.
2. Quality was at ceiling: all 36 runs solved and passed fresh-input checks, with no capped run. Thus H-LI95 is inconclusive, not evidence of equivalence. Regressions were 55, 79, and 58 in `claim`, `nopeer`, and `market` respectively.
3. The phrase-based detector counted 278 claim-arm announcements and none in `nopeer`; this does not establish that each relevant rewrite followed a valid, accepted announcement. The review found field traces even in `nopeer` (33 in sampled seed 32400), but none matched the phrase detector.
4. The registered wall-time direction was refuted: `claim` was slower in 9 paired seeds. The median was 12.1 minutes vs 9.8 for `nopeer`; the directional result was not statistically significant.

## Limits

The primary result is metric-sensitive: the detector can count multiple edits per pair, and its total event counts are not the paired test or unique-pair estimates. Announcements were detected by phrase anywhere in `field_trace`, without pair, timing, or acceptance validation, so the requirement is only partially evidenced. Snapshot resolution can misclassify transient pass/fail states, the later edit need not find the pair still failing, and file-level first-write exclusion can omit same-time edits to other functions; the measure does not prove intentional mutual adaptation. All arms passed holdout, creating a ceiling. This was 12 paired seeds in one model/runtime family on synthetic tasks; results do not establish general effects, and multiple hypotheses/aggregate measures risk selective emphasis (Holm applied only to secondary hypotheses as registered). The reviewer found the mechanics broadly matched registration: four workers over 10 modules each, registered messaging/field modes and budgets, common instances, and no caps. There was no subscription-run ledger, so token telemetry is not a budget audit. Only sampled exports were reviewed; no sandbox replay or provider telemetry audit was done.
