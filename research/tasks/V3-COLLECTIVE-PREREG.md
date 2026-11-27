# V3 preregistration: voting and verification among agents that have working space (H-01, H-M03, H-15)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/v3-collective/protocol.mjs`. Claude Haiku 5.5, thinking disabled.

## Why
V1b, M4, M5 and V2 compared collectives of agents denied working space with one agent that has it; the single agent won every time. That comparison handicaps the collective. V3 gives every agent working space and makes the task hard enough for one such agent to fail.

## Task and calls
The literature-search task with 48, 96 and 144 records, 30 tasks each, seeds 19001 to 19090 (in V2, 20 words of working gave 0.87 at 48 records).
- Wave 0, per task: five samples of a searcher with at most 20 words of working, s0 to s4; **deep**, one searcher with at most 150 words.
- Wave 1: a verifier with at most 40 words of working, on each distinct record id among s0 and s1.

## Strategies
single = s0 (1 call). vote3, vote5 = plurality, ties to the earliest. verify3 = s0 if accepted, otherwise s1 (2 or 3 calls). deep (1 call).

## Analysis set
Sizes where the accuracy of single is between 0.2 and 0.9; if none, P1, P2 and P4 are *inconclusive*.

## Predictions and decision rules
Per-task differences, seeded bootstrap over tasks (4,000 draws).
- **P1 (H-01), a vote helps agents that reason.** *Supported* if the 95% interval of vote3 minus single is above zero; *refuted* if below.
- **P2 (H-M03), verifying beats voting.** The same for verify3 minus vote3.
- **P3, reasoning agents differ.** *Supported* if on at least 20% of the tasks of the analysis set the five samples give more than one answer (M4: 9% for answer-only agents).
- **P4, more individual reasoning beats the vote.** *Supported* if the interval of deep minus vote3 is above zero; *refuted* if below.

Reported, not tested: vote5, the share of tasks where any of five samples is right, verifier specificity and sensitivity, output tokens per strategy.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner approval of this round on 2026-11-11 ("Sim, sexta rodada").

## Limits stated in advance
One model, one synthetic task; all agents are copies with the same prompt, so this is the weakest form of collective. The difficulty at 96 and 144 records was not piloted.
