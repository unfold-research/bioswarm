# T2 design: the trigger as recruitment (2026-11-12)

A design, not a preregistration of the whole study. The owner settled the three decisions at the end on 2026-11-12; stage 0 is written (`observatory/batch2/silo/`) and stage A is preregistered on its own (`tasks/T2A-GATE-PREREG.md`). Stages B and C are preregistered after stage A returns, with its measured tokens. It answers question P-4 of `unfold-ai-labs/plan` (`ABERTAS.md`): fixed size, central decision or recruitment by threshold.

## Why
T1 (`results/batch2-t1-trigger/REPORT.md`) isolated one decision, when to stop, on a synthetic field: a model stops early, a threshold rule of a few lines does better, and the larger model decides no better. It did not test the decision the product has to make, which is how many agents a task gets. It also could not price a miss, and it ran on the toy field the owner retired on 2026-11-12.

T2 moves the trigger to a published benchmark and to the size decision. It needs a task family where firing is sometimes right and sometimes wrong, or the best trigger is trivially "never" or "always". CooperBench does not give that today: pairs are reported about 30% below solo, so "never" would win. Silo-Bench does, on paper: its single agent with the full input falls as the input grows.

## Benchmark
Silo-Bench (Zhang et al., arXiv 2603.01045 v2, ACL 2026 main; code `jwyjohn/acl26-silo-bench`, The Unlicense). Read for this design at the paper's HTML and the repository README; the code was not run.

| Fact | Source | Bearing on T2 |
|---|---|---|
| 30 algorithmic tasks with exact answers, 10 per level: I aggregation, II mesh, III global shuffle | README, §3.1 | level is the **coupling** axis |
| The generator scales the whole input with N and keeps each shard constant (shard 45 to 1,856 tokens, mean 312) | §3.2, Table 6 | input size is the **coverage and depth** axis |
| The N = 1 agent with the full input degrades: level I 96.7% to 20.0%, level II 90.0% to 13.3%, level III 80.0% to 10.0% from the smallest to the largest input (GPT-OSS-120B) | Table 2 | the only published case with headroom above one agent |
| Collectives fall with N: 61.2% at 2 agents to 18.1% at 100 (DeepSeek-V3.1); level III is 0% at 50 agents and above | Tables 1, 3 | firing is often wrong: the negative half exists |
| Three open-weight models, no closed model; every configuration run once | §4.1, App. C.2 | nothing is known for Claude; seed variance is ours to measure |
| Its token metric counts output tokens only | Eq. 4 | we do our own accounting |

Two things the benchmark does not have and T2 adds. It ties the number of agents to the number of shards; T2 separates them, so that **M** shards can be given to **k** agents (M/k shards each) and k = 1 is the single agent with everything. And it has no matched-cost accounting; T2 counts every billed token of every arm, decision calls included.

Tools are off in every arm. An agent with a code tool solves these tasks alone at any size; the tasks stand in for work that has no such shortcut.

## Stages

**State, 2026-11-12:** stage A ran and the gate did not open. One Haiku agent without thinking is at 0.05 at the smallest size and declares an estimate instead of working from 64 shards up (`results/batch2-t2-gate/REPORT.md`). Stages B and C wait for a revised gate.

A second gate from 1 to 16 shards found the curve: 0.79, 0.65, 0.46, 0.38, 0.27 (`results/batch2-t2-gate-small/REPORT.md`). The range where size matters for this model is 1 to 16 shards, so the map belongs there. The agent is not at 0.9 on one shard; the registered next step is the same gate with thinking enabled, with the decision taken per task and not on a pooled share.

The third gate, with thinking, opened (`results/batch2-t2-gate-think/REPORT.md`): one agent is right on 1.00, 0.92, 0.96, 0.83 and 0.77 from 1 to 16 shards. Range Count and XOR Checksum fall inside the range; Global Max and Global Median are quiet. What this fixes for stages B and C, replacing the numbers below: the agent in every arm is Haiku with adaptive thinking at high effort; four tasks, two that fall and two negative controls; sizes 4 to 32 shards; more than 12 instances per cell. Level III has no falling task, so the map speaks about size and not about coupling.

