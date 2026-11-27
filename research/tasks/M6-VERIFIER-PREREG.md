# M6 preregistration: a verifier with working space, and the cascade it allows (H-02, H-M03)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/m6-verifier/protocol.mjs` (Claude Haiku 5.5, thinking disabled) and `m6-verifier-sonnet` (Claude Sonnet 5.5 on the base prompt). Combined analysis: `observatory/batch2/m6-verifier/analyze.mjs`.

## Why
M5: a verify-then-escalate cascade stopped 0.17 short of the stronger model because the answer-only verifier accepted wrong answers (specificity 0.67, sensitivity 0.70). V2: about twenty words of working lift the same small model from 0.58 to 0.97 as a searcher. M6 gives the verifier working space.

## Task and calls
The literature-search task (`observatory/batch2/littask.mjs`), 90 new tasks of 12, 24 and 48 records, seeds 18001 to 18090.
- Wave 0, per task: **s0**, the answer-only searcher; **sw**, a searcher with at most 20 words of working.
- Wave 1, per task, on the s0 answer: **v0**, the answer-only verifier of M4 and M5; **vw**, the same verifier with at most 40 words of working. An s0 answer that is not a record id is rejected by a deterministic check and gets neither call.
- Second model: Sonnet 5.5 on the base prompt, 90 calls.

## Strategies
single = s0. cascade-v0 and cascade-vw = s0 if that verifier accepts it, otherwise the Sonnet answer. sw alone. Sonnet alone.

## Analysis set
All 90 tasks. The band rule of M4 and M5 protected an answer-only baseline from floor and ceiling; here the comparisons are between verifiers on the same answers and between strategies that reach the hardest size, where Sonnet alone was not perfect in M5. Results by size are reported.

## Predictions and decision rules
- **P1 (H-02), working space makes the verifier reliable.** *Supported* if vw accepts at least 90% of correct s0 answers and rejects at least 90% of wrong ones.
- **P2, the cascade improves with it.** *Supported* if the 95% bootstrap interval (4,000 draws over tasks) of cascade-vw minus cascade-v0 is above zero; *refuted* if below.
- **P3, the cascade then matches the stronger model.** *Supported* if cascade-vw is within 0.05 of Sonnet alone while calling Sonnet on fewer than 70% of tasks.
- **P4, individual reasoning makes the cascade unnecessary.** *Supported* if sw alone is at least cascade-vw minus 0.05.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner approval of this round on 2026-11-11 ("Sim, sexta rodada").

## Limits stated in advance
One synthetic task whose answer follows from the input. The answer-only searcher is a handicapped baseline, so the share escalated says little about real cascades. Sonnet runs with adaptive thinking.
