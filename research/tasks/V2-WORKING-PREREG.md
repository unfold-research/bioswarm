# V2 preregistration: working-space dose against a vote on a search task (H-01)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/v2-working/protocol.mjs`. Claude Haiku 5.5, thinking disabled.

## Why
V1b: one sample allowed 60 words of working was right on 96 of 96 arithmetic tasks, where five answer-only samples reached 0.56. The limit stated there was that arithmetic is trivial with working. M4 gave a task that is not arithmetic and is hard for an answer-only agent (0.46). V2 measures the dose of working on it.

## Design
The literature-search task of M4 (`observatory/batch2/littask.mjs`), 90 new tasks, seeds 17001 to 17090.
- **a**: answer only, 3 samples. single = the first; vote3 = plurality, ties to the earliest.
- **w20**, **w60**, **w150**: one sample that writes at most 20, 60 or 150 words of working before the answer.
540 calls, 512 output tokens.

## Analysis set
Task sizes where the accuracy of single is between 0.2 and 0.9; if none, the tests are *inconclusive*.

## Predictions and decision rules
- **P1, working beats a vote.** *Supported* if the 95% bootstrap interval of w60 minus vote3 is above zero; *refuted* if below.
- **P2, more working helps.** *Supported* if accuracy does not fall by more than 0.03 at any step from single to w20 to w60 to w150 and w150 exceeds single by at least 0.1.
- **P3, even a little working beats a vote.** The test of P1 for w20.

Reported, not tested: words of working actually written, mean output tokens per arm against three answer-only samples, truncated outputs.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner approval of this round on 2026-11-11 ("Sim, quinta rodada").

## Limits stated in advance
One model, one synthetic task. The word limits are requests; what was written is reported. A working field inside a JSON answer is not the same as a model's own thinking mode.