**The map returned (`results/batch2-t2-map/REPORT.md`) and changes stage C.** No cell is a fire cell: a partition of the task among agents is at or below one agent everywhere and costs more. Scoring size triggers against this map would only rank losses, so stage C as written below is not run. What the map found instead is a stimulus: two independent attempts of one agent disagree where the agent fails and agree where it does not (unregistered, 144 instances). The trigger study that follows is on redundancy, how many times the task is done, with disagreement as the threshold stimulus. The stage C text below is kept as the record of the original design.

**The redundancy study returned (`results/batch2-t2r/REPORT.md`).** The three ways of deciding were compared on five independent attempts per instance. Threshold (repeat until two attempts share an answer): 0.96 right with 2.24 attempts. Fixed: 0.93 with three, 0.94 with five. Central (a judge of the first reply): 0.89. The threshold is the most accurate and cheaper than any fixed size above one, and the judge accepted 31 of 37 wrong first attempts. With the map, the answer this line gives to question P-4 on this benchmark is: the trigger is a threshold on disagreement, and what it unfolds is attempts, not parts.

**Stage 0, free. Done 2026-11-12** (`observatory/batch2/silo/README.md`). Instances exported from the unmodified generator at commit `e741277`, reseeded per instance because the benchmark has one instance per size. Split of M shards over k agents, the two regimes, grading and a token ledger by run. The leak probe here is a prior-guess probe: a task is dropped if the most common answer of a cell is right on more than 0.2 of 200 instances. It dropped Global Max (the maximum saturates at 1000) and Graph Components, and size 4.

**Stage A, calibration gate.** One Haiku agent with working space, k = 1, on five tasks at four input sizes (16, 64, 256 and 1,024 shards): I-02, I-05 and I-06 of level I, III-22 and III-26 of level III, the first per level with an integer answer that pass the leak probe. Level III has two because no third one qualifies. The gate chooses three sizes M: small, where the agent is at 0.9 or above; large, where it is at 0.6 or below; and one between. The generator fixes the length of a shard, so the input grows only through the number of shards and the largest size is set by the request ceiling. If no size brings the agent to 0.6 over all tasks and on at least two tasks alone, **T2 is not run**: the result is that this benchmark has no headroom above one Haiku agent, and it is reported as such. Stage A also measures tokens per run, which replaces the cost estimate below.

**Stage B, the map.** Fixed k in {1, 2, 4, 8} on 5 tasks × 3 sizes × 12 instances: 180 instances, 720 runs, one submission per k. The regime for k above one is fixed and scripted, so that T2 isolates the size decision as T1 isolated the stopping decision: on level I each agent reduces its shards and one merge call combines the partials; on level III agents post to a shared board for two rounds and answer in the third, the round-synchronous form of the benchmark's shared file protocol, and the collective's answer is the one most agents give (`observatory/batch2/silo/regimes.mjs`). The map is itself a result: accuracy and tokens by coupling, size and k on Claude, with twelve instances where the paper has one.

The first four instances of every cell are **calibration**, the other eight are **test** (120 test instances). A cell is a **fire cell** if on its calibration instances the best k above one beats k = 1 by 0.15 or more, and a **quiet cell** otherwise. Small sizes are the negative controls: a trigger is only shown to work if it stays quiet there.

**Stage C, triggers.** Every trigger is scored by looking up, for each test instance, the stage B run of the k it chose. Only the decisions cost new calls.

| Trigger | Kind | Decides from |
|---|---|---|
| never (k = 1), always (k = 8) | fixed | nothing |
| best fixed k per cell | reference | calibration instances; the ceiling a start-time trigger can reach |
| size rule | threshold, at the start | input tokens: k = 1 below a threshold T, otherwise the smallest k that puts each agent below T; T fitted on calibration instances |
| central, Haiku and Sonnet | central, at the start | the task statement, input tokens and shard count, the same information as the size rule; answers k |
| escalate on rejection | threshold, after one attempt | k = 1 runs; a verifier with working space reads the answer and s sampled shards; on rejection the collective at the size rule's k replaces the answer. Sweep s in {2, 4, 8} |
| escalate on disagreement | threshold, after one attempt | a second k = 1 attempt with another wording; fire if the answers differ |
| escalate by chance | null | fires at the rejection trigger's rate in the same cell |
| always escalate | reference | k = 1 then the collective; the spend ceiling of escalation |

