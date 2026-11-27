# V1b preregistration: error correlation and voting on a climbable ladder (H-01, H-10, H-15)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/v1b-vote/protocol.mjs`, through `observatory/batch2/run2.mjs`. Claude Haiku 5.5, thinking disabled.

## Why
V1 (`results/batch2-v1-vote/REPORT.md`) hit a floor: 8% correct. Its report listed what to change. V1b applies it and adds a comparator that spends on individual reasoning instead of on more samples.

## Changes from V1
Small numbers and no modulus; 96 tasks, 16 per level (2, 3, 4, 5, 6, 8 operations; at most two multiplications); plurality over the answers given, ties to the earliest sample, instead of a majority of correct ones; correlation computed within a level so that difficulty between levels does not count as shared error; a strategy arm; a working-space arm. Seeds 15001 to 15096. Nothing is pooled with V1.

## Arms
- **ident**: 5 samples of one prompt, answer only.
- **present**: 5 wordings of the task, answer only.
- **strategy**: one wording with 5 prescribed ways of computing, answer only.
- **work**: 1 sample that may write up to 60 words of working before the answer.
1,536 calls.

## Analysis set
Levels where the single-sample accuracy of **ident** is between 0.2 and 0.9. If none, P1, P2 and P4 are *inconclusive*.

## Predictions and decision rules
- **P1 (H-01), errors are shared.** *Supported* if the intraclass correlation of correctness of **ident**, averaged over the levels of the analysis set, is at least 0.2.
- **P2 (H-15), diversity of strategy lowers it.** *Supported* if the 95% bootstrap interval (2,000 draws over tasks within level) of the correlation of **ident** minus that of **strategy** is above zero and the plurality accuracy of **strategy** is not below that of **ident**. P2p is the same test for **present**.
- **P3 (H-10), voting does not help where the agent is usually wrong.** On every level where **ident** single accuracy is above 0 and below 0.5, plurality accuracy is at most single accuracy plus 0.05. *Inconclusive* if there is no such level.
- **P4, working space against votes.** *Supported* if **work** accuracy exceeds the best plurality accuracy of the three voting arms by at least 0.05 on the analysis set. *Refuted* if it is lower by at least 0.05.

Reported, not tested: mean output tokens per arm, so that one working sample can be compared with five answer-only samples in cost.

## Stopping, budget
As in `tasks/M4-BUDGET-PREREG.md`. One study under the [US$ redacted] study cap.

## Limits stated in advance
Arithmetic stands in for a task with a checkable answer; it is not coding or research. One model. The prescribed strategies cannot be enforced, only requested. The ladder was not piloted.
