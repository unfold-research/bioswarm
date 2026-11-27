# R2 preregistration: coordination regimes when the budget does not cover the field

Registered 2026-11-11, before any paid call of this study. It is run D3 of `papers/P1-bio-inspired-agentic-swarms/RESEARCH-NEEDS.md` and tests claim E7 of its `CLAIMS.md`. Code: `observatory/batch2/r2-regimes/protocol.mjs`, one submission per regime (`r2-sweep`, `r2-random`, `r2-alarm`, `r2-router`), cross-regime analysis in `observatory/batch2/r2-regimes/analyze.mjs`. Claude Haiku 5.5, thinking disabled, 1,024 output tokens.

## Why
R1 (`results/batch2-r1-regimes/REPORT.md`) gave every regime a budget that covers the collection twice. A fixed schedule was right every time and an undirected stigmergic rule lost by coverage. The case in which stigmergy is argued to pay, a budget smaller than the field with a signal that can direct attention, was not tested.

## Task
The collection of R1, 288 records by six authors, in 12 parts of 24 arranged in a ring. 60 collections, seeds 27001 to 27060, each in two conditions.
- Every part is read once at the start (12 reads). Before the edit the leader has 20 qualifying studies and the runner-up 16.
- **edited**: a block of three neighbouring parts is then edited in silence (leader and runner-up exchanged there). The true answer becomes the runner-up, 22 against 14. **stable**: nothing changes.
- The budget after that is 6 reads for 12 parts, in 3 rounds of 2 workers.
- All regimes are answered by code: the latest count of each part, summed. A regime is right in the edited condition only if it re-reads at least two of the three edited parts; with one, the totals tie, and a tie counts as wrong.

A read **raises an alarm** when its count differs from the previous count of the same part by 3 or more in total over the authors (an edit moves 4; a typical miscount moves 1). Alarms are computed by code.

## Regimes
- **sweep**: parts 0 to 5 in order. This is the best fixed schedule for a block of three: six contiguous parts contain two edited parts for 6 of the 12 block positions.
- **random**: each worker independently picks a part, parts already re-read being 20 times less likely.
- **alarm**: the same, and each not-yet-re-read neighbour of a part that raised an alarm is 9 times as likely to be picked. This is recruitment: a local rule, no assignment, a signal left on the field.
- **router**: an orchestrator model reads the board, including the alarms, and assigns the two workers of each round. It is told that an edit tends to affect neighbouring parts, which is the prior the alarm rule encodes.

## What the design already implies
With readers that never miscount, the seeded schedules give in the edited condition: sweep 0.52, random 0.40, alarm 0.70; all 1.00 in the stable condition. The orchestrator has no such figure: it depends on what the model does.

## Predictions and decision rules
Accuracy in the edited condition, paired by collection, seeded bootstrap over the 60 collections (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **P1 (E7), a stigmergic rule with a signal beats the best fixed schedule when the budget does not cover the field.** alarm minus sweep.
- **P2, the signal is what does it.** alarm minus random.
- **P3, an orchestrator with the same information beats the local rule.** router minus alarm. Reported in whichever direction it falls.
- **P4, alarms do no harm when nothing changed.** Every regime at least 0.9 in the stable condition.

Reported: edited parts re-read, distinct parts re-read, alarms per collection in each condition (false alarms), share of counts exactly right, calls and cost per regime, and what the orchestrator assigned.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner instruction of 2026-11-11 to run D3 ("Sim, rodar D3"), within the standing authorisation for this ledger.

## Limits stated in advance
- The advantage of the alarm rule comes from a structure we built in: edits are contiguous and the rule looks at neighbours. Where edits are scattered, an alarm says nothing about where to look next. The result is about a field with locality.
- The alarm rule is a seeded choice rule in the harness; the models read, deposit and, in the router regime, assign. An agent that reads the marks and chooses for itself (D4) is not tested here.
- The orchestrator is given the locality prior in words. Without it the comparison would favour the rule; with it, it tests central against local use of the same information.
- Sixty collections: an interval of about ±0.15 on a paired difference. One task, one model, one kind of edit.
- The router regime costs 3 more calls per collection and condition; cost is reported.
