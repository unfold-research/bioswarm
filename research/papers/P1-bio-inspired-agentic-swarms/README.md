# P1 — Bio-Inspired Agentic Swarms: Towards Leaderless AI

Status: **first complete draft** (2026-11-12): every section of `draft/` is written, ten pages with an appendix of runs. It is a draft: see `GAPS.md` for what has to be done before it can circulate. This folder says what the paper is, what each part has to carry, what evidence already exists here and what the Lab still has to produce.

## The paper in one paragraph

Multi-agent LLM systems are mostly built around a lead agent that routes work. Living collectives coordinate without one. P1 gives the field a vocabulary for bringing those collectives into agent systems: a small set of coordination primitives, the notion of a regime as a configuration of them, and an atlas that maps swarming species to mechanisms and to the class of problem each mechanism addresses. It positions that vocabulary against the existing work on stigmergy with LLM agents, states what that work leaves untested, and reports one pilot in which regimes are compared with an orchestrator and with one deep agent at the same budget.

## What kind of paper

A framework paper with a pilot. Its contribution is the vocabulary, the atlas and the experimental standard (regimes against each other, against an orchestrator and against one agent, at matched cost). It does not claim that swarms are better. The repository's own evidence so far says that on two synthetic tasks one deep agent is above every collective of shallow ones (`STATE.md`, rounds six to nine); the paper has to carry that plainly, and it is part of what makes the standard credible.

## Files

| File | Purpose |
|---|---|
| [`OUTLINE.md`](OUTLINE.md) | Section by section: what it must do, what feeds it, what is missing |
| [`VOCABULARY.md`](VOCABULARY.md) | The terms the paper defines. The main thing to agree with the Lab first |
| [`CLAIMS.md`](CLAIMS.md) | Every claim the paper intends to make, with evidence level, source path and gap |
| [`RESEARCH-NEEDS.md`](RESEARCH-NEEDS.md) | What the Lab has to produce before drafting, in order |
| [`GAPS.md`](GAPS.md) | Gap analysis of 2026-11-12: what each section has, what is missing, proposals for A1 to A5, order of work |
| [`FIGURES.md`](FIGURES.md) | Planned figures and tables, and the data each needs |
| [`draft/`](draft/) | The draft (LaTeX source and PDF, ten pages): every section written, with the pilot and one run on a public benchmark (section 6.5, CB2). Build: `tectonic bio-inspired-agentic-swarms-draft.tex` |

## Decided (owner, 2026-11-11)

- Title and subtitle as above; "Bio-Inspired Agentic Swarms" was not found as an existing paper title in a web search (repeat on Google Scholar before submission, `tasks/L2-RELATED-WORK-TO-READ.md`).
- P1 is the inception paper; the question-titled empirical paper is P2.
- Regimes are coordination regimes, not markets: Ants, Bees and Wasps are named presets of the same primitives, and the set is open.
- The pilot is fixed in scope so that it does not grow into P2.

## Decided (owner, 2026-11-12)

The five decisions A1 to A5 of `RESEARCH-NEEDS.md`, as proposed in `GAPS.md` and accepted:

- **A1** Five primitives: deposit, decay, threshold, quorum, recognition and inhibition. Working space per agent, the number of agents and the structure of the task are controls, not primitives.
- **A2** A regime is a rule over the field; who executes it (the runtime or the agents) is a parameter, and how the rule was obtained (by hand, or planned by a model) is stated with each result.
- **A3** Leaderless means that no agent assigns work to another. A fixed schedule is leaderless and is a baseline; "field-coordinated" and "bio-inspired" name the regimes the paper is about.
- **A4** The pilot is R1 with R2b, R3 and D6, each under its own preregistration. D4 and PD1 serve the discussion of A2.
- **A5** The word is "orchestrator".

Sections 3 and 4 of `draft/` are a first real draft written on these decisions (notation, regime table, presets, atlas with its inclusion rule). Section 6 (pilot) is also a first real draft: four settings (R1, R2b with D6, R3), results table and figure generated from the result files by `draft/make-figures.mjs`. Sections 7 (discussion), 8 (limitations) and the conclusion were rewritten from the results on 2026-11-12. Section 5 (related work) was rewritten on 2026-11-12 from ten papers read from the PDFs (`research/literature/pdf-readings/`). The abstract, introduction and background were written on 2026-11-12; the background quotes no quantity from the biological sources, because the number check (B4) is not done.

## Direction since the runs returned

`programs/historical/trigger.md` sets the axis the paper serves: what in a task decides that a swarm should form. R1, R2b and D4 (`CLAIMS.md`, E1 to E9) now bear on three of the open items below: the pilot is in practice R1 with R2b and D4 (item 1); the response to a trace can live in the agent while search was better kept in the runtime (item 2); and what the runs support is coordination through traces, with a coordinator adding nothing measurable at more cost (the meaning of "leaderless", decision A3). They are still decisions to take, now with data.

## Open, to settle with the Lab

Items 1 to 3 below were settled on 2026-11-12 (see "Decided" above); they are kept for the record. Items 4 and 5 are open.

1. **Which run is the pilot.** R1 (`tasks/R1-REGIMES-PREREG.md`) is preregistered and frozen and is the natural candidate. Its own limits section says it cannot speak to the cases where stigmergy is expected to matter (budget below full coverage, unknown structure). Either R1 is the pilot as it is, reported with that limit, or a second preregistered run under a partial-coverage budget joins it.
2. **How regimes are instantiated.** In R1 the stigmergic rule is a seeded choice rule in the harness and the model only reads and deposits. A paper about agentic swarms needs to say whether a regime is a rule around the agents or a behaviour of the agents, and to test at least one case of the second.
3. **The primitive set.** `VOCABULARY.md` proposes five. Whether recognition and inhibition are one primitive or two, and whether working space per agent is a primitive or a control, is open.
4. **How much of the human interface enters.** The edited condition of R1 is a perturbation of the field by an outside hand. P1 can introduce the idea in one paragraph and leave the study to P3.
5. **Authorship, venue and licence.** arXiv first (cs.MA, cross-list cs.AI) is the default assumption. The repository is private while `internal/` and unpublished runs are in it; what is released with the paper has to be decided.
