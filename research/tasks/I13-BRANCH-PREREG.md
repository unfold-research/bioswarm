# I13 preregistration: a conditional instinct in both directions (H-I07)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i13-branch/protocol.mjs` (Claude Haiku 5.5) and `i13-branch-sonnet` (Claude Sonnet 5.5).

## Why
I8 reported that one card with two actions split by a condition is followed (14 and 16 of 16). I12 showed that the small model takes the escalating action whenever a clause names indicator 0, whatever the structure of the card. The branch I8 asked for was that same action, so I8 did not show that a conditional card is followed. I13 tests both directions.

## Design
Triage family of I1, new seeds, 32 cases per type; 12 of the 32 exposed cases have the unverified record on indicator 0. One instinct installed per arm.
- **solo**: `quarantine-lone-unverified`.
- **branchA**: escalate when the record is about indicator 0, quarantine otherwise (the card of I8).
- **branchB**: quarantine when it is about indicator 0, escalate otherwise. Same card with the two actions exchanged.
288 calls per model.

## Endpoints, exposed cases, split by indicator 0 or not
**quarantined** (the quarantine action taken in full, as "effect" in I1) and **escalated** (answered as the escalate action prescribes).

## Predictions and decision rules, per model
*Inconclusive* if under **solo** the quarantined rate is below 0.6 on either subset.
- **P1, branchA is followed.** On cases not about indicator 0 the quarantined rate is within 0.15 of solo's on the same cases, and on cases about indicator 0 at least 0.8 are escalated.
- **P2, branchB is followed.** On cases about indicator 0 the quarantined rate is within 0.15 of solo's, and on the other cases at least 0.8 are escalated.
- **P3, no spill-over.** At most 2 wrong firings on the 64 clean and genuine cases in every arm.

If P1 is supported and P2 is not on a model, that model follows its bias and not the card.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap.

## Limits stated in advance
The escalate action coincides with the base rule, so "escalated" can also mean the card was ignored; the informative half of each test is the quarantine branch. One condition (indicator 0), one pair of actions.
