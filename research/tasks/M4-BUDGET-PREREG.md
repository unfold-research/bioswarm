# M4 preregistration: a verifier or one more searcher at the same budget (H-M03, H-02)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/m4-budget/protocol.mjs`, through `observatory/batch2/run2.mjs`. Claude Haiku 5.5, thinking disabled, answer only.

## Why
M3 showed that a verifier with the sources catches planted provenance errors. It did not compare verifying with adding searchers, which is what H-M03 claims, and its errors were planted by us. M4 uses the searchers' own errors and compares strategies at the same number of calls.

## Task
A synthetic literature search. Each task lists 12, 24 or 48 study records (id, year, review status, outcome, sample size). The searcher names the study with the largest sample among those that are peer-reviewed, from 2020 or later and positive. One sixth of the records qualify, with adjacent sample sizes; another sixth are decoys with larger samples that miss exactly one condition. 30 tasks per size, 90 in total, seeds 14001 to 14090.

## Calls
- Wave 0: five independent searcher samples per task, s0 to s4 (450 calls).
- Wave 1: a verifier that sees the records and one proposed answer and returns accept or reject, once for each distinct answer among s0, s1 and the largest decoy (at most 270 calls). An answer that is not the id of a record is rejected by a deterministic check at no cost. An invalid verifier output counts as a rejection.

## Strategies, all computed from those calls
| Strategy | Rule | Calls |
|---|---|---|
| single | s0 | 1 |
| vote3 | plurality of s0, s1, s2; ties to the earliest | 3 |
| verify3 | s0 if accepted, otherwise s1 | 2 or 3 |
| vote5 | plurality of s0 to s4 | 5 |
| chain5 | s0 if accepted, otherwise s1 if accepted, otherwise s2 | 2 to 5 |

## Analysis set
Sizes where the accuracy of **single** is between 0.2 and 0.9. Outside that band a size is reported and excluded. If no size is in the band, P1 and P2 are *inconclusive*.

## Predictions and decision rules
Accuracy differences are per task, pooled over the analysis set, with a seeded bootstrap over tasks (4,000 draws).
- **P1 (H-M03), three calls.** *Supported* if the 95% interval of verify3 minus vote3 is above zero. *Refuted* if it is below zero. Otherwise *not supported*.
- **P2 (H-M03), five calls.** The same for chain5 minus vote5.
- **P3 (H-02), the verifier is specific.** *Supported* if the verifier accepts at least 90% of the correct answers the searchers gave.

Reported, not tested: verifier sensitivity on the searchers' own wrong answers and on the planted decoy, mean calls actually used by verify3 and chain5, the share of tasks where at least one of three samples is right.

## Stopping, budget
More than 10% invalid outputs in a wave stops the study. Provider integrity rules as in `tasks/I4-COVERT-PREREG.md`. One study under the [US$ redacted] study cap.

## Limits stated in advance
One model, one synthetic task whose answer can be checked completely from the input, so the verifier here is as well informed as it can ever be. Searcher and verifier are the same model under the same constraint, so their errors may be correlated; that is part of what is measured. Budget is matched in calls; a verifier call and a searcher call read the same records, so tokens are close but not identical. The difficulty of the task was not piloted: the band rule exists because V1 hit a floor.
