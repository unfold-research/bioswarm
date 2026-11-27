# R1 five coordination regimes: every scheduled regime is perfect; undirected stigmergy loses by coverage; decay did not help

Preregistration `tasks/R1-REGIMES-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled, as five studies (`r1-sweep`, `r1-deep`, `r1-stig-decay`, `r1-stig-nodecay`, `r1-router`); 2,550 requests, all succeeded. Usage estimate [US$ redacted] in total. Cross-regime analysis: `node observatory/batch2/r1-regimes/analyze.mjs` → `summary.json` here.

## Result

Thirty collections of 288 records in 6 parts; 12 parts read per collection in every regime.

| Regime | Correct, stable | Correct, edited | Edited part re-read | Counts exactly right | Calls | US$ |
|---|---|---|---|---|---|---|
| sweep (fixed schedule) | 30 of 30 | 30 of 30 | 100% | 0.84 | 540 | [redacted] |
| deep (same schedule, half the calls) | 30 of 30 | 30 of 30 | 100% | 0.61 | 270 | [redacted] |
| stigmergy with decay | 30 of 30 | 17 of 30 | 60% | 0.85 | 540 | [redacted] |
| stigmergy without decay | 30 of 30 | 18 of 30 | 70% | 0.84 | 540 | [redacted] |
| router (orchestrator model) | 30 of 30 | 30 of 30 | 100% | 0.84 | 540 + 120 | [redacted] |

| Test, edited condition | Verdict |
|---|---|
| P1 (H-07, H-25) decay helps a stigmergic regime track a change | **not supported**: −0.03, interval −0.27 to 0.17 |
| P2 a fixed schedule beats undirected stigmergy at this budget | **supported**: +0.43, interval 0.27 to 0.60 |
| P3 an orchestrator model adds to a fixed schedule | **not supported**: both 30 of 30 |
| P4 fewer, deeper readers beat more, shallower ones | **not supported**: both 30 of 30 |

## Reading

- **When nothing changes, the regime does not matter.** All five were right on every collection, although about one count in six was wrong: the margin of four absorbed the miscounts.
- **When a part changes silently, what matters is whether it is read again.** The three regimes that re-read every part were right every time. The stigmergic rule re-read the edited part in 60 to 70% of collections and was right in 57 to 60%, close to what the schedules alone predicted with perfect readers (0.60 and 0.47).
- **Decay made no difference** (17 against 18 of 30). The preregistered schedules had predicted an advantage of 0.13 with exact readers; with thirty collections that is inside the noise, and the no-decay arm happened to revisit the edited part more often. This run does not support H-07 or H-25 on real models, and it is too small to refute them.
- **The orchestrator model reinvented the sweep.** In the second epoch it sent the analysts to 5.6 distinct parts on average, in 9 of 30 collections exactly one per part, and it always covered the edited part. It cost 11% more than the fixed schedule and added nothing.
- **Deeper readers were worse at counting and it did not matter.** Reading two parts at once, 0.61 of the counts were exact against 0.84, at 15% lower cost and the same answers.

What this says about the comparison the related work does not make (`tasks/L2-RELATED-WORK-TO-READ.md`): on a task whose parts are known and whose budget covers them, the baseline to beat is a fixed schedule, which costs nothing to coordinate. Neither a learned-looking orchestrator nor a stigmergic rule improved on it, and the stigmergic rule was worse for the plain reason that it leaves coverage to chance. A paper that shows a swarm beating conversation or a one-patch-per-tick hierarchy has not shown that it beats this.

## Limits

- Stated in advance and decisive: the budget allowed a full sweep twice. Stigmergy is argued to pay when the budget cannot cover everything, when the parts are not known in advance, or when the coordinator fails; none of those was present. This run is evidence against undirected stigmergy as a default, not against it in those regimes.
- The stigmergic rule is a seeded choice rule in the harness; the models only read and deposit.
- Thirty collections, one task, one model, one kind of edit. The orchestrator was told that the collection may be edited and that later counts are more recent.
- All scheduled regimes are at ceiling, so P3 and P4 cannot separate them.

## What to run next on this line

A budget below full coverage (for instance 4 reads after the edit for 6 parts) with a signal that can direct attention: a worker that finds its count differs from the board deposits an alarm. Then compare the fixed schedule, the orchestrator and a stigmergic rule that follows alarms, with enough collections to see a difference of 0.15.
