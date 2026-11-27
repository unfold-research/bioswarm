# T2 stage A, second gate: 1 to 16 shards (2026-11-12)

Registered before any paid call of this study. Owner instruction of 2026-11-12 ("Sim, tamanhos menores"), the first of the three revisions offered in `results/batch2-t2-gate/REPORT.md`, within the standing authorisation for the shared ledger. Code: `observatory/batch2/t2-gate-small/protocol.mjs`. Claude Haiku 5.5, thinking disabled.

## Why
The first gate (`tasks/T2A-GATE-PREREG.md`) began at 16 shards and found one agent right on 3 of 60 there and no better above. It could not say where that agent is at ceiling. The benchmark's own smallest input is two shards. This gate covers 1 to 16.

## What changes, and what does not
- **Sizes:** 1, 2, 4, 8 and 16 shards. 16 is repeated so that the whole curve is in one study; nothing is pooled with the first gate.
- **Tasks,** by the same leak probe at these sizes (most common answer right on at most 0.2 of 200 instances, at every size): **I-01** Global Max, **I-05** Range Count, **I-06** XOR Checksum, **III-22** Global Median. Four pass, not three per level. I-02 leaves (0.24 at one shard) and III-26 too (0.38); Global Max enters because its answer only becomes guessable above 16 shards. For I-05, I-06 and III-22 the 16-shard instances are the instances of the first gate.
- **Unchanged:** generator and commit, seeding rule, 12 instances per cell, the request (statement, shards, a `working` field and an integer `answer`, 8,192 output tokens, no tools), grading, and the thresholds. 240 requests, one wave.

## Decision rule
Share right per size over the four tasks (48 instances per size).
- **small**: the largest size at 0.9 or above.
- **large**: the smallest size above it at 0.6 or below over all tasks, with at least two tasks at 0.6 or below on their own.
- **middle**: the size of this study strictly between them that is nearest their geometric mean, the smaller on a tie, if there is one.

| Outcome | Consequence |
|---|---|
| small and large exist | the map of T2 is preregistered on these sizes and tasks |
| no size at 0.9 | this agent is not at ceiling even on one shard; the single-agent arm is revised (thinking or a larger model), not the sizes |
| small exists, no large up to 16 | reported with the first gate's result at 16; the two disagree and the cause is looked for before anything else is run |

## Predictions
Written after the first gate, so they are expectations and not fresh tests.
- **P1**: at 16 shards the three shared tasks reproduce the first gate: at most 6 right of 36 (it had 2).
- **P2**: Global Max is at 0.9 or above at every size.
- **P3**: the share of replies whose working text declares an estimate grows with size. Counted with the word match of the first report (`estimat|approximat|infeasible|not perform|cannot|plausible|did not`), now fixed in advance.

Reported per task and size: share right, cut and invalid replies, mean absolute error, input and output tokens, cost.

## Stopping, budget
As in the first gate. Under the [US$ redacted] study cap, in the shared ledger (cap [US$ redacted]; [US$ redacted] committed).

## Limits stated in advance
One model, one wording, thinking disabled. 48 instances per size: about ±0.14 on a share. The task set differs from the first gate's, so the two curves join only on the three shared tasks. With one shard the task is not a distributed task at all; that size is the ceiling check.
