# G3a: charging for the informed minority (preregistration, 2026-11-15)

Owner request, 2026-11-15: after G2, correct the one mechanism the G2 report flagged as unearned, then re-run the G2 grid against the corrected engine. Free: simulation only, no model call.

G2 note 6 (`results/genome-g2/REPORT.md`) records the defect: the flag `DEC-04` (informed-minority guidance) "is implemented as a fifth of the members sensing the truth within 8 sites at no cost. It wins partly because it is free information, which no other flag adds. Any claim about 'informed minorities' from this run should be read with that in mind; the next version should charge for it."

G3a is that next version, restricted to the defect. Nothing else in the engine changes.

## The defect, precisely

In `observatory/genome/sim/engine.mjs` at the commit before this study, `DEC-04` did two things:

1. **Line 214, the unearned channel.** A member flagged `informed` scanned ±`2 * p.radius` (= 8 sites) around its position and wrote `task.truth(w, s)` into its own knowledge, with no observation, no noise, no cost and no action spent: `if (a.informed) for (let d = -2 * p.radius; d <= 2 * p.radius; d++) { const s = wrap(a.pos + d, p.M), tr = task.truth(w, s); if (tr.need > 0) latest(k, { s, v: 1, kind: tr.kind, t: w.t, author: a.id }); }`. A perfect sensor over 17 sites, every round, free.
2. **Line 50, the perception edge.** In `track` only, the direction guess succeeds with `p = 0.9` for an informed member against `0.65` for everyone else.

Item 2 is a legitimate mechanism: better information is what an experienced member has. It stays, and it stays free, because G2 already showed it is not what carries `mass` or `pipeline` (line 50 is reached only in `track`). Item 1 is the defect: it is not guidance, it is omniscience.

## The correction

`DEC-04` keeps its role but pays for its channel. Three changes, and no others:

- **An informed member senses like everyone else.** `sense(w, a, s)` decides what it learns at a site; `truth(w, s)` no longer reaches it.
- **The channel costs actions.** Each site an informed member reads beyond the one it stands on costs one unit of the same action budget every member spends. Reading a site it would have visited anyway is free.
- **The channel is bounded by `radius`, not `2 * radius`.** The informed member surveys its own neighbourhood rather than a corridor twice the sensing range.

The declared constant, set once here and not tuned against test seeds: **`informedSense = 4` sites per round, at one action per site beyond the member's own.** That is the whole of the treatment.

Everything else is frozen at the G2 commit: world (`M`, `N`, `R`), task loads, archetype compilation, controls, threat, greedy selection, seeds.

## Instrument

Unchanged from G2 (`tasks/G2-ARCHETYPES-PREREG.md`) except the treatment above:

- World: ring of 160 sites, 24 members, 300 rounds; one unit of budget per action, equal across regimes.
- Tasks: `maintain` (colony home), `track` (flock), `mass` (chemical), `pipeline` (team), plus `maintain-scattered` as exploratory.
- `FLAGS`: the same 19 traits of `catalog/genome/traits.json` with a mechanism.
- Archetypes: compiled from the G1 matrix, no hand edit (`observatory/genome/sim/regimes.mjs`).
- Controls: independent members, fixed schedule, orchestrator, board with decay.
- Threat: 0 or 0.2 compromised non-leaders.
- Flag selection: greedy from the best training preset, one flag at a time, keep a change if the training mean improves by more than 0.005, at most 6 steps; per task and threat, and once on the mean over all 8 cells.

## Seeds

- **Development seeds 9000–9199:** not reused. They calibrated the G2 task loads against the *uncorrected* engine, and the correction changes how much the informed channel sees. Loads are **not** recalibrated: recalibration would change the tasks and destroy the comparison with G2.
- **Training seeds 2000–2039:** unchanged, for the greedy selection, so the selection path is comparable.
- **Test seeds 1000–1199:** unchanged, 200 per cell, used only for the numbers below. Not read while the protocol was being written; the smoke run uses seeds 5000–5007 and its output is deleted unread, as in G2.

## Hypotheses

| Id | Prediction | Test | What G2 said |
|---|---|---|---|
| H-G15 | The informed channel was carrying the archetype: under the correction, the `school` archetype's advantage over independent members shrinks by at least half on at least 2 of the 4 main tasks at threat 0 | school vs independent, G2 grid against G3a grid, per task means | school was at or above independent on maintain (0.52 vs 0.50), track (0.64 vs 0.23), pipeline (0.61 vs 0.70) |
| H-G16 | The chemical hybrid survives: the `mass` task hybrid under threat 0.2 still beats the orchestrator by at least 0.10 | task hybrid vs orchestrator, test seeds, threat 0.2 | hybrid 0.45 against orchestrator 0.11, a margin of 0.34 |
| H-G17 | Flag selection still pays per task: the task hybrid beats the best preset by at least 0.03 on at least 2 of 4 tasks at each threat level, under the correction | test seeds | H-G13 supported on the uncorrected engine |
| H-G18 | No general hybrid, still: the general hybrid is within 0.05 of the best regime of each cell in at most 5 of 8 cells | test seeds | H-G14 refuted; the general hybrid was `school` unchanged |

H-G15 tests whether G2's headline mechanism was an artifact. H-G16 tests the G2 report's own strongest positive claim where the defect was most load-bearing. H-G17 and H-G18 re-test, on the corrected engine, the two selection results a later study would build on.

Every comparison reports the mean over 200 test seeds with a 95% interval (normal approximation on per-seed scores, as in G2). A difference smaller than the sum of the two half-widths is reported as not separable. H-G15 compares two runs of the same test seeds, so it is a paired comparison and is reported with the paired standard error of the per-seed difference.

## Reading rules

- This is a model of mechanisms, not of LLM agents. A result says what a mechanism does in this world; it does not say an LLM swarm would show it.
- A refutation of H-G15 does not rescue G2. If the school advantage does **not** shrink, the correction changed nothing and G2's note 6 was wrong about this being what carried it; if it shrinks, G2's grid is superseded on every cell where `DEC-04` entered, and `results/genome-g2/REPORT.md` gets a correction notice pointing here rather than a quietly edited table.
- G2's results on cells without `DEC-04` stay valid. The correction touches only members flagged `informed`, which exist only when `DEC-04` is on.
- The declared `informedSense = 4` is not tuned. If the outcome is sensitive to it, that is reported as a limit, not repaired by trying other values on test seeds.

## Outputs

`results/genome-g3a/`: `grid.json`, `selection.json`, `analysis.json`, `REPORT.md`, `run.log`. A correction notice is appended to `results/genome-g2/REPORT.md`. Hypotheses H-G15…H-G18 are registered in `hypotheses/` with `status: registered` until the test seeds run.
