# G1 result: the swarm genome (2026-11-13)

Preregistration: `tasks/G1-GENOME-PREREG.md` (committed and pushed before any request was sent, 7c4e8aa). Instrument: `catalog/genome/` (39 traits on 7 axes, 9 conditions, 51 systems). Runner and analysis: `observatory/genome/`. Atlas: `results/genome-g1/atlas.html`.

## What ran

| | Coder A | Coder B |
|---|---|---|
| Model | Claude Opus 5.5, effort high | Claude Sonnet 5.5, effort high |
| Batch | msgbatch_01BVjCSDV8mzLoKfR7HrFbwy | msgbatch_01FBYgSVNeHThqapZAMD4Hp3 |
| Systems returned | 51 of 51, no error, none at `max_tokens` | 51 of 51, same |
| Output tokens | 396,966 | 426,102 |
| Cost (batch list price, reconciled) | [US$ redacted] | [US$ redacted] |
| Cells present / variable / absent / unknown | 680 / 29 / 220 / 1,060 | 571 / 62 / 169 / 1,187 |
| References cited (with DOI) | 861 (289) | 634 (233) |

Plus one direct schema smoke call ([US$ redacted]). Study total [US$ redacted] of the [US$ redacted] study cap. Shared ledger after G1: see `results/lab007-economy-explore/global-budget.json` (cap now [US$ redacted]).

Both coders say "unknown" for more than half the cells. That is what the protocol asked for (no inference from relatives), and it shapes every test below: **absence is almost never recorded** (138 of 1,989 consensus cells are A), so a test that needs absent cases in both groups often has none.

## Consensus matrix

| Consensus | Cells |
|---|---|
| P (both present or variable) | 544 |
| A (both absent) | 138 |
| U (both unknown) | 959 |
| C (contested) | 348 |

Agreement on collapsed states 0.825, Cohen's κ 0.687. Least reliable traits (κ by trait): response-threshold variation 0.37, quality-graded recruitment 0.39, inactive reserve 0.43, sacrificial defence 0.44, minimum group size for payoff 0.46, task partitioning 0.46.

## Hypotheses

**Citations.** 1,495 citations (731 unique references). 1,413 (94.5%) match a real work with the cited title and year (title overlap ≥ 0.6, year within one); 77 were not found, 1 DOI points to a different work, 4 could not be checked (repeated network errors). Of the 522 citations that carry a DOI, 497 (95.2%) resolve to the cited work; 18 more name a real paper under a wrong DOI. By coder: A 817 of 861 verified, B 596 of 634.

