# P1 gap analysis (2026-11-12)

Where the paper stands against its own outline, after the runs of 2026-11-11 and 11-12, the benchmark survey (`research/benchmarks/README.md`) and the CooperBench pilot (`results/cb1-cooperbench/REPORT.md`). It replaces nothing: `OUTLINE.md`, `CLAIMS.md` and `RESEARCH-NEEDS.md` remain the working files. This page orders what is missing.

## State in one paragraph

There is no draft yet. `draft/` is a four-page layout preview with placeholders and no result. What exists is the architecture (outline, vocabulary proposal, claims ledger, figure plan) and, since the architecture was written, most of the empirical material: 17 empirical claims with reports, a consolidated table, six corrections. The parts of the paper that are its stated contribution, the notation and the atlas, have not been started. The five decisions that block them (A1 to A5) are still open. The paper is therefore further along on evidence than on the framework it is supposed to deliver.

## Section by section

| Section | Needs | Have | Missing | Blocked by |
|---|---|---|---|---|
| 1 Introduction | a public, checkable cost of the lead-agent pattern | internal case (not citable); now two public candidates: CooperBench's own result (pairs about 30% below solo, abstract checked) and our pilot reproducing it at small scale (solo 5 of 5, two agents 2 of 5, all three failures merge conflicts) | read the CooperBench paper from the PDF; decide whether the pilot is enlarged enough to cite (50 pairs, about [US$ redacted] to 8) | – |
| 2 Background | five or six mechanisms with one verified number each | 53 nature cards | the number check against primary sources (B4); the choice of mechanisms | A1 |
| 3 Framework | notation; regimes as points in one space; presets | vocabulary proposal; five regimes written as code in R1; the ring engine with six regimes as one spec | **the notation itself, the regime table, preset values. Not started. This is the core of the paper** | A1, A2, A3, A5 |
| 4 Atlas | one table: species, mechanism, primitive, problem class, hypothesis, evidence | cards for eight of nine plates | **the table, the problem-class column, the inclusion rule, the sardine card. Not started** | A1 |
| 5 Related work | positioning with numbers checked from PDFs | first reading of five sources; a survey of about 60 works in `research/benchmarks/` with 122 claims marked unverified | PDF reading of the six or seven works the paper is positioned against (Pressure Fields, ScaleMAS, the two SwarmBench papers, Scaling Agent Systems, Science of Collective AI, CooperBench); the related-work table rebuilt from it | – |
| 6 Pilot | one preregistered comparison reported in full | R1 returned; so did R2b, R3, D4, D6 with reports and a reproduction script for 13 tables (`observatory/batch2/kernel/export-regimes.mjs`) | decision on scope (A4); figures 3 to 5 and table T5, which can be generated today; the decay ablation with power (D5) | A4 |
| 7 Discussion | when a collective is expected to pay, and what would refute the framework | `programs/historical/trigger.md` and claims E7 to E17 | writing | pilot scope |
| 8 Limitations | – | each preregistration's limits; the lab's own statement that its tasks are simple | writing | – |
| Appendices | prereg, prompts, seeds, ledger; simulation cards | all in git | assembly; release plan (the repository is private) | owner |

## What changed since the architecture was written

