# D5 and Q1 preregistration: decay with power, and quorum as a stopping rule (2026-11-12)

Registered before any paid call of these studies. Owner instruction of 2026-11-12 ("Sim, rodar"), within the standing authorisation for the shared ledger. Both serve the evidence column of the P1 paper (`papers/P1-bio-inspired-agentic-swarms/GAPS.md`, item 4): of its five primitives, decay had one underpowered test and quorum none.

## D5: decay with power

Code: `observatory/batch2/d5-decay/protocol.mjs`; studies `d5-decay-l100`, `d5-decay-l50`, `d5-decay-l0`; analysis `observatory/batch2/d5-decay/analyze.mjs`. Claude Haiku 5.5, thinking disabled.

R1 compared avoid-stigmergy with and without decay on 30 collections: 17 against 18 right under a silent edit. Its report gave 0.60 and 0.47 as what the schedules imply with exact readers, on those 30 collections.

**What the simulation says, known before any call.** With R1's own code and exact readers on 3,000 collections the figures are 0.69 with decay and 0.35 without, a difference of 0.34 and not 0.13. Of the 3,000 collections without decay, 782 end in an exact tie: when a part is counted once before the edit and once after and the two counts are averaged with equal weight, leader and runner-up come out equal, and a tie is scored as wrong. A real reader that miscounts by one breaks such ties at random. The effect of decay with real readers is therefore expected to be smaller than 0.34, and R1's 30 collections could not have shown either figure.

- Setting: the R1 collections (288 records, 6 parts of 48, one part edited so that the answer reverses) and the R1 rule: four rounds of three workers, a worker chooses a part with probability proportional to 1/(1+m)², marks are multiplied by λ after each round, and the estimate of a part is the mean of its counts weighted by λ to the power of their age. The edit happens after round 2. A part never read contributes nothing.
- Decay rates: λ = 1 (no decay), 0.5 (R1's decay), 0 (only the latest round counts). Simulation also covers 0.75 and 0.25, and a longer horizon of eight rounds with the edit after round 4.
- Difference from R1: every λ uses the same random stream for a collection, so arms are paired and the first two rounds are identical across arms.
- 150 new collections (seeds 61001 to 61150), each in the stable and the edited condition: 2,700 reads per arm.
- Simulation with exact readers on 3,000 other collections (seeds from 960001), share right edited / stable: λ = 1: 0.33 / 0.995; 0.75: 0.64 / 0.990; 0.5: 0.70 / 0.982; 0.25: 0.72 / 0.964; 0: 0.74 / 0.948. Eight rounds: 0.40, 0.89, 0.96, 0.97, 0.95 edited.

Paired by collection, bootstrap (4,000 draws).
- **P1, decay helps a stigmergic regime track a change**: λ = 0.5 minus λ = 1 in the edited condition; interval above zero.
- **P2, the same for full forgetting**: λ = 0 minus λ = 1, edited; interval above zero.
- **P3, forgetting has a cost when nothing changed**: λ = 0 minus λ = 1 in the stable condition; *supported* if the interval is below zero. The simulation gives −0.05.
- **P4, real readers shrink the simulated effect**: the measured difference of P1 is below the 0.37 the simulation gives on its 3,000 collections with common streams; reported with the figure the simulation gives on the 150 collections of the study.
Secondary, labelled as such: ties scored at half credit; a decomposition in which the reads of one arm are re-estimated with the weights of another, to separate what decay does to where workers go from what it does to how counts are combined.

## Q1: quorum as a stopping rule

Code: `observatory/batch2/q1-quorum/protocol.mjs`; studies `q1-quorum-search`, `q1-quorum-count`; analysis `observatory/batch2/q1-quorum/analyze.mjs`. Claude Haiku 5.5, thinking disabled.

A quorum is not a vote. In nest-site selection a decision is taken when enough scouts are at one site, without waiting for all; its claim is about the cost of reaching a given accuracy. REP1 found that a vote of three reasoning agents adds 0.01 to 0.02 to one of them, and that one agent with more working space beats every collective tried. Q1 asks whether a quorum rule buys the accuracy of a larger vote for fewer calls, and where that leaves it against one deeper agent at comparable tokens.

- Tasks: the two families of REP1 (search, count), 24, 48 and 96 records, 100 tasks per size, new seeds (from 42001 and 43001).
- Per task, one wave of nine calls: seven independent agents with at most 20 words of working (s0 to s6), one agent with 60 words, one with 150.
- Arms, computed from those answers in order: single (s0); vote3, vote5, vote7 (plurality of the first 3, 5, 7; ties go to the earliest answer); quorum2 and quorum3 (sample in order and stop as soon as an answer has been given 2 or 3 times, at most 7 samples, otherwise the plurality of the 7); w60; w150.
- Cost per arm: agents sampled, and tokens from the returned usage of the calls the arm used.

Paired by task, bootstrap (4,000 draws), per family.
- **Q1, a quorum reaches the accuracy of the full vote for fewer calls**: quorum3 minus vote7; *supported* if the lower end of the interval is above −0.03 and quorum3 samples fewer than 7 agents on average. Its mean number of agents is reported.
- **Q2, a higher quorum is more accurate**: quorum3 minus quorum2; interval above zero.
- **Q3, no quorum or vote beats one deeper agent at comparable tokens**: w60 minus quorum3; *supported* if the interval is above zero. The tokens of both arms are reported; the comparison is at matched cost only if w60 spends no more than quorum3.
- **Q4, sampling more agents helps at all**: vote7 minus single; interval above zero. REP1 found +0.02 and +0.01 for three.
Reported: accuracy, agents sampled and tokens for every arm; how often the seven samples disagree.

## Stopping, budget
More than 10% invalid outputs stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]).

## Limits stated in advance
D5: one rule, one task, one kind of edit; decay acts in two places at once (marks and the weighting of counts), which the secondary decomposition separates only by re-estimation, not by a separate run; ties are a property of this task's margins. Readers are one small model. Q1: quorum arms are computed from a fixed order of independent samples, which is exact for a stopping rule but means all arms share the first samples; "comparable tokens" is measured, not enforced; two synthetic task families on which one agent with working space is already strong.
