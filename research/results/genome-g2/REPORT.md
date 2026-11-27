# G2 result: natural archetypes as simulated swarms, and flag selection (2026-11-13)

Preregistration `tasks/G2-ARCHETYPES-PREREG.md` (commit 2693020, pushed before the test seeds ran). Simulator `observatory/genome/sim/`. Free: no model call. 200 test seeds per cell (1000–1199), 40 training seeds for selection (2000–2039); run `node observatory/genome/sim/run.mjs` (16 minutes on 10 workers), then `analyze.mjs`. Everything below is **in the model**: it says what these mechanisms do in this world, not what an LLM swarm would do.

A smoke run of the runner used test seeds 1000–1007; its numbers were not read and its output was deleted before the full run.

## Grid (mean of 200 seeds; 95% half-widths are 0.01 or less everywhere)

| Regime | maintain | track | mass | pipeline | maintain (scattered) |
|---|---|---|---|---|---|
| *threat 0* | | | | | |
| independent members | 0.50 | 0.23 | 0.03 | 0.70 | 0.56 |
| fixed schedule | **0.62** | 0.04 | 0.00 | 0.22 | **0.62** |
| orchestrator | 0.52 | 0.77 | **0.56** | 0.58 | 0.45 |
| board with decay | 0.51 | 0.37 | 0.29 | 0.65 | 0.57 |
| colony | 0.23 | 0.37 | 0.22 | 0.17 | 0.32 |
| flock | 0.39 | 0.49 | 0.08 | 0.32 | 0.47 |
| school | 0.52 | 0.64 | 0.17 | 0.61 | 0.62 |
| team | 0.31 | 0.80 | 0.20 | 0.42 | 0.32 |
| chemical | 0.25 | 0.64 | 0.29 | 0.17 | 0.35 |
| task hybrid | 0.51 | **0.84** | 0.53 | **0.82** | — |
| *threat 0.2* | | | | | |
| independent members | 0.42 | 0.24 | 0.02 | 0.61 | 0.49 |
| fixed schedule | 0.51 | 0.04 | 0.00 | 0.11 | 0.51 |
| orchestrator | 0.40 | 0.05 | 0.11 | 0.51 | 0.36 |
| orchestrator + defence | 0.40 | 0.64 | 0.38 | 0.32 | 0.35 |
| board with decay | 0.28 | 0.16 | 0.11 | 0.32 | 0.34 |
| board + defence | 0.43 | 0.34 | 0.16 | 0.57 | 0.49 |
| school | 0.46 | 0.63 | 0.09 | 0.53 | **0.55** |
| team | 0.24 | 0.65 | 0.09 | 0.22 | 0.25 |
| chemical | 0.22 | 0.46 | 0.23 | 0.17 | 0.24 |
| task hybrid | **0.58** | **0.72** | **0.45** | **0.74** | — |

Full table with every defence variant and the actions used: `analysis.json`, `table`.

## Hypotheses

| Id | Verdict | Numbers |
|---|---|---|
| H-G08 home field | **refuted** (1 of 4) | only chemical wins at home (mass 0.29). Maintain: school 0.52, colony 0.23. Track: team 0.80, flock 0.49. Pipeline: school 0.61, team 0.42 |
| H-G09 no universal archetype | **supported** | smallest worst-case gap: school, 0.39 behind the best on mass |
| H-G10 orchestrator ≥ best archetype − 0.02 | **refuted** (2 of 4) | holds on maintain and mass; misses track (0.77 vs team 0.80) and pipeline (0.58 vs school 0.61) |
| H-G11 reading others costs under threat | **supported** | regimes that read claims lose 0.16 on average, independent members 0.04; the orchestrator loses 0.34 (track 0.77 → 0.05) |
| H-G12 defence recovers half the loss | **refuted** (1 of 3) | board recovers 67%, orchestrator 49% (just under), and the best archetype under threat (school) reads no claims, so it has nothing to recover |
| H-G13 flag selection beats presets | **supported** | threat 0: track +0.04, pipeline +0.12 (maintain −0.11, mass −0.03); threat 0.2: +0.07, +0.07, +0.22, +0.13 on all four |
| H-G14 one general hybrid suffices | **refuted** (0 of 8) | the greedy search found no toggle that improved the school archetype on the mean over all cells, so the general hybrid is school; it is 0.09 to 0.39 behind the best of each cell |

## What the hybrids are

