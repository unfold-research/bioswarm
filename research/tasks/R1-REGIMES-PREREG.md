# R1 preregistration: five coordination regimes on one task at the same reading budget

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/r1-regimes/protocol.mjs`, one submission per regime (`r1-sweep`, `r1-deep`, `r1-stig-decay`, `r1-stig-nodecay`, `r1-router`), cross-regime analysis in `observatory/batch2/r1-regimes/analyze.mjs`. Claude Haiku 5.5, thinking disabled, 1,024 output tokens.

## Why
`tasks/L2-RELATED-WORK-TO-READ.md`: the published work on stigmergy with LLM agents compares a swarm with conversation or hierarchy; none compares it with one agent or a plain schedule at the same cost, and none isolates decay with enough trials. Our own runs say the single-agent control is the one that decides. This is the first run of that comparison here.

## Task
A collection of 288 study records in 6 parts of 48, by six authors. The answer is the author with the most studies that are peer-reviewed, from 2020 or later and positive: 20 for the leader, 16 for the runner-up, at most 12 for anyone else. No call sees more than two parts. 30 collections, seeds 26001 to 26030, each run in two conditions:
- **stable**: the collection does not change;
- **edited**: after half of the reading budget, one part is edited (leader and runner-up exchanged in that part), which reverses the answer to 16 against 20. No agent is told.

## Regimes, all with 12 parts read per collection, 6 before the edit and 6 after
- **sweep**: a fixed schedule, each part once before and once after; the latest count of a part is used. 12 calls.
- **deep**: the same schedule in 6 calls: one agent reads two parts at a time with twice the working (200 words against 100).
- **stig-decay**: no schedule. In each of 4 rounds, 3 workers each choose a part independently with probability proportional to 1/(1+m)², m being the mark on that part (one unit per visit); marks halve each round. The estimate of a part is the mean of its counts weighted by the same decay.
- **stig-nodecay**: the same with marks and weights that never fade.
- **router**: an orchestrator model reads the board and assigns 6 workers per epoch (before and after the edit), then names the answer. It is told that the collection may be edited between epochs and that a later count is the more recent reading. 12 worker calls and 3 orchestrator calls.

Sweep, deep and the two stigmergic regimes are answered by code from the counts deposited; a tie, or a part never read, counts against the regime. The reads before the edit are shared by the two conditions of a collection.

## What the design already implies
With readers that never miscount, the schedules give: sweep and deep 1.00 in both conditions; stig-decay 1.00 stable and 0.60 edited; stig-nodecay 1.00 stable and 0.47 edited (computed offline from the seeded schedules). At a budget that allows a full sweep, a fixed schedule is structurally ahead of an undirected stigmergic rule, because it always re-reads the edited part and the rule does so in 60 to 70% of collections. The run measures what real readers and a real orchestrator do to that picture.

## Predictions and decision rules
Accuracy in the edited condition, paired by collection, seeded bootstrap over the 30 collections (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **P1 (H-07, H-25), decay helps a stigmergic regime track a change.** stig-decay minus stig-nodecay.
- **P2, a fixed schedule beats undirected stigmergy at this budget.** sweep minus stig-decay.
- **P3, an orchestrator model adds to a fixed schedule.** router minus sweep.
- **P4, fewer, deeper readers beat more, shallower ones.** deep minus sweep.

Reported: accuracy in the stable condition, share of collections where the edited part was re-read, share of counts that are exactly right, parts covered, read calls, cost per regime from returned tokens, and what the orchestrator assigned in the second epoch.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap; the owner asked on the same day for the regime comparison and for I14 and V7 ("Faz os dois").

## Limits stated in advance
- Thirty collections; an interval of about ±0.2 on a difference.
- The stigmergic rule is implemented in the harness as a seeded choice rule, not decided by a model; the workers only read and deposit. That is a model of stigmergy, chosen so that the rule is exact and repeatable.
- The budget allows a full sweep twice. Stigmergy is expected to matter when the budget does not cover everything or when the structure is unknown; neither holds here, and this run cannot speak to those cases.
- The orchestrator is given a hint about edits that the stigmergic rule has only through decay.
- One task, one model, one kind of perturbation. The human-as-perturbation interface in the note is represented by a silent edit only.
