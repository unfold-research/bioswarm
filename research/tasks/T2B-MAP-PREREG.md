# T2 stage B preregistration: the map (2026-11-12)

Registered before any paid call of these studies. Owner instruction of 2026-11-12 ("Sim, roda o mapa"), within the standing authorisation for the shared ledger. Design: `tasks/T2-TRIGGER-DESIGN.md`; gates: `results/batch2-t2-gate*/REPORT.md`. Code: `observatory/batch2/t2-map/protocol.mjs`, seven studies `t2-map-solo`, `t2-map-reduce-k2|k4|k8`, `t2-map-board-k2|k4|k8`, analysis `observatory/batch2/t2-map/analyze.mjs`.

## Question
When a task of M shards is given to k agents instead of one, how often is the answer right and what does it cost? The number of agents is fixed in each study. Nothing here decides it: the map is what a trigger will later be scored against (stage C).

## Setting
- **Agent**, in every call of every arm: Claude Haiku 5.5, adaptive thinking, effort high, 16,000 output tokens, no tools. The third gate settled it.
- **Tasks:** the four of the third gate. I-05 Range Count and I-06 XOR Checksum fell with size there; I-01 Global Max and III-22 Global Median did not and are the negative controls.
- **Sizes:** 4, 8 and 16 shards. 32 was planned and is dropped: Global Max fails the leak probe there (the most common answer is right on 0.30 of instances).
- **Instances:** 24 per cell, from the same generator, commit and seeding rule. The first 12 of each cell are the instances of the gates. 288 instances.
- **Arms:** k = 1, 2, 4, 8. An agent of a collective holds at least two shards: k = 2 at 4, 8 and 16 shards, k = 4 at 8 and 16, k = 8 at 16.
- **Regime**, fixed and scripted (`observatory/batch2/silo/regimes.mjs`):
  - level I tasks, *reduce*: every agent reports a partial result of its shards in at most 400 characters; one merge call answers. k + 1 calls.
  - III-22, *board*: every agent posts a note of at most 1,200 characters, reads all notes, posts again, reads all notes and answers. The collective's answer is the one most agents give; a tie is no answer. 3k calls.
- **Cost** of a run is every billed token of every one of its calls, from the runner's ledger.

## Predictions and decision rules
Share right, paired by instance, bootstrap of 4,000 draws; *supported* if the 95% interval is above zero, *refuted* if below, unless stated.
- **P1, a collective helps where one agent fell**: on Range Count and XOR Checksum at 16 shards, k = 4 minus k = 1 (48 instances).
- **P2, and does not help where one agent holds**: on Global Max and Global Median, over all sizes, each k above one minus k = 1; *supported* for a k unless its interval is above zero.
- **P3, at the size where one agent is at the ceiling a collective adds nothing**: at 4 shards, all four tasks, k = 2 minus k = 1 (96 instances); *supported* unless the interval is above zero.
- **P4, the collective costs more per run than one agent on the negative controls**: ratio of mean total tokens, k above one over k = 1, on Global Max and Global Median; *supported* for a k if the ratio is above one at every size. No interval.

## Reported
The map: for every task, size and k, share right, mean total tokens (input and output), cost per run and cost per right answer. For every task and size, the best k and whether the cell is a **fire cell** (the best k above one beats k = 1 by 0.15 or more) or a **quiet cell**; cells within 0.05 of that line are marked. Agreement of k = 1 with the third gate on the 12 shared instances per cell. For the board regime, the share of agents that give the right answer. Replies cut at the output limit.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study; a cut reply is wrong and not invalid. Any missing, duplicated, failed or unpriced provider result stops that study with its reservation kept; the others continue. No request is resubmitted. Each study is under the [US$ redacted] cap of `observatory/batch2/run2.mjs` and all seven reserve under the [US$ redacted] left in the shared ledger (cap [US$ redacted]). The reserve assumes every reply uses all 16,000 output tokens; the third gate used about a tenth of its reserve. No request comes near 100,000 input tokens, where the runner's prices would be wrong; the runner now refuses such a request.

## Limits stated in advance
- One model, one wording, one effort level.
- The regime is one script per level. A better script would move the map. In particular the merge call of *reduce* is a single agent reading k short reports, and the 400-character report is a limit a different design might not have.
- The two regimes are not compared with each other: level I tasks run only under *reduce* and the median only under *board*. The map speaks about size, not about coupling.
- Thinking gives every call up to 16,000 output tokens, so a collective of k has k times the working space of one agent. The token ledger shows that and does not equalise it; share right is reported next to cost for that reason.
- 24 instances per cell: about ±0.2 on a share in one cell. The registered tests pool cells; single cells are descriptive.
- Algorithmic tasks without tools. An agent with a code tool solves them at any size.