1. **The paper's "what existing work leaves untested" is confirmed and sharpened by the survey.** No published work compares a collective with the best single agent at matched total tokens and finds the collective ahead on a task the agent already handles; biological mechanisms are almost never ablated, and where they are the effect is weak (per the survey's reading of Pressure Fields: decay 29 of 30 against 26 of 30). The paper's standard of comparison is its strongest card. Every one of these statements is still unverified against a PDF.
2. **Two works published in 2026 are close and must be read before the framing is fixed**: ScaleMAS (arXiv 2610.16120: shared store with reinforcement, 128 agents, ablation, agent loss, against agent-centric and blackboard baselines) and SwarmWorld (2608.26081). If ScaleMAS has a full-budget single-agent arm, F1 and F3 change.
3. **The pilot is no longer one run.** R1 alone is at ceiling and says little. What the data supports as a pilot is a three-part result: full coverage (R1: a schedule is enough, an orchestrator adds nothing), partial coverage with local change (R2b, D6: following traces beats the schedule; one agent with the whole budget equals the small orchestrator), and the boundary (R3: the same rule loses when change is scattered or a trace is false).
4. **The lab's own evidence is against the easy version of the thesis**, and the paper already planned to say so: one agent with working space is above every collective of shallow agents (replicated at 300 tasks per family), a vote adds nothing, decay shows no effect at the sample used.
5. **The owner's objection of 2026-11-12**: the tasks are simple. For a framework paper with a pilot this is a limitation to state, not a blocker, provided the paper does not generalise. It becomes a blocker if the paper is read as evidence about swarms on complex work; that is P2 and the benchmark.

## The real gaps, in order

1. **Decisions A1 to A5.** Nothing in sections 3 and 4 can be written without them. Proposals, with what the data now says:
   - *A1 primitive set*: keep five (deposit, decay, threshold, quorum, recognition and inhibition). Working space per agent is a control, not a primitive: it is the largest effect measured and belongs to the agent, not to coordination.
   - *A2 rule in the harness or behaviour of the agent*: say both exist and report both. D4 and D4b: agents respond to traces (90% of choices) and do not explore unless told why. PD1: the rule itself can be obtained from a model that plans once and then run as code. Proposed wording: a regime is a rule over the field; who executes it (runtime or agent) is a parameter.
   - *A3 leaderless*: define it as "no agent assigns work to another". A fixed schedule is then leaderless and is a baseline, not a bio-inspired regime. The data fits: an orchestrator added nothing measurable over a schedule (R1) or over a rule given the same signal (R2b), and inherited the rule's failure (R3).
   - *A4 pilot*: R1 with R2b, R3 and D6, reported as one preregistered sequence, each with its own preregistration. D4 goes to the discussion of A2.
   - *A5*: "orchestrator".
2. **The framework and the atlas (C1 to C4).** Free, and the contribution. The regimes already exist as code; the notation is a matter of writing them down in one table.
3. **Reading from PDFs (B1, B2b).** Free. It decides the framing claims F1, F3 and F5 and may move them.
4. **Evidence for the primitives.** The paper names five primitives; LLM evidence exists for two and a half:

   | Primitive | LLM evidence in the repository | Status |
   |---|---|---|
   | deposit | R2, R2b, D4, D6 | supported under partial coverage with local change; bounded by R3 |
   | decay | R1 only | no effect at 30 trials; not a test with power (D5 open) |
   | threshold | T1, with simulated readers | rules beat a model that decides; no real readers |
   | quorum | none with a quorum rule; votes add nothing (V-series, REP1) | untested as a mechanism; the simulation predictions failed |
   | recognition and inhibition | C1b (attribution raises quarantine) | one study, synthetic, not replicated |

   The paper can present the primitives as vocabulary with this table as its honest evidence column, or run D5 and one quorum study first. Both are cheap on the current instrument (under [US$ redacted] each).
5. **One exhibit on a real benchmark.** Not required by the outline; it answers the objection in point 5 above and gives section 1 a public number. The candidate is CooperBench with a third arm of ours, a shared claim board on the files being edited, against solo and messaging, on the 50-pair subset: about [US$ redacted] to 8 per run with a small model. It tests one primitive (deposit) on real repositories where the loss to explain is merge conflicts.
6. **Figures and tables.** Fig 3 to 5, T4 and T5 can be generated now from returned data. Fig 1, Fig 2, T1 to T3 wait for items 1 to 3.
7. **Before submission**: release plan, a reproduction script for every number, an outside reading of the vocabulary, the title search on Google Scholar, authorship and venue.

## Progress

