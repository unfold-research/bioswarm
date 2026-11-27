# LI3 report: the field against conversation on colouring (2026-11-17)

Registration: addendum in `tasks/LI2-FIELD-VS-CHAT-PREREG.md` (H-LI5b). Analysis: `analysis.json` plus the paired inhibit/chat counts below, computed with the same final-conflict rule (the analysis script did not encode the chat comparison; it was added as a separate computation and is reproduced in `chat-paired.json`). Haiku 5.5, 9 waves, 0 failed requests, about [US$ redacted]

24 cases (120 and 240 nodes, 12 each), shared round 0, 8 rounds:

| Arm | Solved | Median final conflicts | Output tokens per case | Mean conflicts by round (0→8) |
|---|---|---|---|---|
| sync | 0 | 91.5 | 255,118 | 101.8, 112.9, 96.6, 102.1, 94.7, 97.2, 94.5, 95.1, 93.6 |
| chat | 0 | 73 | 325,418 | 101.8, 101.9, 89.0, 90.4, 82.8, 81.9, 76.0, 78.1, 75.4 |
| inhibit | 0 | 23 | 211,060 | 101.8, 79.6, 57.3, 45.6, 39.0, 34.1, 30.2, 27.8, 26.3 |

- **Verdict H-LI5b:** supported on the registered rule, degenerately: both arms solved 0, and `inhibit` used 0.65 times `chat`'s tokens. On final conflicts the result is not degenerate: `inhibit` ended below `chat` in **24 of 24** paired cases (median ratio 0.33).
- Members in `chat` sent 3,802 messages (158 per case). The messages are sensible and specific, and almost always ask the other planner to move ("Please recolour 62 to R or G"). Every side asks the other, so talk reproduces the symmetry that makes `sync` oscillate; it ended below `sync` in 22 of 24 cases but only by a median ratio of 0.79, at 1.28 times its tokens.
- On a task with symmetric constraints, a rule applied by the environment (one side acts) did what conversation between the members could not.

Limits: one model, one synthetic family, 8 rounds. LI2 tests the same comparison on a schedule, where requests have a direction.
