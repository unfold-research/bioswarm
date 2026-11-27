# I10 preregistration: a behaviour written down as an instinct, and the arrival of others (H-I04, H-I07)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i10-explicit/protocol.mjs` (Claude Haiku 5.5) and `i10-explicit-sonnet` (Claude Sonnet 5.5).

## Why
I6 and I9: the quarantine both models do unprompted in the review family (about 10 of 16) goes to zero when any instinct is installed, and a sentence asking the agent to keep its judgement does not restore it. The remaining repair is to write the behaviour down as an instinct before installing anything else. I2 says disjoint instincts do not interfere, but it was run in another family and never with this question.

## Design
Review family of I1, new seeds, 16 cases per type. All text is installed by the operator.
- **none**; **implicit-stale** (only an unrelated instinct about quarantining; replication of I9).
- **explicit**: `quarantine-lone-unverified` in the family's words.
- **explicit-stale**: explicit, then the unrelated quarantining instinct.
- **explicit-other**: explicit, then an unrelated instinct about something else.
- **explicit-last**: three unrelated instincts, then explicit.
288 calls per model.

## Endpoint
**quarantine**, out of 16 exposed cases per arm: the unverified record is listed in `quarantined`. Also the full effect of I1 (right claims and verdict) and wrong firings.

## Predictions and decision rules, per model
- **P1, written down, the behaviour is reliable.** Quarantine under **explicit** of at least 14.
- **P2, P3, P4, it survives the arrival of others.** Quarantine under **explicit-stale**, **explicit-other** and **explicit-last** each within 2 of **explicit**. *Inconclusive* if **explicit** is below 12.
- **P5, replication of I9.** Quarantine falls by at least 5 from **none** to **implicit-stale**. *Inconclusive* if **none** is below 6.
- **P6, no spill-over.** At most 1 wrong firing in every arm.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap.

## Limits stated in advance
One behaviour, one family, sixteen cases per cell. The unrelated instincts have triggers that never occur in the cases.
