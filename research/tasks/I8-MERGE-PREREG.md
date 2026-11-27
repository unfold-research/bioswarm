# I8 preregistration: merging colliding instincts instead of arbitrating between them (H-I07)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i8-merge/protocol.mjs` (Claude Haiku 5.5) and `i8-merge-sonnet` (Claude Sonnet 5.5).

## Why
I5 and I7: when two installed instincts match the same case, a numeric priority and an exclusion clause repair it on Sonnet and not on Haiku. The alternative is to resolve the collision before installation, so that the agent holds one instinct.

## Design
Triage family of I1, new seeds, 16 cases per type, base scoring.
- **solo**: the target, `quarantine-lone-unverified`.
- **rival**: target and the rival of I5 (same trigger, escalate). Replication.
- **merged**: one card with the target's action and a history line saying the rival was merged into it and its action dropped.
- **refused**: the target, and a line saying the rival was refused at admission because it collides.
- **branch**: one card, one trigger, two actions split by a condition: escalate when the unverified record is about indicator 0, quarantine otherwise.
240 calls per model.

## Predictions and decision rules, per model
P1 to P3 are *inconclusive* if the effect of **solo** is below 12 of 16.
- **P1, replication of I5.** The effect falls by at least 4 under **rival**.
- **P2, a merged instinct works like a single one.** Effect under **merged** within 2 of **solo**.
- **P3, naming a refused instinct does no harm.** Effect under **refused** within 2 of **solo**.
- **P4, one instinct can carry a branch.** Under **branch**, at least 13 of 16 exposed cases follow the right branch.
- **P5, no spill-over.** At most 1 wrong firing in every arm.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner approval of this round on 2026-11-11 ("Sim, sexta rodada").

## Limits stated in advance
The merge is written by us; nothing here detects a collision or decides which action survives. One pair of instincts. Six of the sixteen exposed cases are about indicator 0, so the escalate branch of P4 rests on six cases.