Escalation is the one-step form of "one agent starts and others are recruited when a stimulus passes a threshold". It also covers batch A1 of the queue (verifier, size rule, disagreement or chance at the same share), which is folded into T2.

## Predictions and decision rules
On the 120 test instances, paired by instance, bootstrap (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below, unless stated. They restate the three candidate statements of `programs/historical/trigger.md`.

- **P1, a threshold trigger fires where it should**: on fire cells, escalate on rejection (s = 4) minus never, in share right.
- **P2, and stays quiet where it should not**: on quiet cells, its firing rate; *supported* if the upper end of the 95% interval is below 0.20. Tokens against never are reported.
- **P3, a central trigger is not better than the rule given the same signals**: central Sonnet minus size rule over all test instances; *supported* unless the interval is above zero. P3haiku likewise. Tokens, with decision calls, are reported for both.
- **P4, the stimulus carries information**: escalate on rejection minus escalate by chance, at the same firing share.
- **P5, disagreement between copies is a weak stimulus**: escalate on disagreement minus escalate by chance; *supported* unless the interval is above zero (V1b: errors of identical samples correlate at 0.79).
- **P6**: k = 1 at 0.9 or above at the small size on every task.

Reported for every trigger, per cell and overall: share right, total tokens, tokens per right answer, firing rate, regret against the best fixed k, and the **break-even price of a miss**: the value of one right answer, in tokens, above which the trigger is preferred to never. T1 left that price unset; T2 reports it so the product can choose.

## Stopping, budget
The rules of `tasks/BATCH-QUEUE.md`. Each submission under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared ledger (cap [US$ redacted]; [US$ redacted] reconciled on 2026-11-12, so [US$ redacted] remain). Rough estimate, not measured: the map on Haiku [US$ redacted] to 5, stage A and the triggers under [US$ redacted] each, Sonnet used for decisions only. The same map on Sonnet would be about twenty times that and is outside this design. Stage A's measured tokens replace this estimate before stage B is frozen, and stage B is not submitted if the projection passes [US$ redacted]

## Limits stated in advance
- Triggers act at the start or after one attempt. Recruitment in the middle of the work, with the newcomer reading the field, and contraction when the stimulus falls cannot be scored from a map. That is T3, and it is the part that tests "leaderless" hardest.
- The regime is fixed and scripted. A better regime would move the map and the fire cells with it.
- Algorithmic tasks without tools. Whether the map carries to coding or research tasks is question C-7 and stays open.
- The map is on one small model. The published degradation of the single agent is for open-weight models; it may not appear on Claude, which is what stage A is for.
- Fire and quiet cells are defined on four instances per cell. A cell near the 0.15 line can be misfiled; cells within 0.05 of it are reported separately.
- About 120 test instances: roughly ±0.09 on a share overall, wider within fire or quiet cells. Only large effects are detectable.
- The predictions are written with T1, R2b, M6 and V1b already known; P3 and P5 are expectations carried over, P1, P2 and P4 are fresh.

## Decisions, settled by the owner on 2026-11-12 ("Sim, segue": the recommended defaults)
1. **Request ceiling.** Raised for this study only: a study may export `MAX_REQUEST_BYTES` up to 400,000; every other study keeps 20,000.
2. **Sonnet.** Used for the central decision only (cents, as in T1).
3. **Regime on level III.** The shared board with a fixed round count, as written above. A caution found in stage 0: the benchmark's level is a suggested topology, not a property of the computation (I-08 of level I and III-26 of level III compute the same thing). In T2 the two levels differ by the regime the collective is given, and the report says so.