| Task | Threat 0 | Threat 0.2 |
|---|---|---|
| maintain | DOL-04, SIG-01 | DEC-04, FLD-04, SIG-04 |
| track | DEC-04, DEF-01, DEF-04, DOL-04, FLD-04, SIG-01, SIG-04 | DEC-04, DEF-01, DEF-04, DOL-04, REG-05, SIG-01, SIG-04 |
| mass | ACT-02, DOL-04 | ACT-02, ACT-03, DEF-01, DOL-01, DOL-04, FLD-01, SIG-02 |
| pipeline | DEC-04, DEF-04 | DEC-04 |
| general | DEC-04, FLD-04, SIG-06 (the school archetype unchanged) | |

The mass hybrid under threat is the clearest bio-engineering mix: the chemical archetype's recruitment and density switch, plus a leader, castes and member recognition. It scores 0.45 where the orchestrator alone scores 0.11 and the chemical archetype 0.23.

## Reading

1. **Natural archetypes, compiled as "the traits most of the cluster shares", are poor swarms in this world.** Colony and chemical score below independent members on maintain and pipeline. The single-flag table says why: a shared hub without decay (FLD-03, −0.18 on maintain, −0.45 on pipeline), neighbour coupling (SIG-06, −0.38 on pipeline), resting members (REG-05, −0.21 and −0.25) and castes (DOL-01, −0.12 on pipeline) each cost here, and the colony carries three of them. A trait that is common in nature is not a trait that helps an artificial swarm. Prevalence measures what survived under nature's constraints (energy, development, kinship), not what is useful for a task.
2. **Home field fails.** The archetype whose home is a task does not win it, except the chemical collective on mass. Matching the ecology does not pick the mechanism.
3. **Reading others is the vulnerability.** When a fifth of the members lie, the orchestrator loses 0.34 and the board 0.24 on average, against 0.04 for independent members; colony (0.02) and chemical (0.06) lose little only because they were already low. The orchestrator, the strongest regime without threat on track and mass, collapses on track.
4. **Defence helps where claims are the only channel, and can hurt where they are not.** Recognition plus a shared blacklist caught all five compromised members and no honest one on a simple board (10 dev seeds). But on regimes with a chemical signal, the blacklist made things worse (colony 0.20 → 0.15, chemical 0.22 → 0.15 on maintain). Ignoring the liars' claims leaves members without a target, and they fall back on the chemical gradient, which has no author and which the compromised members keep emitting. A defence that filters the attributed channel pushes the swarm onto the unattributed one. This is the same shape as C1b on real models (unattributed content raised behaviour; `results/batch2-c1b-label/REPORT.md`).
5. **Flag selection works per task, not in general.** Greedy toggling beat every preset under threat on all four tasks, by 0.07 to 0.22. One hybrid for all tasks did not exist in this search.
6. **Caveat on DEC-04.** The flag that enters most hybrids, informed minority, is implemented as a fifth of the members sensing the truth within 8 sites at no cost. It wins partly because it is free information, which no other flag adds. Any claim about "informed minorities" from this run should be read with that in mind; the next version should charge for it.

## Limits

- One world, one size (160 sites, 24 members, 300 rounds), hand-set constants (`P` in the engine), four tasks designed by us. A different world can reverse any of the rankings.
- Archetypes are compiled from machine-coded data with a 50% presence cut; 20 of 39 traits have no mechanism, including colony's reproductive division, repair and homeostasis.
- The greedy search could not toggle into the fixed schedule, which is why the maintain hybrid at threat 0 is below it.
- The engine was edited after the run to also return the composition of the shared blacklist (`sharedBad`, `sharedHonest`) for the diagnosis in point 4; scores are unchanged by that edit.

## Files

`grid.json` (all cells, presets, archetypes), `selection.json` (selection paths), `analysis.json` (tests, table, single-flag effects), `run.log`, `htext.json` (hypothesis captions for the atlas).

## Correction notice (2026-11-15)

Superseded on every cell whose regime contains `DEC-04`, by `results/genome-g3a/` (`tasks/G3-DEC04-PREREG.md`). `DEC-04` used to sense the truth over ±8 sites for free; charged for it, the school archetype falls on maintain (−0.10), mass (−0.09) and pipeline (−0.07) and does not move on track. The maintain and pipeline task hybrids fall by 0.11 to 0.15. **H-G13 no longer holds at threat 0** (1 of 4 tasks, needed 2), and H-G14 still holds (3 of 8 cells). Every regime without `DEC-04` is unchanged. Note 6 above named the defect correctly; its consequence was larger than a caveat. The hybrids table row `mass` is unaffected and remains valid.
