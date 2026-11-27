# V7 preregistration: verification and voting among deep agents on a task they do not saturate (H-M03, H-02)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/v7-hard/protocol.mjs` (Claude Haiku 5.5, thinking disabled, 1,536 output tokens) and `v7-hard-sonnet` (Claude Sonnet 5.5 with 60 words of working). Combined analysis: `observatory/batch2/v7-hard/analyze.mjs`.

## Why
M8 put a verifier behind a deep agent and found nothing to add, because the agent was at 0.94 and made five errors. V6 found a task where the same deep agent is lower: counting by group, 0.83 at 96 records. V7 asks the question of M8 where there is room.

## Design
Counting by group (`observatory/batch2/grouptask.mjs`) with 96, 144 and 168 records, 30 tasks each, seeds 25001 to 25090. 168 is the largest size under the request size ceiling.
- Wave 0: three deep agents, d0 to d2 (at most 150 words of working).
- Wave 1: a verifier with at most 150 words of working on each distinct author named by d0 to d2.
- Second model: Sonnet 5.5 with 60 words of working, 90 calls.
Strategies: deep = d0. deepvote3 = plurality, ties to the earliest. select3 = the first accepted answer in sample order, otherwise the plurality. escalate = d0 if accepted, otherwise the Sonnet answer.

## Predictions and decision rules
All 90 tasks, per-task differences, seeded bootstrap (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below. P1 to P3 are *inconclusive* if deep alone is above 0.9.
- **P1, verified selection adds to a deep agent.** select3 minus deep.
- **P2, a vote among deep agents adds to one.** deepvote3 minus deep.
- **P3, selection beats the vote.** select3 minus deepvote3.
- **P4, escalating rejected answers to the larger model adds to a deep agent.** escalate minus deep.

Reported: accuracy by size, how often the three deep samples differ, verifier counts, share escalated, Sonnet alone, cost per call.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap; the owner asked on the same day for the regime comparison and for I14 and V7 ("Faz os dois").

## Limits stated in advance
One synthetic task, copies of one prompt, difficulty not piloted at 144 and 168 records. select3 costs three deep calls and up to three verifier calls against one call for deep.
