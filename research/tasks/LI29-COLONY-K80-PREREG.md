# LI29 preregistration: the waiting field inside the Colony at 80 modules (2026-11-18)

**Status:** registered 2026-11-18 before any LI29 data, after LI20's results were seen (disclosed). Same design as LI20 (`tasks/LI20-COLONY-WAIT-PREREG.md`): real Colony agents on the headless runtime fleet on benchhost (Colony `d0c8830`), gpt-6-luna on the ChatGPT subscription (outside the API ledger), equal message budgets between ants (200 per request, 60 per pair) and the same no-questions instruction for both arms. In parallel with sweep 4 (rule 9).

**Why.** In LI20 the waiting field solved and generalised 16 of 16, the market 14 and 13; on fresh inputs the field was lower in 3 cases and higher in none (H-LI68 inconclusive), while the market was faster in 11 of 16. At 40 modules both arms nearly hit the ceiling. LI29 doubles the codebase so that one parent coordinating four ants has more to hold.

**Design.** Arms `market` and `fieldwait`; k = 80 (80 directed and 60 symmetric edges, 8 test inputs per check), seeds 29800 to 29807, 90 minutes cap per team, done after 3 minutes without a running chat. Config `observatory/batch2/colony/li29-k80.json`; scoring `evaluate.mjs`; verdicts `analyze-li29.mjs`.

**Fixes from the LI20 review (before any LI29 data).** (1) The agents' own runner (`test/run.mjs`) now also fails a caller that does not use its helper's result, as the scorer does, so the feedback the agents see matches the check they are scored by (in LI20 two market runs were scored unsolved while their runner printed "all checks pass"). (2) Tokens are scored on the total, cached input included, as registered in LI20 (`analyze-li29.mjs`). (3) Holm is applied to both secondary hypotheses.

## Hypotheses (8 paired cases; the case is the unit)

- **H-LI84 (primary).** `fieldwait` leaves fewer checks failing on fresh inputs than `market` in more cases (sign test p < 0.05). Refuted if `market` is lower in more cases.
- **H-LI85.** `fieldwait` finishes sooner (wall-clock) in more cases.
- **H-LI86.** `fieldwait` uses fewer tokens in more cases.

Holm on the secondary hypotheses. Also reported: stalls, solved, hold-out passes, traces, blocked edits, capped runs.