**Deviation from the preregistration.** The preregistration named Crossref for both DOI lookup and title search. DOI lookups used Crossref throughout. Title searches (including fallbacks after a wrong DOI) used Crossref for 142 references and OpenAlex for 370: the Crossref public pool allows one concurrent request at about 3–4 s per search, and the run was switched to OpenAlex (owner's API key, read from a local file and never written to results) with the same match rule. Each cached result records its source (`citations.json`).


| Id | Verdict as registered | Numbers | Reading |
|---|---|---|---|
| H-G01 | **supported** | κ 0.687 (≥ 0.6); verified DOIs 0.952 (≥ 0.8) | the instrument is usable; the two coders' disagreements sit in a few traits (below) |
| H-G02 quorum ↔ site choice | refuted | 2 of 2 vs 5 of 5 present; no absent cell in either group | **no power**: quorum is never coded absent, so the table is all P. Not evidence against the idea |
| H-G03 social immunity ↔ permanent, related | refuted | 4 of 4 vs 6 of 6; no absent cell | **no power**, same cause |
| H-G04 castes and reserve ↔ size ≥ 1,000 | refuted | castes 20/27 vs 2/15, p < 0.001, by-taxon p̃ 0.12; reserve 3/3 vs 2/2, no absent cell | castes follow size in the full set (not after one-per-taxon); reserve has no power. Refuted only because the registered test needed both |
| H-G05 leader ↔ small group of capable members | **supported** | 8/9 vs 2/30, p < 0.001; by-taxon p̃ 0.09 | holds in the full set; weaker with one system per taxon group (stated as such) |
| H-G06 decay ↔ changing environment | untestable | 26 systems with deposit; all 11 coded on decay are in fast or medium environments | no system with a slow environment had decay coded either way |
| H-G07 unseen closer to insects than to vertebrates | **supported** | mean Jaccard 0.269 vs 0.136, permutation p < 0.001 | microbial and cellular collectives share their trait profile with the social insects, not with flocks, schools or herds |

## Exploratory

**Natural archetypes.** Average-linkage clustering on shared present traits gives four recurring profiles (cut at six groups; one is wildebeest alone):

1. *Colony with a home* — all social insects, the social spider, the naked mole-rat, and from the unseen side *Bacillus* biofilms, *E. coli*, *Dictyostelium*, *Physarum*, T cells and the mycorrhizal network (plus the wolf). Persistent shared structure, stigmergy, castes, reproductive division, member recognition.
2. *Moving aggregate* — locust, firefly, krill, sardine, starling, ibis, penguin. Local neighbour coupling, synchronisation, rotation of costly positions; no persistent structure.
3. *Schools and flocks with memory* — herring, golden shiner, pigeon. Neighbour coupling plus informed minorities.
4. *Team of individuals* — great tit, baboon, meerkat, vampire bat, lion, dolphin. Individual memory, leaders or hierarchy, sentinels, alarm calls.
5. *Chemical quorum collective* — *Vibrio*, *Pseudomonas*, *Myxococcus*, *Proteus*, *Paenibacillus*, *Volvox*, neutrophils. Broadcast chemical signal, density-triggered switch, cheater control, self-limiting recruitment.

**Strongest co-occurrences** (φ over P/A cells, n ≥ 15): persistent structure with temporal polyethism 0.89, polyethism with reproductive division 0.88, stigmergic deposit with persistent structure 0.80, broadcast chemical signal with persistent structure 0.79 and with castes 0.79, broadcast chemical signal **against** a persistent leader −0.79. Chemistry and structure go together; leaders go with neither.

**What nature uses most against what we tested.** The four most common traits in nature are member recognition (33 systems), persistent shared structure (31), contact signalling (29) and reproductive division (27). Of these, only contact signalling has a flag that was tested on LLM agents. Quorum decision (7 systems) and cross-inhibition (2) carried much of our LLM testing and are among the rarest. The whole defence axis (recognition, alarm, scaled defence, social immunity, cheater control, sentinels) has no flag tested on LLM agents. Ranked list: `analysis.json`, `backlog`.

## Limits

- Machine coding from the models' knowledge, checked against Crossref and OpenAlex only for the existence of the cited work, not for what it says. A human check of 40 random P/A cells against the cited sources is the next step.
- "Unknown" dominates. Prevalence counts are floors, and tests that need absences are mostly powerless.
- Conditions are coded by coder A only, by the same model that coded the traits; a coder could infer traits from conditions. Coder B's conditions are kept beside them in `matrix.json` for a later check.
- Species are not independent; the one-per-taxon-group sensitivity is reported for every Fisher test, and H-G05 weakens under it.
- The species list was chosen by us and leans to well-studied systems.

## Files

`config.json` (frozen hash), `g1-genome-{A,B}.requests.jsonl`, `g1-genome-{A,B}.results.jsonl`, `batches.json`, `citations.json`, `citations-by-cell.jsonl`, `matrix.json`, `analysis.json`, `atlas.html`, `smoke-B-temnothorax.json`, `live.log`, `check.log`.
Reproduce: `node observatory/genome/g1.mjs --freeze`, `--live` (needs the key), then `node observatory/genome/check.mjs`, `node observatory/genome/analyze.mjs`, `node observatory/genome/atlas/build.mjs`. Tests: `node --test observatory/genome/lib.test.mjs`.
