# BSH8 · Blinded discovery pilot

Two isolated three-role Hermes teams tackled the same novel simulated cold-room inspection problem. Twelve drifting sensors, two recalibrations per time step, 120 steps. Each team designed a six-weight ranking policy. One team received a social-insect response-threshold cue. Both used GPT-6-Luna flex, up to 2048 output tokens per role, three submissions, [US$ redacted] ceiling and a shared 720-second deadline. Source of development feedback and scoring are identical. Three role calls hand off their prior policies and feedback. The selection rule uses lowest development loss. The judge receives only numerical weights, anonymous identifiers and 90 sealed seeds. Aggregate gain is relative to oldest-first, on the sum of hidden residual drift. Positive is better.

| Cue | Role | Seconds elapsed | Hidden gain | Selected by development | Weights |
|---|---|---:|---:|---|---|
| Biological | 1 | 52.6 | 5.704% | False | [1.0, 0.55, 0.6, 0.3, 0.35, 0.45] |
| Biological | 2 | 91.4 | 3.513% | False | [1.0, 0.55, 0.65, 0.55, 0.65, 0.35] |
| Biological | 3 | 142.1 | 4.888% | True | [1.0, 0.55, 0.65, 0.45, 0.55, 0.45] |
| Control | 1 | 41.8 | 3.751% | False | [4, 2, 2.5, 2.5, 2, 1.5] |
| Control | 2 | 78.5 | 5.832% | True | [4, 2.5, 2, 2, 2.5, 2] |
| Control | 3 | 110.6 | 5.832% | False | [4, 2.5, 2, 2, 2.5, 2] |

Biological: [US$ redacted], 6412 tokens, 4 HTTP attempts. Selected mean loss by regime: 729.97, 970.60, 1023.25.


Control: [US$ redacted], 5585 tokens, 3 HTTP attempts. Selected mean loss by regime: 734.59, 964.80, 997.40.


The cue team crossed 5% on its first submission (52.6 s), 25.9 s before the control (second submission at 78.5 s). The policy selected on development ultimately improved hidden loss by 4.89% with the cue and 5.83% without it. The first cue policy had scored 5.70% hidden, but that score was unavailable during selection. The control finished all three submissions sooner. One retry occurred in the cue arm. Timings include service latency. Paired exposure to the same environments does not replicate the discovery teams.

Oldest-first mean residual drift: 954.604. Hidden score SHA-256: `fe7344beeb9f9d230d52665510fc057a3b806d0f2167a114b3f90b7d97a3dd55`. Hidden seed commitment: `46ae7193fa0e23b07b5cce842410dea8a23e2dddcd809a664ea0b0d788640b25`. The threshold for time-to-solution was 5% gain. Elapsed time includes inference and shared infrastructure. Results describe one task and one team per condition; hidden seeds test policy performance, not replication across teams. The simulator fixes the policy class and the cue includes task-relevant direction. No claim about human teams or general discovery advantage. Benchmark baseline and weights can be independently rescored from the private manifest.
