# M8 preregistration: a verifier behind a deep agent (H-M03, H-02)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/m8-deep/protocol.mjs`. Claude Haiku 5.5, thinking disabled, 1,536 output tokens.

## Why
M7: one agent with 150 words of working reached 0.91 in one call, level with a verifier selecting among five shallow agents. The verifier results so far (V3, M7) are for shallow searchers. M8 asks whether verification still adds once the searcher reasons deeply, on harder tasks.

## Design
Search task with 96, 144 and 192 records, 30 tasks each, seeds 23001 to 23090.
- Wave 0: two deep searchers, d0 and d1 (at most 150 words of working).
- Wave 1, on the d0 answer: **v40**, a verifier with at most 40 words of working; **v150**, with at most 150. An answer that is not a record id is rejected by a deterministic check.
Strategies: deep = d0. verify40 and verify150 = d0 if accepted, otherwise d1.

## Predictions and decision rules
All 90 tasks, per-task differences, seeded bootstrap (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **P1, a verifier adds to a deep agent.** verify40 minus deep.
- **P2, a deep verifier adds to a deep agent.** verify150 minus deep.
- **P3, the deeper verifier is the better one.** verify150 minus verify40.

Reported: accuracy by size, how often the two deep samples differ, the share of tasks where either is right, each verifier's accepted and rejected counts, truncated outputs.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap.

## Limits stated in advance
One model, one synthetic task. The difficulty at 192 records was not piloted. The fallback is a second sample of the same deep agent.
