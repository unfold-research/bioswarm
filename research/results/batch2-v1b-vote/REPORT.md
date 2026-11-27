# V1b voting on a climbable ladder: errors are shared, votes add little, working space solves the task

Preregistration `tasks/V1B-VOTE-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled, 1,536 requests, all succeeded and valid, none truncated. Usage estimate [US$ redacted] `summary.json` in this folder.

## Result

Single-sample accuracy / plurality of 5 / intraclass correlation of correctness, per level (16 tasks each).

| Operations | ident | present | strategy | work (1 sample) |
|---|---|---|---|---|
| 2 | 1.00 / 1.00 / – | 1.00 / 1.00 / – | 1.00 / 1.00 / – | 1.00 |
| 3 | 0.90 / 0.94 / 0.65 | 0.96 / 1.00 / −0.04 | 0.75 / 0.81 / 0.67 | 1.00 |
| 4 | 0.43 / 0.44 / 0.87 | 0.45 / 0.44 / 0.37 | 0.43 / 0.50 / 0.59 | 1.00 |
| 5 | 0.15 / 0.19 / 0.51 | 0.20 / 0.31 / 0.41 | 0.13 / 0.19 / 0.49 | 1.00 |
| 6 | 0.21 / 0.19 / 0.85 | 0.18 / 0.25 / 0.61 | 0.16 / 0.19 / 0.68 | 1.00 |
| 8 | 0.06 / 0.06 / 1.00 | 0.09 / 0.06 / 0.45 | 0.06 / 0.06 / 1.00 | 1.00 |

Analysis set by the registered band: 3, 4 and 6 operations (48 tasks).

| Test | Verdict |
|---|---|
| P1 (H-01) errors are shared | **supported**: correlation 0.79 for identical samples |
| P2 (H-15) prescribed strategies lower it | **not supported**: 0.65, interval of the difference −0.13 to 0.35 |
| P2p (H-15) different wordings lower it | **supported**: 0.31, interval 0.17 to 0.68; plurality 0.56 against 0.52 |
| P3 (H-10) no gain from voting where the agent is usually wrong | **supported** on all four such levels |
| P4 working space against votes | **supported**: 48 of 48 against 0.56 for the best vote |

## Reading

- Whether a sample is right is mostly a property of the task: identical samples agree in being right or wrong. Five votes moved accuracy from 0.51 to 0.52.
- Rewording the task lowered the correlation; telling the agent how to compute did not. The gain in accuracy from rewording was still small (0.52 to 0.56).
- One sample allowed 60 words of working was right on 96 of 96 tasks, at a mean of 60 output tokens. Five answer-only samples cost 45. For this task, spending the same budget on individual reasoning dominates spending it on a collective of constrained agents. This is the comparison the thesis asks for, and here it goes against the swarm.

## Limits

Arithmetic, one model. The answer-only constraint is artificial: it creates the errors that voting then fails to fix. The fair statement is narrow: votes do not substitute for working space. Level 5 fell just under the band (0.15) and is excluded as registered. The work arm is at ceiling, so it shows that the task is easy with working, not how much working is needed.
