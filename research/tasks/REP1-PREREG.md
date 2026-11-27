# REP1 preregistration: replication at larger samples of the results the P1 paper would lean on

Registered 2026-11-11, before any paid call of these studies. Owner instruction of 2026-11-11 ("Sim, consolidar"), within the standing authorisation for the shared ledger. Code: `observatory/batch2/rep1/protocol.mjs` (studies `rep1-search`, `rep1-count`), `rep1-local-sonnet` on `observatory/batch2/ring/engine.mjs`, analysis `observatory/batch2/rep1/analyze.mjs`.

## Why
`results/CONSOLIDATED-2026-11-11.md` lists what holds across the day's runs and notes two things: five statements were corrected by later runs, and point estimates on 60 collections moved by up to 0.07 when the same regimes were simulated on 2,000. The results a paper would lean on were each measured on 60 to 90 tasks. REP1 measures them again on new tasks, at 300 per task family, and repeats the one result that rests on a single set of 60 (the planned search).

## Part 1: working space, votes and verification, two task families
Claude Haiku 5.5, thinking disabled, 1,536 output tokens. Two families, each with 24, 48 and 96 records and 100 tasks per size: **search** (find the study with the largest sample among those meeting three conditions; seeds 40001 to 40300) and **count** (the author with the most studies meeting them; seeds 41001 to 41300).
- Wave 0, per task: **d0, d1, d2** answer directly; **s0, s1, s2** with at most 20 words of working; **w60**; **w150**.
- Wave 1, per task: a verifier with at most 40 words of working on the s0 answer.
Strategies: direct = d0; directVote3 = plurality of d0 to d2; single = s0; vote3 = plurality of s0 to s2; verify3 = s0 if accepted, otherwise s1; w60; w150. Ties to the earliest sample.

Per family, per-task differences over the 300 tasks, seeded bootstrap (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **R1, one agent with a little working space beats a vote of three without it**: single minus directVote3. (Consolidated A1 and A2.)
- **R2, a vote among agents answering directly adds nothing**: *supported* unless the interval of directVote3 minus direct is above zero. (A2.)
- **R3, a verifier beats a vote at the same calls**: verify3 minus vote3. (A3.)
- **R4, a vote helps agents that reason**: vote3 minus single. Did not generalise in V6; reported in whichever direction it falls.
- **R5, one deeper agent beats the verified collective**: w150 minus verify3. Not established so far; reported.
A result counts as replicated only if it holds in both families.

## Part 2: the planned search
`results/ring-routers/REPORT.md`: given the locality prior, a Sonnet orchestrator was right on 59 of 60 collections under local change, by planning a search; one set of collections. `rep1-local-sonnet` repeats that arm on 60 new collections (seeds 33001 to 33060), readers Haiku. The fixed schedule, the reactive alarm rule and the planned-search rule on the same collections are computed by simulation with exact readers.
- **R6**: the orchestrator is right on at least 0.9 of collections in the edited condition, and on at least 0.9 in the stable condition.

## Not replicated here
The displacement of unprompted behaviour by an installed instinct already has five runs on both models. The regime results under partial coverage were re-estimated by simulation on 2,000 collections (`results/ring-rules/REPORT.md`).

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]).

## Limits stated in advance
Still two synthetic task families that share a record format, one small model for part 1, single runs. Larger samples narrow the intervals; they do not make the tasks less artificial. The sizes were chosen from earlier runs so that the direct arm is neither at floor nor at ceiling overall; a size at floor or ceiling for an arm will be reported as such.
