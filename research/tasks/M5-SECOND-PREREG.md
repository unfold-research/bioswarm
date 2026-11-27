# M5 preregistration: what the second searcher must be for a verifier to pay (H-M03, H-15)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/m5-second/protocol.mjs` (Claude Haiku 5.5, thinking disabled, answer only) and `m5-second-sonnet` (Claude Sonnet 5.5 on the base prompt). Combined analysis: `observatory/batch2/m5-second/analyze.mjs`.

## Why
M4 (`results/batch2-m4-budget/REPORT.md`): a verifier that rejects an answer and falls back on another sample of the same prompt gains nothing, because the sample repeats the answer; voting over such samples gains nothing either. The verifier was informative (it rejected 0.75 of real errors). M5 keeps the verifier and varies the fallback.

## Task and calls
The literature-search task of M4 (`observatory/batch2/littask.mjs`), 90 new tasks, seeds 16001 to 16090.
- Wave 0, per task: **s0** (base prompt), **same** (a second sample of it), **r1** (records as text lines, instruction reworded), **r2** (conditions as a checklist, records reversed, fields reordered). 360 calls.
- Wave 1, per task: the verifier on the s0 answer; **told**, the base prompt with the s0 answer marked as rejected by a reviewer. At most 180 calls. An s0 answer that is not a record id is rejected by a deterministic check and gets neither call.
- Second model: Sonnet 5.5 on the base prompt, 90 calls.

## Strategies
single = s0. retry-same, retry-reword, retry-told = s0 if the verifier accepts it, otherwise same, r1 or told. vote-diverse3 = plurality of s0, r1, r2, ties to the earliest. escalate = s0 if accepted, otherwise the Sonnet answer.

## Analysis set
Task sizes where the accuracy of single is between 0.2 and 0.9; if none, all tests are *inconclusive*. Differences are per task with a seeded bootstrap over tasks (4,000 draws).

## Predictions and decision rules
- **P1, a reworded fallback beats an identical one.** *Supported* if the 95% interval of retry-reword minus retry-same is above zero; *refuted* if below.
- **P2, a fallback told of the rejection beats an identical one.** The same for retry-told.
- **P3 (H-15), a vote over different wordings beats one call.** The same for vote-diverse3 minus single.
- **P4, a verifier makes a cascade worth it.** *Supported* if escalate is within 0.05 of Sonnet on every task while calling Sonnet on fewer than 70% of tasks.

Reported, not tested: accuracy of each wording alone, verifier sensitivity and specificity, how often the told fallback repeats the rejected answer.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner approval of this round on 2026-11-11 ("Sim, quinta rodada").

## Limits stated in advance
The rewordings may be easier or harder than the base prompt, so a gain of retry-reword mixes diversity with a better prompt; the accuracy of each wording alone is reported for that reason. Sonnet runs with adaptive thinking and is a stronger model, so the escalation arm measures a cascade, not diversity. One synthetic task.
