# V2 working-space dose: twenty words of working beat a vote of three by 0.38

Preregistration `tasks/V2-WORKING-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled, 540 requests, all succeeded and valid, none truncated. Usage estimate [US$ redacted] `summary.json` in this folder.

## Result

| Records | single | vote of 3 | w20 | w60 | w150 |
|---|---|---|---|---|---|
| 12 | 0.83 | 0.83 | 1.00 | 1.00 | 1.00 |
| 24 | 0.33 | 0.33 | 0.93 | 0.97 | 1.00 |
| 48 | 0.13 | 0.13 | 0.87 | 0.90 | 0.97 |
| analysis set (12 and 24) | 0.58 | 0.58 | 0.97 | 0.98 | 1.00 |

| Test | Verdict |
|---|---|
| P1 w60 beats the vote | **supported**: +0.40, interval 0.28 to 0.53 |
| P2 more working helps | **supported**: 0.58, 0.97, 0.98, 1.00 |
| P3 w20 beats the vote | **supported**: +0.38, interval 0.25 to 0.52 |

Working actually written: 18, 30 and 52 words on average for the 20, 60 and 150 limits. Mean output tokens: 13 per answer-only sample (39 for the vote), 91, 141 and 212 for the three doses.

## Reading

- The result of V1b carries over to a task that is not arithmetic. An agent with about twenty words of working was right on 0.97 of the analysis set; three agents without it, 0.58. At 48 records, outside the band, 0.87 against 0.13.
- The first words matter most: from nothing to 18 words gains 0.38; from 18 to 52 gains 0.03.
- Cost. The vote reads the records three times and writes 39 tokens; one agent with w20 reads them once and writes 91. Input dominates on this task, so the single agent with working is both cheaper and far more accurate.
- With V1b, M4 and M5: on tasks whose answer follows from the input, a collective of agents denied working space does not recover what one agent with a little working space gets. The swarm designs worth testing next are those where each agent already reasons, and the question becomes what coordination adds on top of that.

## Limits

One model, one synthetic task, an answer-only baseline that is artificially handicapped. The working field is inside a JSON answer; it is not the model's thinking mode. The task at 48 records was below the band for the baseline, so the comparison there is reported and not tested.
