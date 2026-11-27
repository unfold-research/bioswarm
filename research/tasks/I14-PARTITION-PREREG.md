# I14 preregistration: admission that writes a partition, with a held-out gate (H-I07, H-I03)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i14-partition/protocol.mjs` (admission by Claude Haiku 5.5) and `i14-partition-sonnet` (admission by Claude Sonnet 5.5). The executor is Claude Haiku 5.5 in both.

## Why
I13: the small executor follows a card whose two conditions are mutually exclusive and stated side by side, in both directions. I11 and I12: it does not apply precedence between overlapping conditions ("first this, otherwise that"), which is how admission agents wrote their merges. I12 was also inconclusive because its gate depended on a fixed baseline and used the same cases to admit and to measure.

## Design
- **Wave 0, admission.** As in I12, with a template that requires one Action line per condition, each condition stated in full and checkable alone, no case under two conditions, and no "otherwise" or reference to another condition. Three colliding newcomers (rival, broad, narrow), three samples each.
- **Wave 1, execution.** Solo and all nine admitted sets, on two case sets of the same shape and different seeds: **gate** and **held-out**. Each has the 48 triage cases of I1 and 8 agree cases (one unverified record that repeats the verified value). 1,120 calls.
- **Gate**, on the gate set only: a set is admitted if the installed instinct's effect on the 16 exposed cases is within 2 of solo on the same set and it causes at most 1 wrong firing on clean and genuine cases.

## Predictions and decision rules, per admission model
*Inconclusive* if solo fires on fewer than 8 of 16 exposed cases in either set.
- **P1, written as a partition, most resolutions pass.** At least 7 of 9 sets admitted.
- **P2, the narrow newcomer passes.** At least 2 of its 3 sets admitted.
- **P3, the gate generalises.** At most 1 admitted set fails the same criterion on the held-out set.
- **P4, the newcomer's action is kept outside the collision.** Over the admitted broad and narrow sets and both case sets, at least 75% of newcomer-only cases are escalated.

Reported: whether each card follows the template, and the cards.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap; the owner asked on the same day for the regime comparison and for I14 and V7 ("Faz os dois").
A wave of admission with no valid decision stops the study.

## Limits stated in advance
One installed instinct, three hand-written newcomers, sixteen exposed cases per set. Whether a card "follows the template" is checked by pattern only.
