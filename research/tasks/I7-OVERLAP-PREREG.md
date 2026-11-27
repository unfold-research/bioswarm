# I7 preregistration: partially overlapping instincts and a collision check at admission (H-I07)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i7-overlap/protocol.mjs` (Claude Haiku 5.5) and `i7-overlap-sonnet` (Claude Sonnet 5.5).

## Why
I5 showed that a rival with an identical trigger breaks an instinct, and that a numeric priority repairs it on Sonnet and not on Haiku. Real collisions will be partial, and a repair that a small model cannot follow is not a repair.

## Design
Triage family of I1, new seeds, 16 cases per type, base scoring. The target, `quarantine-lone-unverified`, is listed first in every arm.
- **solo**: the target alone.
- **broad**: plus an instinct that escalates on any unverified record. It covers every exposed case.
- **narrow**: plus an instinct that escalates only when the unverified record is about indicator 0. It covers part of the exposed cases.
- **disjoint**: plus the broad instinct with a clause, added at admission, that it does not apply to the target's trigger and names the target as the handler.
192 calls per model.

## Endpoints, exposed cases
**effect** (the target fired), in total and split by whether the unverified record is about indicator 0; wrong firings on clean and genuine cases.

## Predictions and decision rules, per model
*Inconclusive* on P1 to P3 if the effect of **solo** is below 12.
- **P1, a broader instinct overrides the specific one.** *Supported* if the effect falls by at least 4 from **solo** under **broad**. *Refuted* if by at most 1.
- **P2, interference stays inside the overlap.** *Supported* if under **narrow** the effect on cases not about indicator 0 is within 1 of **solo** and on cases about indicator 0 is at most half of **solo**. *Inconclusive* if **solo** fired on fewer than 3 cases about indicator 0.
- **P3, an exclusion clause written at admission restores the target.** *Supported* if the effect under **disjoint** is within 2 of **solo**.
- **P4, no spill-over.** At most 1 wrong firing in every arm.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner approval of this round on 2026-11-11 ("Sim, quinta rodada").

## Limits stated in advance
One target and three hand-written second instincts. The admission step is simulated by us writing the clause; no agent or tool detects the collision here. Few exposed cases are about indicator 0, so P2 rests on a handful of cases.
