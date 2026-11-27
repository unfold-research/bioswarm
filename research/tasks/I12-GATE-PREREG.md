# I12 preregistration: admission with a card template and a regression gate (H-I07, H-I03)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i12-gate/protocol.mjs` (admission by Claude Haiku 5.5) and `i12-gate-sonnet` (admission by Claude Sonnet 5.5). The executor is Claude Haiku 5.5 in both.

## Why
I11: an admission agent detects every collision, but its free-form merged card was wrong (Haiku, narrow newcomer) or correct and not followed by the small executor (Sonnet, broad and narrow). Two changes are tested together: a template that keeps the installed instinct's trigger and action first and unchanged, and a gate that tests each card in the executor before admitting it.

## Design
- **Wave 0, admission.** As in I11 with the template added to the instructions. Three colliding newcomers (rival, broad, narrow), three samples each.
- **Wave 1, execution.** Solo and all nine admitted sets, each on 56 cases: the 48 triage cases of I1 (new seeds) and 8 **agree** cases, where one unverified record repeats the verified value. An agree case is matched by the broad newcomer (all 8) and by the narrow one when the record is about indicator 0 (3), and never by the installed instinct. 560 calls.
- **Gate.** A set is admitted if the installed instinct's effect on the 16 exposed cases is within 2 of solo and it causes at most 1 wrong firing on clean and genuine cases. Otherwise the newcomer is refused.

## Predictions and decision rules, per admission model
*Inconclusive* if the effect of solo is below 12.
- **P1, with the template most resolutions pass.** At least 7 of the 9 sets are admitted.
- **P2, the case that failed in I11 passes.** At least 2 of the 3 narrow sets are admitted.
- **P3, an admitted card keeps the newcomer's action outside the collision.** Over the admitted broad and narrow sets, at least 75% of the newcomer-only cases are escalated as the newcomer prescribes.

Reported: whether each card follows the template, the resolution chosen, what the gate refused, and the nine cards.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap.
A wave of admission with no valid decision stops the study.

## Limits stated in advance
The gate uses the same 16 exposed cases that measure the effect, so "admitted" is in-sample; a real gate needs held-out cases. Template and gate are introduced together and their contributions cannot be separated here. One installed instinct, three hand-written newcomers.
