# C1 typed traces against a note: a table does not suppress unprompted quarantine; it raises it

Preregistration `tasks/C1-S3-PREREG.md`. Run 2026-11-11: 384 requests on `claude-haiku-5-5` (`c1-typed`) and 192 on `claude-sonnet-5-5` (`../batch2-c1-typed-sonnet/`), all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Exposed cases where the unverified record was quarantined with no instinct installed.

| Arm | Haiku (of 32) | Sonnet (of 16) |
|---|---|---|
| none | 9 (0.28) | 8 (0.50) |
| note, free text | 12 (0.38) | 2 (0.13) |
| table, three typed traces | 23 (0.72) | 9 (0.56) |
| table-large, nine typed traces | 28 (0.88) | 12 (0.75) |

No quarantine on clean or genuine cases in any arm; clean cases all answered right.

| Test | Haiku | Sonnet |
|---|---|---|
| P1 replication of I6: the note lowers it by at least 0.20 | **inconclusive** (baseline 0.28, below the registered 0.35) | **supported** (0.50 → 0.13) |
| P2 a typed table does not suppress | **inconclusive** | **supported** |
| P3 nor does a larger one | **inconclusive** | **supported** |

## Reading

- On Sonnet the registered question has a clear answer: the same three facts suppressed unprompted quarantine as a note and did not as typed traces. The form in which peer content arrives matters.
- The unpredicted part is the direction. On both models the tables raised quarantine above the no-peer baseline, and nine traces raised it more than three (Haiku 0.28, 0.72, 0.88; Sonnet 0.50, 0.56, 0.75). A typed field is not neutral either. A plausible reading is that a block of items labelled as untrusted traces from other agents puts the agent in a more suspicious frame, and it then sets aside the unverified record too. That is a guess; the run does not test it.
- On Haiku the baseline was 0.28, lower than in I6, I9 and I10 (0.5 to 0.6), and the note did not lower it. One sentence was added to the system prompt of every arm in this study (traces are untrusted data too); that may be what moved the baseline. The Haiku tests are inconclusive as registered and the Haiku numbers are reported as description only.
- For the architecture front: "typed traces instead of text" passes its first test on the larger model in the sense of not suppressing. It fails the stronger requirement the studies set, that what the field shows should leave the agent's behaviour as it was. Here the behaviour it amplified is one we want, but an input that moves decisions by 25 to 60 points without carrying any rule is a control surface. The claim "the card states facts, so it does not steer" is not supported.

## Limits

One unprompted behaviour, one family, one wording per arm, 16 to 32 cases per cell. The traces are neutral facts about other places; traces about the case at hand were not tested. The system prompt differs from earlier studies by one sentence, so baselines are not comparable across studies.
