# P1 research needs

What the Lab has to produce before the paper can be drafted, in the order that unblocks the most. Each item names its output and where it lands in the repository. Paid runs follow the usual discipline: preregistered, frozen, capped, in the shared ledger.

## A. Decisions (settled by the owner on 2026-11-12; see `README.md`, "Decided")

| # | Decision | Why it blocks | Lands in |
|---|---|---|---|
| A1 | The primitive set: which five or six, and what is a primitive against a control | The notation, the atlas columns and the presets all depend on it | `VOCABULARY.md` |
| A2 | Rule in the harness or behaviour of the agent | Decides what "agentic swarm" means in the title and which runs count | `VOCABULARY.md`, `README.md` open item 2 |
| A3 | Whether "leaderless" excludes a fixed schedule | In R1 the schedule has no leader and is structurally ahead. The paper's word for itself has to survive that | `VOCABULARY.md` |
| A4 | The pilot: R1 alone, or R1 plus a partial-coverage run | Scope of section 6 and of the spend | `README.md` open item 1 |
| A5 | One word for the baseline: orchestrator or router | Used in every section and in the title of P2 | `VOCABULARY.md` |

## B. Reading (no cost beyond time)

| # | Work | Output | Lands in |
|---|---|---|---|
| B1 (**done 2026-11-12**: `research/literature/pdf-readings/`, ten papers, page references; two partly read, stated in each file) | Read the five L2 sources from the PDFs; check every number already written down | corrected table, with page references | `tasks/L2-RELATED-WORK-TO-READ.md`, `library/` |
| B2 | Systematic search for regime comparisons and for matched-cost comparisons with a single agent; Google Scholar search on the title | search strings, dates, inclusion list | `library/`, a short search log |
| B2b (**done 2026-11-12**, same folder) | Read the two SwarmBench papers and the scaling paper from the PDFs; card for the 2026 SwarmBench | what each measures, in one row each | `research/literature/`, related-work table |
| B3 | Reconcile the matched-compute counts and screen them by hand | one number that can be quoted | `library/enrichment/AUDIT.md` |
| B4 (not done; the background of the draft quotes no number, so it no longer blocks) | Check the key number of each natural mechanism used in section 2 against its primary source | a verified column on the cards used | `research/nature/` |
| B5 | A card for the bait-ball plate (sardines), or drop the plate from the paper's atlas | `nat-*` card | `research/nature/` |
| B6 (**done 2026-11-12**: CooperBench, Fig. 4, p.7) | A public source for the cost of the lead-agent pattern | citation or a plan for a public reproduction | `research/literature/` |

## C. Framework work (no cost)

| # | Work | Output | Lands in |
|---|---|---|---|
| C1 (first draft in `draft/`, section 3.2, 2026-11-12) | Notation: write orchestrator, schedule, deep agent, stigmergy with and without decay as points in one parameter space | a table and a paragraph per regime | appendix A draft |
| C2 (first draft, section 3.3; qualitative settings, no numerical values) | Presets: parameter values for Ants, Bees, Wasps | three rows of that table | `VOCABULARY.md` |
| C3 (first draft, section 4) | Atlas table: species, mechanism, primitive, class of problem, hypothesis, evidence level | the table of section 4 | `FIGURES.md` T2 |
| C4 (first draft, section 4: four conditions; plate VIII left out) | A rule for what enters the atlas as a swarming species | one sentence, applied to the 53 cards | section 4 |

## D. Runs

| # | Run | Question | State | Cost |
|---|---|---|---|---|
| D1 | R1, five regimes at the same reading budget | P1 to P4 of its preregistration | **returned 2026-11-11**: `results/batch2-r1-regimes/REPORT.md`; only P2 supported, the scheduled regimes are at ceiling | [US$ redacted] |
| D2 | The regime comparison on a second model | does the picture hold with a stronger model | **returned 2026-11-11** for the orchestrator, the only model-dependent arm (`results/ring-routers/REPORT.md`): Sonnet with the prior is near perfect under local change and no better than Haiku otherwise. Readers were not replaced: Haiku counts exactly in 0.99 of calls on this task | [US$ redacted] |
| D3 | Partial-coverage run: the budget covers less than the field | E7 in `CLAIMS.md`: does stigmergy pay where it is expected to | **returned 2026-11-11** as R2 and R2b (`results/batch2-r2b-regimes/REPORT.md`): yes for a local alarm rule against the best fixed schedule; an orchestrator with the same signal does no better | [US$ redacted] |
| D4 | One regime carried by the agents: workers read the marks and choose, instead of a seeded rule choosing for them | A2 above | **returned 2026-11-11** (`results/batch2-d4-choice/REPORT.md`): agents follow the signal (90% of choices) and do not explore; 0.58 against 0.70 for the harness rule | [US$ redacted] |
| D5 | Decay ablation with enough trials | F5 and E1: an honest test of decay would be new | partly in R1; power to be checked once R1 returns | to estimate |
| D6 | One deep agent at partial coverage | the single-agent arm that R2 and R2b lack | **returned 2026-11-11** (`results/batch2-d6-deep/REPORT.md`): one Haiku agent making all six re-counts in sequence is right on 0.75 of collections under local change, equal to the Haiku orchestrator with two workers (0.00, −0.15 to 0.15), above the schedule (+0.27) and below the Sonnet orchestrator with the prior (−0.23); under scattered change 0.35 against 0.47 for the schedule | [US$ redacted] |

D1 is the pilot under A4's first option. D3 and D4 are the two runs that would most change what the paper can say; either can be moved to P2 if the pilot is to stay small.

## E. Before submission

- Release plan: what code, data and preregistrations are published with the paper, given that the repository is private.
- A reproduction script for every number in the paper, from raw results.
- A reading by someone who has not seen the repository, for the vocabulary alone.

## Suggested order

A1 to A5 in one working session with the Lab. Then B1, C1 and D1 in parallel. D3 and D4 are designed only after D1 returns, because its results decide whether they belong in P1 or P2.
