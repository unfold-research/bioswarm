# T2 stage A, the calibration gate: one Haiku agent is at the floor at every size, so the gate does not open

Preregistration `tasks/T2A-GATE-PREREG.md`. Run 2026-11-12: study `t2-gate`, 240 requests in one wave, Claude Haiku 5.5 with thinking disabled, no invalid and no cut reply, [US$ redacted] (shared ledger at [US$ redacted] of 50). Analysis: `node observatory/batch2/t2-gate/analyze.mjs` → `analysis.json` here.

One agent receives every shard of a Silo-Bench instance and has to give the exact integer. Five tasks, 12 instances per cell.

Right answers out of 12:

| Task | 16 shards | 64 | 256 | 1,024 |
|---|---|---|---|---|
| I-02 Word Frequency | 1 | 0 | 0 | 0 |
| I-05 Range Count | 1 | 0 | 0 | 0 |
| I-06 XOR Checksum | 0 | 0 | 0 | 0 |
| III-22 Global Median | 1 | 1 | 0 | 1 |
| III-26 Global Distinct | 0 | 1 | 0 | 0 |
| **All, of 60** | **3 (0.05)** | **2 (0.03)** | **0** | **1 (0.02)** |
| Mean input tokens | 1,502 | 4,859 | 19,420 | 77,785 |
| Mean output tokens | 804 | 203 | 110 | 118 |

| Registered rule | Result |
|---|---|
| small: the largest size at 0.9 or above | **none** |
| Outcome | **the instrument is revised; T2 does not proceed on this result** |

## Reading

- **The smallest size was already too large.** The design assumed the agent would be near ceiling at 16 shards (about 400 items, 1,500 tokens) and would fall from there. It is at 0.05. The published single-agent figure for open-weight models starts at 96.7% at the benchmark's smallest input, which is two shards; our range began eight times above that.
- **At 16 shards the agent does the work and miscounts.** It tallies shard by shard in its working space and the total is off: Range Count 171 against 186 in the first instance. 8 of 60 answers are within 2 of the truth.
- **From 64 shards up it does not attempt the work.** Output falls from 804 tokens to about 110 while the input grows fifty times and 8,192 output tokens are available. The working space says the exact count is not feasible and the answer is an estimate. Counted after the fact with a word match on the working text (not registered, crude): 15 of 60 replies declare an estimate at 16 shards, 44 at 64, 58 at 256, 59 at 1,024 (`declared-estimate.json`).
- **This is the shape of T1 again.** There the model stopped re-counting early; here it stops before starting. A larger job is met with less work, not more.
- **The declared estimate is a candidate stimulus.** The agent says, in its own output, that it did not do the task. That is a signal a threshold trigger can read for free, and it was not in the design.
- The few right answers at large sizes are guesses that landed: the median of uniform values is near 500, and one instance had exactly that.

## What it means for T2

Nothing is learned yet about whether a trigger pays, in either direction. The gate asked whether one agent degrades with input size, and the answer is that this agent, set up this way, is not working at any size tested. Three revisions are possible, and they are different studies:

| Revision | What it tests | Cost |
|---|---|---|
| Smaller sizes, 1 to 8 shards, same agent | where this agent is at ceiling and where it falls; keeps one variable changed | about [US$ redacted] |
| Thinking enabled, same sizes | whether a stronger single agent removes the floor; it is the fairer "one agent with the whole budget" | a few US$, to be measured |
| Sonnet as the agent | the same question with the larger model | about twenty times the Haiku cost |

Limits: one model, one wording, thinking disabled, 12 instances per cell. The estimate count is a word match written after seeing the outputs.

## Correction to the cost (2026-11-12)

Twelve requests, the I-02 instances at 1,024 shards, carry more than 100,000 input tokens (about 110,700 each). Haiku 5.5 is priced five times higher above 100,000 input tokens, and the runner's price table has only the base rate. Priced at the long-prompt rate those twelve cost about [US$ redacted] more, so this study cost about [US$ redacted] not 0.33, and the shared ledger is low by the same amount. No later study has a request above 100,000 input tokens. The runner should refuse or reprice such requests before any study of that size is frozen again.
