# P1 outline

For each section: what it has to do, what in the repository feeds it, and what is missing. Lengths assume about nine pages plus appendices.

## Title, abstract

**Bio-Inspired Agentic Swarms: Towards Leaderless AI.** (working title, **under review since 2026-11-17**: LI9 and LI10 found a manager agent matching or beating the bio router; see `CLAIMS.md`, section L, before drafting)

The abstract makes four statements, in this order: the lead-agent pattern and what it costs; the vocabulary and atlas offered; what existing work leaves untested (regimes against each other, and any collective against one agent at matched cost); the pilot result, whatever it is. No adjective about the result is written before the result exists.

## 1. Introduction (1 page)

- **Does:** states the problem (agent systems are built around a router; living collectives are not), the question (when does coordination without a leader pay, and by which mechanism), and the contributions as a numbered list of three or four.
- **Feeds it:** `README.md` of the repository (the question); `tasks/L2-RELATED-WORK-TO-READ.md` (the gap); `STATE.md` (what has been measured).
- **Missing:** a concrete, checkable description of the cost of the lead-agent pattern that can be published. The only measured one is in `internal/` and cannot be used; it needs a public reproduction or a citation.
- **Must not:** promise that swarms win. The introduction names the deep single agent as the control from its first page.

## 2. Background: collectives without a leader (1 page)

- **Does:** gives the biology the paper leans on, with sources, and no more: stigmergy, evaporation, response thresholds, quorum, recognition and cross-inhibition. One paragraph each, one key number each where the source has one.
- **Feeds it:** `research/nature/MAP.md` and the `nat-*` cards (53); each card lists primary sources and what was checked.
- **Missing:** a pass that confirms every number quoted against the primary source, and a decision on which five or six mechanisms make the cut.
- **Must not:** argue from the biology to the engineering. Evidence level of everything here is *natural phenomenon*: an analogy.

## 3. Framework (2 pages)

The core of the paper.

- **3.1 The field and its primitives.** Definitions from `VOCABULARY.md`, each with an operational handle.
- **3.2 Regimes.** A regime as a configuration of primitives. The orchestrator, the fixed schedule and the deep agent written in the same notation, so that every arm of every experiment is a point in one space.
- **3.3 Presets.** Ants, Bees, Wasps as named settings, with the parameter values.
- **Feeds it:** `research/theory/MODEL.md` (the efficiency model and its symbols); `programs/historical/instincts.md` (coordination rules packaged as instincts that agents exchange, which is one answer to "rule in the harness or behaviour of the agent"); the R1 protocol, which already writes five regimes as code.
- **Missing:** the notation itself; the decision on the primitive set; at least one regime in which the rule is carried by the agents and not by the harness.

## 4. An atlas of swarming species (1 page plus a table)

- **Does:** one table: species, mechanism, primitive(s), class of problem, hypothesis id, evidence level. It is the taxonomy the related work does not have, and it ties the paper to the public Atlas of Swarms.
- **Feeds it:** the nine plates of unfold.host and their cards here:

| Plate | Species | Card(s) |
|---|---|---|
| I | starlings | `nat-topological-neighbors`, `nat-scale-free-correlation` |
| II | desert locusts | `nat-locust-marching-transition` |
| III | honey bees | `nat-quorum-nest-bees`, `nat-waggle-dance-recruitment`, `nat-stop-signal-cross-inhibition` |
| IV | fireflies | `nat-firefly-synchrony` |
| V | black garden ants | `nat-pheromone-evaporation-aco` |
| VI | termites | `nat-stigmergy` |
| VII | slime mould | `nat-physarum-network` |
| VIII | sardines | no card yet |
| IX | luminous bacteria | `nat-bacterial-quorum-sensing` |

- **Missing:** a card for the bait-ball plate; the "class of problem" column, which today is implicit in the candidate hypotheses of `MAP.md`; a rule for what counts as a swarming species (the collection also holds cells, organs and celestial analogies, which do not belong in this table).
- **Must not:** read as a claim that each mechanism works in agents. The evidence column carries that, row by row.

## 5. Related work (1 page)

- **Does:** positions the paper against (a) stigmergy and decay with LLM agents, (b) the multi-agent-against-single-agent literature at matched compute, (c) classical swarm intelligence and ant colony optimisation, (d) position papers on a science of collective AI.
- **Feeds it:** `tasks/L2-RELATED-WORK-TO-READ.md` (five sources, first reading); `research/literature/` (41 cards, among them the matched-budget and "stop overvaluing debate" lines); `library/` (catalogue and evidence table; `library/enrichment/AUDIT.md` on how rare matched-compute comparisons are).
- **Also to position against:** the two benchmarks called SwarmBench (arXiv 2505.04364 and 2608.30661) and Towards a Science of Scaling Agent Systems (arXiv 2512.08296); see `papers/README.md`. The layout preview in `draft/` cites none of them yet.
- **Missing:** reading the five L2 sources from the PDFs and checking every number; adding MusicSwarm and Towards a Science of Collective AI to the catalogue; a Google Scholar search on the title; a systematic search for regime comparisons published since.

## 6. Pilot (1.5 pages)

- **Does:** reports one preregistered comparison in full: task, arms, budget, predictions, decision rules, results with intervals, cost per arm, what the design implies before any model is called.
- **Feeds it:** `tasks/R1-REGIMES-PREREG.md`, `observatory/batch2/r1-regimes/`, `results/batch2-r1-*` (frozen; results to come). R1 has five arms at the same reading budget: fixed schedule, deep agent, stigmergy with decay, stigmergy without, orchestrator; and a condition in which the field is edited mid-run.
- **Missing:** the results; the decision in the README (open item 1) on whether R1 alone is the pilot; a replication on a second model.
- **Must not:** be extended after the results are seen. Anything added later is labelled exploratory or moves to P2.

## 7. Discussion (1 page)

- **Does:** says what the pilot does and does not show; when a collective is expected to pay (budget below full coverage, unknown structure, a field that changes); what the framework predicts that could be refuted; the human as a perturbation of the field, in one paragraph, pointing to P3.
- **Feeds it:** rounds four to nine in `STATE.md` (the value of a collective shrinks as each agent reasons more); H-03, H-04, H-09 (when splitting effort wins); the limits section of the R1 preregistration.
- **Missing:** nothing that can be written before the pilot returns.

## 8. Limitations and ethics (0.5 page)

- **Does:** synthetic tasks; small samples; one provider; rules in the harness; the analogy is not evidence. For the Wasps preset and anything defensive: tests only in owned or isolated environments (`docs/CONVENTIONS.md`), no third-party systems.
- **Feeds it:** the "Limits stated in advance" of each preregistration.

## 9. Conclusion and the programme (0.25 page)

- **Does:** restates what was offered and names the next papers. The line "towards bio-inspired and leaderless AI swarms" belongs here.

## Appendices

- A. Full definitions and notation.
- B. The complete atlas table with sources.
- C. Preregistration, prompts, seeds and the cost ledger of the pilot.
- D. Simulation cards that motivated hypotheses, each labelled as support inside a model (`results/sims/REPORT.md`: 10 simulations, 46 predictions, 32 supported, 12 not, among them all four quorum predictions).
