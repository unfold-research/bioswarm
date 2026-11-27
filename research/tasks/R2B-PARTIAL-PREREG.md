# R2b preregistration: partial coverage with an edit that the first counts do not reveal

Registered 2026-11-11, after R2 returned and before any paid call of this study. Code: `observatory/batch2/r2b-regimes/protocol.mjs`, one submission per regime (`r2b-sweep`, `r2b-random`, `r2b-alarm`, `r2b-router`), analysis in `observatory/batch2/r2b-regimes/analyze.mjs`. Claude Haiku 5.5, thinking disabled.

## Why
R2 (`results/batch2-r2-regimes/REPORT.md`) had a flaw. Its edit exchanged leader and runner-up in a block, and for that to reverse the answer the generator put the leader's largest counts in the block. The orchestrator read the first counts, sent its first analysts to the leader-heavy parts and was right on 60 of 60 collections; 88 of its 120 first-round picks were inside the block, where chance gives 30. Its result therefore does not compare central and local use of alarms. R2b removes the correlation and repeats the whole comparison on new collections. Nothing is pooled with R2.

## What changes
- The leader's and the runner-up's qualifying studies are spread over the 12 parts without regard to the block (an offline test checks that block parts look like any other part before the edit).
- The edit adds three qualifying studies of the runner-up to each of three neighbouring parts, by rewriting three records that did not qualify. 20 against 16 becomes 20 against 25. With one edited part re-read the totals give the old answer (19 against 20); with two or three, the new one.
- New seeds, 28001 to 28060.

Everything else is as in `tasks/R2-PARTIAL-PREREG.md`: 12 parts of 24 in a ring; every part read once at the start; then 6 reads in 3 rounds of 2; alarms computed by code at a total difference of 3; regimes sweep, random, alarm, router; answers by code from the latest count of each part; the orchestrator is told that an edit tends to affect neighbouring parts.

## What the design already implies
With readers that never miscount: sweep 0.48, random 0.48, alarm 0.70 in the edited condition; all 1.00 when nothing changes.

## Predictions and decision rules
As in R2, on the 60 new collections, paired bootstrap (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **P1 (E7)**: alarm minus sweep. A replication.
- **P2**: alarm minus random. A replication.
- **P3**: router minus alarm. The test that R2 could not make. Reported in whichever direction it falls.
- **P4**: every regime at least 0.9 in the stable condition.

Also reported: how many of the orchestrator's first-round picks fall inside the block (chance: a quarter), as the check that the leak is closed.

## Stopping, budget
As in R2. Owner instruction of 2026-11-11 to run D3; this rerun corrects a flaw in that run and stays within the standing authorisation for the shared ledger.

## Limits stated in advance
Those of R2. In addition: the predictions were written after R2's results were seen, so P1 and P2 are replications and only P3 is a fresh test.
