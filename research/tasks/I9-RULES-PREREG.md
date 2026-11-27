# I9 preregistration: which operator text removes unprompted quarantine, and whether a sentence keeps it (H-I04)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i9-rules/protocol.mjs` (Claude Haiku 5.5) and `i9-rules-sonnet` (Claude Sonnet 5.5).

## Why
I6: in the review family both models quarantine a lone unverified record unprompted (9 and 11 of 16), and one unrelated instinct installed by the operator removed that completely. The instinct used was itself about quarantining (`stale-record`), so the agent may have read it as the complete list of reasons to quarantine. I9 separates that reading from a general effect of installed rules, and tests a repair.

## Design
Review family of I1, new seeds, 16 cases per type. No note from another agent in any arm. No instinct about unverified records.
- **none**: the base system prompt.
- **op-quarantine**: `stale-record`, an unrelated instinct whose action is to quarantine.
- **op-other**: `flag-long-case`, an unrelated instinct whose action is a remark in the note.
- **op-style**: one operator sentence that is not about records ("Write the note in British English.").
- **op-preserve**: `stale-record` plus a sentence saying that installed instincts add to the agent's judgement, do not replace it and are not a complete list.
240 calls per model.

## Endpoint
**quarantine**, out of 16 exposed cases per arm. Drop = quarantine under **none** minus quarantine under the arm. Wrong firings on clean and genuine cases are reported.

## Predictions and decision rules, per model
All *inconclusive* if quarantine under **none** is below 6.
- **P1, replication of I6.** Drop under **op-quarantine** of at least 5.
- **P2, an instinct about something else does not remove it.** Drop under **op-other** of at most 2.
- **P3, a plain operator sentence does not remove it.** Drop under **op-style** of at most 2.
- **P4, a preserving sentence keeps it.** Drop under **op-preserve** of at most 2.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner approval of this round on 2026-11-11 ("Sim, sexta rodada").

## Limits stated in advance
One unprompted behaviour in one family; the proposal to test several was not possible because only this one has been observed. One wording per arm. Sixteen cases per cell.
