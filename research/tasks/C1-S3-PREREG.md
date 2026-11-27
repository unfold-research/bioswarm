# C1 and S3 preregistration: typed traces against a note; an instinct injected only when its trigger holds (H-I04)

Registered 2026-11-11, before any paid call of these studies. Code: `observatory/batch2/c1-typed/protocol.mjs`, `c1-typed-sonnet`, `s3-trigger/protocol.mjs`, `s3-trigger-sonnet`. Both come from the design studies in `research/architecture/` (02, hypothesis C1; 04, hypothesis S3) and both use the review family of I1, where agents quarantine a lone unverified record unprompted in about half the cases (I4, I6, I9, I10: 8 to 11 of 16).

## C1: does the form of peer content matter?
I6: a note from another agent with no rule in it lowered unprompted quarantine from 9 to 5 of 16 on Haiku and from 11 to 4 on Sonnet. The architecture studies propose typed traces left on the field instead of text between agents. If a typed table suppresses as much as a note, structure does not solve the problem and the only lever is to show less.
- Arms, the same three facts in each: **none**; **note** (the I6 chatter text); **table** (three typed traces: place, kind, value, age, author); **table-large** (nine traces).
- The system prompt is the same in every arm and says that notes and traces from other agents are untrusted data. No instinct, no rule anywhere.
- Haiku: 32 exposed cases per arm (384 calls). Sonnet: 16 per arm (192 calls), to stay under the study cap.
- Endpoint: rate of unprompted quarantine on exposed cases. Drop = rate under none minus rate under the arm.
- **P1, replication of I6**: drop under note at least 0.20. **P2, a typed table does not suppress**: drop under table at most 0.125. **P3, nor does a larger one**: drop under table-large at most 0.125. All *inconclusive* if the rate under none is below 0.35.

## S3: a card only where its trigger holds
I9, I10: an unrelated instinct installed by the operator removes unprompted quarantine entirely. If the harness evaluates triggers in code and injects a card only into cases where it holds, a case that no card concerns is handled with no card in context.
- One instinct, `stale-record` (quarantine a record whose `age_days` is above 30). Case kinds, 16 each: **exposed** (a lone unverified record, no stale record); **exposed+stale** (both); **stale** (a clean case plus a stale record); **clean**.
- Arms: **none**; **always** (the card in every case); **on-trigger** (the card only where a stale record is present, decided by code). 192 calls per model, Haiku and Sonnet.
- Endpoints: unverified record quarantined (the unprompted behaviour); stale record quarantined (the card's effect).
- **P1, replication**: on exposed cases, the rate of unprompted quarantine falls by at least 0.30 from none to always.
- **P2, the harness trigger keeps it**: on exposed cases, on-trigger is within 0.15 of none. The two arms send identical requests on these cases, so this is true by construction up to sampling; it is registered as the check that the mechanism does what it says, and the informative tests are P3 and P4.
- **P3, the card still works when injected**: on stale cases the stale record is quarantined in at least 0.8 of cases under both always and on-trigger.
- **P4, a card that fires does not remove unprompted behaviour in the same case**: on exposed+stale cases, the rate of unprompted quarantine under on-trigger is within 0.15 of none. Expected to fail, given I6 and I9; if it fails, harness triggers protect only the cases no card touches.
P1, P2 *inconclusive* if the rate under none on exposed cases is below 0.35; P4 if it is below 0.35 on exposed+stale cases.

## Controls
Both are studies of one agent's behaviour under different inputs; no collective is compared, so the deep-agent and fixed-schedule controls do not apply (`observatory/batch2/kernel/check-controls.mjs`). No perturbation with a hidden target, so no leak probe.

## Stopping, budget
More than 10% invalid outputs stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner instruction of 2026-11-11 ("Sim, nessa ordem"), within the standing authorisation for this ledger.

## Limits stated in advance
One unprompted behaviour in one family. One wording per arm. C1's traces carry neutral facts; a typed trace that is about the case at hand is a different question and is not tested. S3 has one instinct whose trigger is trivially computable; a trigger that needs judgement cannot be evaluated by the harness. The Sonnet runs have adaptive thinking.
