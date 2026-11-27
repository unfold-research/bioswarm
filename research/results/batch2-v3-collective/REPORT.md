# V3 a collective of agents that reason: voting helps, verifying helps more

Preregistration `tasks/V3-COLLECTIVE-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled: 540 + 127 requests, all succeeded and valid; 6 outputs hit the 512-token limit. Usage estimate [US$ redacted] `summary.json` in this folder.

## Result

All three sizes fell in the registered band (90 tasks).

| Records | single | vote of 3 | vote of 5 | verify3 | deep (1 call, 150 words) | any of 5 right |
|---|---|---|---|---|---|---|
| 48 | 0.83 | 0.97 | 0.97 | 0.97 | 0.97 | 0.97 |
| 96 | 0.67 | 0.70 | 0.70 | 0.83 | 0.97 | 0.93 |
| 144 | 0.50 | 0.60 | 0.67 | 0.67 | 0.63 | 0.87 |
| all | 0.67 | 0.76 | 0.78 | 0.82 | 0.86 | 0.92 |

| Test | Verdict |
|---|---|
| P1 (H-01) a vote helps agents that reason | **supported**: +0.09, interval 0.02 to 0.17 |
| P2 (H-M03) verifying beats voting at three calls | **supported**: +0.07, interval 0.02 to 0.12 |
| P3 reasoning agents differ | **supported**: more than one answer among five samples on 60% of tasks (9% for answer-only agents in M4) |
| P4 more individual reasoning beats the vote | **not supported**: +0.10, interval 0.00 to 0.20 |

Verifier with working space: accepted 76 of 77 correct answers, rejected 41 of 50 wrong ones. Mean output tokens: 145 per searcher sample, 364 for the deep searcher, 188 per verifier call.

## Reading

- This is the first run in which a collective beat its own member, and the first support for H-M03 as stated. Both needed the agents to have working space: then samples differ, a vote has something to aggregate and a verifier has something to choose between.
- The order at three calls is verify (0.82) over vote (0.76) over single (0.67). Two more voters added 0.02.
- One agent with more working (0.86 in one call) was level with or ahead of every collective, but the interval touches zero and at 144 records it fell to 0.63, below vote5 and verify3. Six truncated outputs are in that arm's neighbourhood: the 512-token limit may have capped it.
- In 92% of tasks at least one of five samples was right; the best strategy reached 0.82. The gap is selection, not generation: a verifier applied to all five would be the next thing to try.

Taken with V1b, M4, M5, V2 and M6: a collective of agents without working space adds nothing; working space for one agent is the largest single gain; on top of that a collective adds a smaller, real gain, and verification is the better way to spend it.

## Limits

One model, one synthetic task, copies of one prompt. Thirty tasks per size. The deep arm and the collectives are not matched in tokens: deep reads the records once and writes 364 tokens; verify3 reads them two or three times and writes about 480.
