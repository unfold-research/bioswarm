# G2: natural archetypes as artificial swarms, and flag selection (preregistration, 2026-11-13)

Owner request, 2026-11-13: after G1, simulate the natural archetypes as swarms (line L3) and start designing a hybrid by flag selection. Free: simulation only, no model call.

## Instrument

- **World** (`observatory/genome/sim/engine.mjs`): a ring of 160 sites, 24 members, 300 rounds; each member visits one site per round, senses it with noise, can work it, and moves up to 4 sites (1 in TRACK). Every member action counts as one unit of budget; all regimes have the same members and rounds.
- **Tasks**, one per archetype home in nature:
  - `maintain` (colony): damage appears at 2 per round, 80% of it next to earlier damage; score = share of damage repaired within 8 rounds. A `maintain-scattered` variant (no locality) is reported as exploratory.
  - `track` (flock): a target drifts; members sense its direction correctly with probability 0.65 and see it only within one site; score = share of members within 3 sites of it.
  - `mass` (chemical collective): prey appears at 0.15 per round for 15 rounds and is taken only when 4 honest members stand on it in the same round; score = share taken.
  - `pipeline` (team): jobs of 3 stages, each needing one of 3 skills, appear at 1.2 per round for 20 rounds; score = share completed.
- **Mechanisms**: 19 traits of `catalog/genome/traits.json` have a mechanism (list `FLAGS` in the engine; each one is a few lines of the engine, readable there). The other 20 traits are not simulated.
- **Archetypes** (`observatory/genome/sim/regimes.mjs`) are compiled from the G1 matrix with no hand edit: for each G1 cluster with at least three systems, a trait enters when at least half the systems have it present by consensus, then only traits with a mechanism are kept:

| Archetype (G1 cluster, n) | Flags | Not simulated |
|---|---|---|
| colony (27) | FLD-03, SIG-01, DEF-01, FLD-01, ACT-03, DOL-01, REG-05, SIG-02, FLD-04 | DOL-03, DEF-06, REG-01 |
| flock (7) | SIG-06 | REG-04 |
| school (3) | SIG-06, FLD-04, DEC-04 | — |
| team (6) | FLD-04, DEF-01, DOL-04, DEF-04, SIG-01, SIG-04, REG-05 | — |
| chemical (7) | SIG-02, ACT-02, SIG-06, FLD-01, FLD-03, ACT-03, DOL-01, DEF-01 | DOL-06 |

- **Engineering controls**: independent members (no flag), a fixed schedule (members sweep the ring evenly, no communication), an orchestrator (DOL-04 alone: one member reads every report and assigns the rest), a shared board with decay (FLD-01 + FLD-02).
- **Threat**: 0 or 0.2 of the non-leader members are compromised: they do no work, report the opposite of what is at their site, and lure with chemical signal when SIG-02 is on.
- **Flag selection**: greedy, starting from the best preset on the training seeds, toggling one of the 19 flags at a time and keeping the best change if it improves the training mean by more than 0.005, at most 6 steps. Per task and threat ("task hybrid"), and once on the mean over all 8 task × threat cells ("general hybrid").

## Seeds

Development seeds 9000–9199 were used to calibrate the task loads so that independent members score well below 1 (maintain rate, pipeline rate and life, world size). **Seen during calibration, threat 0, 10–12 seeds:** independent members scored 0.49, 0.24, 0.04, 0.70 on maintain, track, mass, pipeline; colony and chemical were below independent members on maintain and pipeline; team was at or near the best of the regimes tried on every task; the shared hub without decay (FLD-03 alone) cut maintain from 0.85 to 0.56 in an earlier, smaller world. Threat, flag selection and the school archetype were not run. Training seeds for selection: 2000–2039. **Test seeds: 1000–1199**, 200 per cell, used only for the numbers below.

## Hypotheses

| Id | Prediction | Test | Expected from calibration |
|---|---|---|---|
| H-G08 | Home field: each of colony, flock, chemical and team ranks first among the five archetypes on its home task | at threat 0; supported if it holds on at least 3 of 4 | refuted |
| H-G09 | No universal archetype: no archetype is within 0.05 of the best regime (presets and controls) on all four tasks at threat 0 | best per task over 9 presets | uncertain (team) |
| H-G10 | The orchestrator matches the best archetype: orchestrator ≥ best archetype − 0.02 on at least 3 of 4 tasks at threat 0 | per task means | supported |
| H-G11 | Reading others costs under threat: from threat 0 to 0.2, the mean loss of the regimes that read others' claims (orchestrator, board, colony, chemical, team) exceeds the loss of independent members by at least 0.05, averaged over the four tasks | mean losses | — |
| H-G12 | Defence flags recover: adding DEF-01 + DEF-04 at threat 0.2 recovers at least half the threat loss, averaged over the four tasks, for at least 2 of: orchestrator, board, best archetype | recovered / lost | — |
| H-G13 | Flag selection beats presets: the task hybrid beats the best preset by at least 0.03 on at least 2 of 4 tasks, at each threat level | test seeds | — |
| H-G14 | One general hybrid suffices: the general hybrid is within 0.05 of the best regime of each cell (presets and task hybrids) in at least 6 of 8 cells | test seeds | — |

Every comparison reports the mean over 200 test seeds with a 95% interval (normal approximation on per-seed scores). A difference smaller than the sum of the two half-widths is reported as not separable.

## Reading rules

- This is a model of mechanisms, not of LLM agents. A result says what a mechanism does in this world; it does not say an LLM swarm would show it. Each mechanism's constants are set once and are listed in `P` of the engine.
- Archetypes are compiled from machine-coded data (G1) and keep its limits.
- An archetype that does badly does badly as compiled: with the traits that half its species share, without the traits we could not simulate, at this world's scale.

## Outputs

`results/genome-g2/`: `grid.json`, `selection.json`, `analysis.json`, `REPORT.md`; the atlas gains a view of the grid and the hybrids.
