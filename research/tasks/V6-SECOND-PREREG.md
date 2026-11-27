# V6 preregistration: the main contrasts on a second task, counting by group (H-01, H-M03)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/v6-second/protocol.mjs` (Claude Haiku 5.5, thinking disabled, 1,536 output tokens), `v6-second-sonnet` (Claude Sonnet 5.5, adaptive thinking, effort low) and the task in `observatory/batch2/grouptask.mjs`. Combined analysis: `observatory/batch2/v6-second/analyze.mjs`.

## Why
Every result on working space, voting and verification since M4 comes from one synthetic task: find one record. A finding that depends on that task is not a finding about collectives. V6 repeats the main contrasts on a task of another kind.

## Task
Counting by group. Each task lists 24, 48 or 96 study records with an author id (six authors). The answer is the author with the most studies that are peer-reviewed, from 2020 or later and positive. The winner leads the runner-up by exactly one such study; a decoy author has the most records in total, many of them one condition short. 30 tasks per size, seeds 24001 to 24090. The task needs a tally over all records, not a search for one.

## Calls
- Wave 0 (Haiku), per task: **direct**; **s0, s1, s2** with at most 20 words of working; **w60**; **w150**.
- Wave 1 (Haiku): a verifier with at most 40 words of working on the s0 answer.
- Sonnet, per task: **direct** and **w60**.
Strategies: single = s0; vote3 = plurality of s0 to s2, ties to the earliest; verify3 = s0 if accepted, otherwise s1.

## Predictions and decision rules
All 90 tasks, per-task differences, seeded bootstrap (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below. Each is the replication of a result on the search task.
- **P1 (V2), working beats answering directly.** Haiku w60 minus direct.
- **P2 (V3), a vote helps agents that reason.** vote3 minus single.
- **P3 (V3, M7), verifying beats voting.** verify3 minus vote3.
- **P4 (V5), a small model that reasons beats a large one that answers directly.** Haiku w150 minus Sonnet direct.
- **P5 (V5), explicit working helps the stronger model.** Sonnet w60 minus Sonnet direct.

Reported: accuracy by size, how often the three samples differ, verifier counts, cost per call.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap.

## Limits stated in advance
A second synthetic task is still synthetic, and it shares the record format and the three conditions of the first. Difficulty was not piloted: an arm at floor or ceiling makes its test uninformative, and that will be said. A tally may fit in 20 words less well than a search does, so the working budgets are not equivalent across the two tasks.
