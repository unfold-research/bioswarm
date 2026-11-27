# D6 and T1 preregistration (2026-11-11)

Registered before any paid call of these studies. Owner instruction of 2026-11-11 ("Depois das réplicas, segue com T1 e D6"), within the standing authorisation for the shared ledger. Submitted after the REP1 studies returned.

## D6: one agent holding the whole budget at partial coverage
Code: `observatory/batch2/d6-deep/protocol.mjs`, studies `d6-deep-local` and `d6-deep-scatter`, analysis `observatory/batch2/d6-deep/analyze.mjs`. Claude Haiku 5.5, thinking disabled. It is run D6 of `papers/P1-bio-inspired-agentic-swarms/RESEARCH-NEEDS.md`, asked for in `programs/historical/trigger.md`.

Every regime study under partial coverage (R2, R2b, R3, RD) compared a schedule, rules and orchestrators that direct several readers. None had a single agent holding the whole budget, which the standard of the P1 paper requires and which we had declared exempt because the field does not fit in one request. It does fit if the agent works through it step by step.

- Collections and setting of R2b (local, seeds 28001 to 28060) and R3 (scatter, seeds 29001 to 29060), so that results pair by collection with the regimes already run: 12 parts in a ring, every part counted once by ordinary readers, a silent edit of three parts, 6 re-counts.
- One agent makes all six re-counts in sequence. At each step it sees the board (first counts, its own re-counts, which changed), receives the records of the part it asked for at the previous step, counts them and names the next part. It is told, as the orchestrators were, that an edit tends to affect neighbouring parts.
- It decides six times where an orchestrator with two workers decides three times; it reads the same records; its calls also carry the board, so its input is larger. Cost is reported.
- With exact counting, an agent that follows the planned search of RD step by step is right on every local collection and on 0.35 of scattered ones.

Edited condition, paired by collection, bootstrap over 60 collections (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **P1, one agent with the whole budget beats the fixed schedule under local change**: deep minus `r2b-sweep`.
- **P2, and matches or beats the Haiku orchestrator with two workers**: deep minus `r2b-router`; reported in whichever direction it falls.
- **P3, under scattered change it is below the schedule like every other policy given the prior**: *supported* unless the interval of deep minus `r3-scatter-sweep` is above zero.
- **P4**: at least 0.9 right in the stable condition of both scenarios.
Reported: comparison with the alarm rule, the Sonnet orchestrator and the planned search in code; edited parts re-counted; repeats of a part; share of exact counts; cost.

## T1: the trigger as a decision
Code: `observatory/batch2/t1-trigger/protocol.mjs`, studies `t1-central-haiku` and `t1-central-sonnet`, analysis `observatory/batch2/t1-trigger/analyze.mjs`. First study of the trigger line of `programs/historical/trigger.md`.

Earlier regime studies fixed the budget and asked where to spend it. Here the budget is the decision: a field may or may not have changed, re-counting costs, and a regime has to decide when to stop.

- Field: 288 records in 24 parts of 12, in a ring; leader 20 qualifying studies, runner-up 16. Three worlds, unknown to the regimes: **stable**; **local** (three neighbouring parts each gain three studies of the runner-up); **scatter** (the same in three parts that are not neighbours). In an edited world the answer is right only if two of the three edited parts are re-counted.
- Re-counts come in rounds of two, at most six rounds. Where to re-count is the same for every regime: the planned search of RD. Readers are simulated with exact counts, justified by R2b and R3 (0.99 of real counts exact, code regimes equal to simulation).
- Triggers: **never**; **always** (six rounds); **thr4**, **thr8** (probe for two or four rounds, stop if nothing changed, otherwise spend everything); **thr8flip** (as thr8, and stop once the leading author has changed); **central**, a model that reads the board after each round (parts re-counted, which changed and how, totals per author) and answers continue or stop. Two central arms: Claude Haiku 5.5 and Claude Sonnet 5.5.
- The rule triggers need no model. On 3,000 simulated fields (right / re-counts): never 1.00 / 0, 0.00 / 0, 0.00 / 0 for stable, local, scatter; always 1.00 / 12, 1.00 / 12, 0.38 / 12; thr4 1.00 / 4, 0.51 / 8.1, 0.26 / 7.4; thr8 1.00 / 8, 1.00 / 12, 0.35 / 10.8; thr8flip 1.00 / 8, 1.00 / 8.5, 0.35 / 10.0.
- The central arms run on 90 fields (30 per world, seeds 51001 to 51090), up to five decisions per field.

Leak probe: the generator shows no leak on 3,000 fields. On the first range chosen for the 90 fields (seeds 50001 to 50090) the probe flagged one feature at z = 3.4, a sampling fluke; that range was replaced by 51001 to 51090 before any call, where the probe finds nothing. The central model does not choose parts and does not see first counts by part, so the flagged feature could not have helped it; the range was replaced to keep the rule.

Paired by field over the 90 fields, bootstrap (4,000 draws).
- **P1, a central trigger is not more accurate than the best threshold rule**: *supported* unless the 95% interval of Sonnet minus thr8flip in share of fields right is above zero. P1haiku likewise.
- **P2, a central trigger spends re-counts on fields that did not change**: on stable fields, its re-counts are above the two of a single round; the 95% interval of its re-counts minus two is above zero. Informative only through the size, which is reported against thr4 (4 re-counts) and thr8 (8). P2haiku likewise.
Reported per world for every trigger: share right, re-counts spent, decision calls and their cost; for the central arms, the rounds at which they stop in each world.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study; an invalid decision in T1 counts as "stop" for that field. A T1 run ends when every field has stopped. Any missing, duplicated, failed or unpriced provider result stops a study with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]).

## Limits stated in advance
D6: sequential steps give the single agent six decisions against three; that is part of what "one agent" means here and is not corrected for. Its comparison arms were run earlier and their results were known. T1: readers are simulated; where to re-count is fixed, so the study isolates the stopping decision and nothing else; the central model is told that re-counting costs but not how much, so "too many" and "too few" are judged against the rules and not against a price; three worlds in equal shares, which the model is not told. One wording. Ninety fields: about ±0.1 on a share.
