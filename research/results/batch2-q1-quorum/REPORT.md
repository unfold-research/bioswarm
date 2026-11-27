# Q1 quorum as a stopping rule: it buys the accuracy of seven votes for two to three calls, and one agent with more working space beats it for a third of the tokens

Preregistration `tasks/D5-Q1-PREREG.md`. Run 2026-11-12: `q1-quorum-search` and `q1-quorum-count`, 2,700 calls each on `claude-haiku-5-5` with thinking disabled, no invalid or truncated reply. Usage estimate [US$ redacted] and [US$ redacted] Analysis: `node observatory/batch2/q1-quorum/analyze.mjs` → `summary.json` here.

Per task: seven independent agents with 20 words of working, one agent with 60 words, one with 150. Votes and quorums are computed from the seven answers in order; tokens are the returned usage of the calls an arm used. 300 new tasks per family.

| Arm | Search: right | agents | tokens | Count: right | agents | tokens |
|---|---|---|---|---|---|---|
| single (20 words) | 0.85 | 1 | 2,638 | 0.70 | 1 | 2,928 |
| vote of 3 | 0.88 | 3 | 7,917 | 0.74 | 3 | 8,786 |
| vote of 5 | 0.88 | 5 | 13,196 | 0.74 | 5 | 14,642 |
| vote of 7 | 0.89 | 7 | 18,471 | 0.74 | 7 | 20,499 |
| quorum of 2 | 0.88 | 2.19 | 5,910 | 0.75 | 2.16 | 6,422 |
| quorum of 3 | 0.88 | 3.40 | 9,286 | 0.74 | 3.29 | 9,819 |
| one agent, 60 words | 0.92 | 1 | 2,703 | 0.83 | 1 | 3,045 |
| one agent, 150 words | 0.96 | 1 | 2,802 | 0.95 | 1 | 3,183 |

The seven samples gave a single answer on 59% of search tasks and 73% of count tasks.

| Test | Search | Count |
|---|---|---|
| Q1 a quorum of 3 reaches the accuracy of 7 votes for fewer calls | **supported**: −0.01 (−0.02 to 0.00), 3.4 agents | **supported**: 0.00 (−0.01 to 0.02), 3.3 agents |
| Q2 a higher quorum is more accurate | **not supported**: +0.01 (−0.01 to 0.03) | **not supported**: 0.00 (−0.03 to 0.02) |
| Q3 one agent with 60 words beats the quorum of 3 | **not supported**: +0.04 (0.00 to 0.08) | **supported**: +0.08 (0.04 to 0.13) |
| Q4 sampling seven agents helps at all | **supported**: +0.04 (0.01 to 0.08) | **supported**: +0.04 (0.01 to 0.07) |

In Q3 the deeper agent spent 2,703 and 3,045 tokens against 9,286 and 9,819 for the quorum: it is the cheaper arm by a factor of three, so where it is ahead it is ahead at lower cost, and where the interval touches zero it is level at lower cost. Against the quorum of 2 it is ahead in both families (+0.05, 0.01 to 0.09; +0.08, 0.04 to 0.12) at half the tokens. One agent with 150 words is 0.07 and 0.21 above seven votes.

## Reading

- **The quorum works as a stopping rule.** Stopping at the second matching answer gives the accuracy of seven votes with 2.2 agents; a third match adds nothing. This is the speed side of the speed-accuracy trade the mechanism is known for, and it holds here because most tasks get the same answer from every sample.
- **Sampling more agents does help a little.** Seven votes are 0.04 above one agent in both families, with intervals above zero. REP1 found +0.02 and +0.01 for three votes, not separable from zero. The honest summary of the two samples of 300 is a gain of 0.01 to 0.04 from voting among agents that reason, for three to seven times the tokens. "No gain" was too strong; "a small gain at a large cost" is what the data says.
- **It is the wrong purchase on these tasks.** Almost every token is the input: 150 words of working add 6 to 9% to the cost of a call and 0.11 to 0.25 to its accuracy, while a second sample repeats the whole input for 0.03. As long as the task fits one context and reading dominates the cost, depth is nearly free and redundancy is not.
- **Agreement with the T2 redundancy study** (`results/batch2-t2r/REPORT.md`, another session, agents with reasoning at high effort on a different task): there too, repeating until two attempts agree matched or beat fixed votes at about 2.2 attempts. That study has no deeper-agent arm because its single agent already reasons; ours shows that when a shallow agent can be made deeper, that comes first.

## Limits

Two synthetic task families that fit one context; one small model with reasoning disabled; quorum arms share their first samples by construction; the deeper agent's advantage is specific to tasks whose cost is dominated by input. A quorum over options of unequal quality with noisy evaluation, the setting of nest-site selection, is not tested: here the "options" are answers to a question with one right answer.
