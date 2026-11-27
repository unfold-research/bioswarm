# G1: the swarm genome (preregistration, 2026-11-13)

Owner request, 2026-11-13: write down every characteristic that makes up a biological swarm, see which ones each species has (seen and unseen), and later compose artificial swarms by selecting flags. G1 is the first step: a species × trait matrix with its sources, coded twice, checked, and tested against hypotheses written here before the data exist. It is a new line next to the defence focus of `programs/defence.md`; the defence traits are one axis of it (DEF).

## What exists and what G1 adds

`research/nature/` has 56 cards, one per **mechanism**. `research/FLAGS.md` turns them into 46 flags. P1 (`papers/P1-bio-inspired-agentic-swarms/VOCABULARY.md`) has five primitives and three named presets. None of them says which traits a given species has, which traits go together, or under which conditions. G1 adds that table, unit = one collective system.

## Instrument

- **Ontology** `catalog/genome/traits.json`: 39 traits on 7 axes (signalling, field and memory, activation, decision, division of labour, regulation, defence) and 9 ecological conditions. Each trait names the flags and primitives it maps to.
- **Species** `catalog/genome/species.json`: 51 systems, 38 seen and 13 unseen, across 14 taxon groups. Three team hunters (wolf, lion, dolphin) are the counter-model of `nat-teams-not-swarms`; one solitary forager (*Cataglyphis*) is a near-negative control. Physics and engineering analogies ("beyond") are excluded.
- **Coders.** Two independent coders that see the same prompt and nothing of each other: Claude Opus 5.5 (A) and Claude Sonnet 5.5 (B), both at effort `high`, structured output, one request per species, Message Batches API. Each trait gets a state (`present`, `variable`, `absent`, `unknown`), a strength 0–3, a confidence, at most 40 words of evidence and up to two references. Each species gets the nine conditions.
- **Citation check** (free): every reference is looked up in Crossref; by DOI when given, else by bibliographic search. A reference is *verified* when the title found matches the title cited (token overlap ≥ 0.6) and the year is within one.
- **Consensus.** A cell is `P` when both coders say present or variable, `A` when both say absent, `U` when both say unknown, and `C` (contested) otherwise. Analyses use P and A cells only. Conditions: coder A's value, B's reported beside it.

This is **machine coding from the models' knowledge**, checked against a citation index. It is not a systematic review, and its evidence level is "machine triage" in the sense of `STATE.md`. A human check of a random sample of 40 P/A cells against the cited sources is the next step and is not part of G1.

## Hypotheses (written before any request is sent)

| Id | Prediction | Test | Refuted if |
|---|---|---|---|
| H-G01 | The instrument is usable: pooled Cohen's κ between coders over trait states collapsed to {present+variable, absent, unknown} is ≥ 0.6, and ≥ 80% of references with a DOI resolve to the cited work | κ on all cells; share of verified DOIs | κ < 0.6 or verified share < 0.8 (then later hypotheses are reported as descriptive only) |
| H-G02 | Quorum decision (DEC-01) is more frequent in systems whose problems include `site-choice` | Fisher exact, one-sided, P/A cells | p ≥ 0.05 or the difference has the wrong sign |
| H-G03 | Social immunity (DEF-03) is more frequent in permanent groups of clonal or high relatedness | as above, group = C-PERM permanent and C-REL ∈ {clonal, high} | as above |
| H-G04 | Morphological castes (DOL-01) and an inactive reserve (ACT-04) are more frequent in groups of ≥ 1,000 members (C-SIZE ≥ 3) | Fisher exact, one per trait; both must hold | either p ≥ 0.05 |
| H-G05 | A persistent leader or hierarchy (DOL-04) is more frequent in small groups of capable members (C-SIZE < 2 and C-COG ∈ {medium, high}) than in the rest | Fisher exact | p ≥ 0.05 |
| H-G06 | Among systems with stigmergic deposit (FLD-01 = P), signal decay (FLD-02) is more frequent where the environment changes fast or at medium speed | Fisher exact within FLD-01 = P | p ≥ 0.05, or fewer than 8 systems with FLD-01 = P (then untestable) |
| H-G07 | The unseen collectives are closer in trait profile to the social insects (hymenoptera and termite) than to the vertebrates | Mean Jaccard similarity over P cells, unseen × insects against unseen × vertebrates; permutation test of group labels, 10,000 draws | the difference ≤ 0 or permutation p ≥ 0.05 |

Exploratory, not tested: trait co-occurrence clusters, the species profiles closest to the P1 presets, and the list of traits present in nature whose flags were never tested on LLM agents (`research/FLAGS.md` status `untested`).

Comparative caveat: species are not independent (shared ancestry). As a sensitivity check every Fisher test is rerun keeping one randomly chosen system per taxon group (1,000 draws, median p reported). A hypothesis that holds only in the full set is reported as such.

## Budget and stopping

Shared ledger cap raised by the owner from [US$ redacted] to [US$ redacted] on 2026-11-13 (`results/lab007-economy-explore/global-budget.json`, event `cap-raised`). G1 study cap [US$ redacted] Reservation = full input plus `max_tokens` output at batch list price. One batch per coder; no resubmission of an uncertain POST. If a request errors or stops at `max_tokens`, that species is rerun once in a repair batch inside the same cap and the rerun is reported.

## Outputs

`results/genome-g1/`: requests, raw results, per-coder matrices, citation check, consensus matrix `matrix.json`, `analysis.json`, `REPORT.md`. The visual atlas reads `matrix.json`.