- 2026-11-12: A1 to A5 accepted by the owner as proposed. Sections 3 and 4 written in `draft/` (notation, regime table, presets, atlas with inclusion rule). Section 6 written from returned data (four settings, one table and one figure generated by `draft/make-figures.mjs`). Writing it showed that the pilot's arms are matched in reads and not in tokens: the single agent of settings B and C cost 37% more than the schedule. The section says so. Next: the PDFs of the neighbouring works and section 5; then D5 and a quorum study; sections 1, 7, 8 and the abstract last.

- 2026-11-12, later: ten neighbouring papers read from the PDFs. Section 5 and its table rewritten; F1 reworded (the equal-budget comparison exists for orchestrated and message-passing systems), F3 holds, F5 confirmed, F4 has a public source. Two claims withdrawn from the paper: novelty of reinforcement with decay on a shared store (ScaleMAS) and ownership of the equal-budget standard (Fan et al.). Sections 7 and 8 and the conclusion rewritten from the results. Left: introduction, background with the number check, abstract; D5 and a quorum study; the systematic search.

- 2026-11-12, later still: D5 and Q1 returned. Decay: supported as a discount on old counts (+0.26 at 150 collections), not as fading marks; R1 was underpowered. Quorum: works as a stopping rule; one deeper agent beats it at a third of the tokens. The evidence column for the primitives is now: deposit supported with bounds; decay supported in one form; threshold and quorum supported as stopping rules only; recognition one unreplicated study.

- 2026-11-12, end of day: abstract, introduction, background and an appendix of runs written. The draft is complete in the sense that no section is a placeholder.

- 2026-11-12, night: CB2 returned (`results/cb2-cooperbench/REPORT.md`). The paper has its result on a public benchmark: section 6.5, the abstract, atlas row VI, the limitations and the conclusion carry it. A shared work product recovered about half of the loss two agents suffer against one; messaging almost none; no cooperating arm above one agent.

## What is left before the draft can circulate

1. **A systematic search (B2)** for regime comparisons and equal-budget comparisons. F3 and the "what is left untested" paragraph are absence claims resting on ten papers and one survey.
2. **Finish the two partial readings** (SwarmWorld pp. 32 to 38 and 47 to 57; MusicSwarm supplement) and look at the figures of the papers read from the text layer.
3. **The response function attributed to Bonabeau et al. (1996)** in section 3 was checked only in a secondary source (`research/nature/nat-response-threshold.md`); open the original or cite the form generically.
4. **The pilot is matched in reads, not tokens.** Either rerun settings B and C with a token cap per arm, or keep the statement as it is. The single agent and the orchestrator are the arms affected.
5. **Scale of the evidence.** One synthetic task and one public benchmark, both with one small model. The benchmark exhibit exists (CB2) as one pass on 50 pairs with arms not matched in cost; a second seed, a second model and the fourth cell (messages with the shared remote) are what a reviewer would ask for next. A board of declared intentions, as distinct from visible work, is still untested.
6. **Recognition and inhibition** has one unreplicated study; threshold has simulated readers only; quorum over unequal options is untested.
7. **Biological numbers (B4)**: the background now quotes none. Adding one verified number per mechanism is optional.
8. **Before submission**: release plan for code, data and preregistrations; a reading by someone outside the repository; the title search on Google Scholar; authorship and venue; a figure 2 legend in the order of the bars.

## Suggested order of work (written before the draft existed; kept for the record)

1. The owner settles A1 to A5 (the proposals above can be accepted as they are).
2. Sections 3 and 4 written as a first real draft: notation, regime table, presets, atlas table.
3. Section 6 written from returned data, with its figures.
4. PDFs of the seven neighbouring works read; section 5 and the framing claims rewritten.
5. D5 (decay with power) and one quorum study, if the evidence column is to be less thin.
6. The CooperBench exhibit, if the paper is to carry one real-benchmark result.
7. Sections 1, 7, 8 and the abstract last.
