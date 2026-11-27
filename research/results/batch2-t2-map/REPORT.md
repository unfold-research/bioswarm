# T2 stage B, the map: splitting the task among agents never beat one agent, and cost more everywhere

Preregistration `tasks/T2B-MAP-PREREG.md`. Run 2026-11-12: seven studies (`t2-map-solo`, `t2-map-reduce-k2|k4|k8`, `t2-map-board-k2|k4|k8`), 3,888 calls, Claude Haiku 5.5 with adaptive thinking at high effort in every call, no invalid and no cut reply, [US$ redacted] (shared ledger at [US$ redacted] of 50, nothing open). Analysis: `node observatory/batch2/t2-map/analyze.mjs` → `analysis.json` here.

M shards of a Silo-Bench instance are given to k agents, at least two shards each. Level I tasks: every agent reports a partial result and one merge call answers. Global Median: agents share a board for two rounds and answer in the third. Right answers out of 24, with mean total tokens per run in brackets:

| Task | Shards | k = 1 | k = 2 | k = 4 | k = 8 |
|---|---|---|---|---|---|
| I-01 Global Max | 4 | 24 (768) | 24 (2,186) | | |
| | 8 | 24 (1,082) | 24 (2,390) | 23 (3,597) | |
| | 16 | 24 (1,723) | 24 (3,067) | 24 (4,208) | 24 (6,696) |
| I-05 Range Count | 4 | 21 (1,715) | 20 (3,027) | | |
| | 8 | 19 (3,008) | 17 (4,372) | 17 (5,422) | |
| | 16 | 17 (5,400) | 15 (6,737) | 10 (7,966) | 14 (10,251) |
| I-06 XOR Checksum | 4 | 21 (2,926) | 18 (4,866) | | |
| | 8 | 15 (5,071) | 13 (7,051) | 18 (8,951) | |
| | 16 | 14 (9,481) | 11 (11,167) | 10 (13,520) | 8 (16,958) |
| III-22 Global Median | 4 | 24 (2,744) | 23 (19,019) | | |
| | 8 | 24 (5,488) | 23 (23,980) | 24 (41,272) | |
| | 16 | 23 (9,355) | 20 (34,549) | 23 (58,649) | 17 (119,021) |

**No cell is a fire cell.** In 11 of 12 task-size cells the best collective is at or below one agent. The exception, XOR at 8 shards with four agents (18 against 15), is inside the noise of 24 instances and is not repeated at 16.

| Prediction | Result |
|---|---|
| P1 a collective helps where one agent fell (Range Count and XOR at 16 shards, k = 4 minus k = 1) | **refuted**: −0.23 (−0.44 to −0.04) |
| P2 it does not help where one agent holds (Global Max, Global Median) | **supported** for every k: −0.03 (−0.07 to 0.00), −0.01 (−0.04 to 0.02), −0.13 (−0.25 to −0.02) for k = 2, 4, 8 |
| P3 at 4 shards two agents add nothing | **supported**: −0.05 (−0.14 to 0.02) |
| P4 the collective costs more per run on the negative controls | **supported** for every k: 1.8 to 7.5 times the tokens of one agent |

## Reading

- **Partition is the wrong collective for these tasks.** The prediction this map was built to confirm was the opposite of what happened. Where one agent had begun to fail, four agents holding a quarter each did worse, not better.
- **Why, in one line: an exact aggregate needs every part to be right.** Each agent's partial result is one more place to fail, and the merge cannot tell a wrong part from a right one. Taking one agent's share right on M/k shards as the chance that a part is right, the product over k parts gives, for Range Count, 0.77 for two agents on 8 shards (observed 0.71) and 0.63 on 16 (observed 0.63); for four agents on 16 it gives 0.59 where 0.42 was observed. One agent on the whole input does better than the product of its own parts would. This arithmetic was done after seeing the map and is descriptive.
- **The board is the expensive way to be no better.** On the median one agent is right on 71 of 72 for 2,700 to 9,400 tokens. The board costs 19,000 to 119,000 tokens and at eight agents is right on 17 of 24, with only 0.73 of the agents giving the right answer.
- **Cost per right answer favours one agent in all 12 cells**, by 1.3 to 13 times.
- **The single agent repeats, within noise.** On the 144 instances shared with the third gate it is right on 123 here and 123 there. But the outcome is the same on only 122 of them: on about one instance in seven the same request gives a different result. Counts in single cells above move by that much.

## What two attempts say (not registered, found after the run)

The third gate and `t2-map-solo` are two independent attempts of the same agent on the same 144 instances. Comparing their answers:

| | Instances | Same answer | Right when the same | Different answers | One of the two right |
|---|---|---|---|---|---|
| Range Count and XOR Checksum | 72 | 42 | 41 of 42 | 30 | 21 of 30 |
| Global Max and Global Median | 72 | 71 | 71 of 71 | 1 | 1 of 1 |

When two attempts agree the answer is right on 112 of 113. They disagree on 30 of 72 instances of the tasks that fall and on 1 of 72 of the tasks that do not. One attempt alone is right on 52 of 72 on the falling tasks.

This is the signal the design was looking for, and it came from the opposite collective. Disagreement between two attempts fires where one agent fails and stays quiet where it does not; and the errors of this agent are its own each time, not shared between attempts. That is the reverse of the earlier finding without thinking, where copies of one prompt returned the same wrong answer (V1b, correlation 0.79). It is a post hoc observation on 72 instances, one pair of attempts and one model. It is a hypothesis for the next study, not a result.

## What it means for T2

- On this benchmark, with this agent and these two regimes, the answer to "how many agents" is one, at every size tested. A trigger that decides the size of a partition has nothing to win here; the best one never fires. Stage C as designed, scoring triggers against this map, would only measure how much each trigger loses.
- The map moves the question from **how many agents share the task** to **how many times the task is done**. The stimulus that worked is disagreement between attempts, and the collective it calls for is repetition with a comparison, which is the "k independent attempts selected by a visible check" arm that `research/benchmarks/README.md` lists and this map did not have.
- The next study that follows is therefore a trigger study after all, on redundancy: one attempt; two attempts, accepted if they agree and repeated until two agree; a fixed three with the most common answer. The threshold trigger is the second, and it is predicted to cost about one attempt more than a single agent on the tasks that do not fall and to be right far more often on those that do.

Limits: one model, one wording, one effort level; one script per regime, and a better merge or a larger report could change the reduce arm; the two regimes are never compared on the same task; 24 instances per cell, with run-to-run flips on one instance in seven; algorithmic tasks without tools. The redundancy observation is unregistered.
