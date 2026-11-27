# LI37 preregistration: the claim field at 80 modules, counted by pair and with announcements validated (2026-11-19)

**Status:** registered 2026-11-19 before any LI37 data, after the LI32 report and review were seen (disclosed). Colony lab fleet (`openai-codex/gpt-6-luna`, Colony `ffa0d13` with telemetry), run by `observatory/batch2/colony/drive.mjs` on the automatic research bench (benchhost). Analysis: `observatory/batch2/colony/analyze-li37.mjs` (per-seed exact sign test, Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. No US$ ledger (subscription runs); per-run tokens are reported as telemetry. Spec: `observatory/batch2/colony/li37-k80.json`.

**Why.** LI32 supported that announcing who adapts lowers bilateral adaptation of cross-ant format pairs (10 seeds to 1), but its review found three weaknesses: the detector counted every matching encoder edit, so the 42 against 116 totals are events and not pairs; "announcement" was a phrase match anywhere in `field_trace`, with no check of pair, timing or acceptance; and all 36 runs solved with a clean hold-out, so quality could not separate the arms. LI37 repeats LI32's three arms with the same instructions and limits, on 12 new seeds, with two changes registered before data: **(1)** 80 modules with LI29's harder shape (80 directed and 60 symmetric edges, four ants, 8 tests per check) and a 90-minute cap, to leave room below the ceiling; **(2)** the primary outcome counts **distinct cross-ant pairs** that were adapted on both sides while failing (a pair counts once however many edits it takes), and every adapted pair is checked for a **validated announcement**: a `field_trace` call on one of the pair's two files that names one of its two functions, at most 10 minutes before the first adapting edit.

**Disclosure (before any LI37 data).** While building the analyzer it was run on LI32's data (12 seeds, 40 modules) as a smoke test; it reproduces LI32's event totals exactly (42, 116 and 109 bilateral events). Counted by distinct pair, the same data give 36 adapted pairs for `claim`, 77 for `nopeer` and 83 for `market`, and the per-seed comparison `claim` against `nopeer` is 9 seeds to 2 (p = 0.065), so LI32's primary result does not survive the stricter count at its own threshold. Validated announcements in that data: 31 of 36 adapted pairs for `claim`, 47 of 77 for `nopeer` (its ants also announce through the field, just not by the phrase LI32 searched for) and none for `market`, which has no field. Both numbers shaped the design above (hence the pair count as primary and the validated share reported for every arm) and are exploratory; the LI37 hypotheses are decided on new seeds only.

**Arms.** `claim`, `nopeer`, `market` (LI32's definitions). 12 seeds, 37800 to 37811.

## Hypotheses (12 seeds; the seed is the unit)

- **H-LI111 (primary).** `claim` against `nopeer` on distinct adapted pairs (lower is better).
- **H-LI112.** `claim` against `market` on checks failing on fresh inputs.
- **H-LI113.** `claim` against `nopeer` on wall time.
- **H-LI114.** `claim` against `nopeer` on total tokens.

Rule: supported if the first arm is lower in more seeds with p < 0.05; refuted if the second is lower in more seeds; otherwise inconclusive. Reported without a verdict: the share of adapted pairs with a validated announcement per arm (a `nopeer` or `market` run can show validated traces too, which is part of the answer), capped runs, regressions, and the count of runs solved. If every run solves again, H-LI112 is inconclusive by the same ceiling and that is the finding.
