# G3b: what actually carries the track hybrid, and the sensitivity G3a left open (preregistration, 2026-11-15)

Owner instruction, 2026-11-15: continue. Free: simulation only, no model call.

G3a closed with `track` as the one task where per-task selection still beats the best preset at both threat levels, and attributed that survival to the still-free perception edge (`dir()`, 0.9 for an informed member against 0.65). **Pilot runs done while designing this study contradict that attribution.** The pilot is reported in full below, before any test seed is read, because it changes what this study is for.

## Pilot (50 and 100 seeds from the test range, threat 0, `track`)

These ran before the protocol below was written. They are disclosed, not counted as results; the test seeds are read again for the registered tests only.

| Regime | Score |
|---|---|
| track task hybrid (`DEC-04, DEF-01, DEF-04, DOL-04, FLD-04, SIG-01, SIG-04`) | 0.836 |
| the same hybrid with the informed perception edge forced to 0.65 | **0.836** |
| the same hybrid with `DEC-04` removed | 0.811 |
| `DOL-04` alone (orchestrator) | **0.763** |
| independent members | 0.230 |

Ablating each flag of the hybrid (100 seeds):

| Removed | Score |
|---|---|
| — (full) | 0.836 |
| DOL-04 | **0.383** |
| DEC-04 | 0.811 |
| DEF-01 | 0.836 |
| DEF-04 | 0.841 |
| FLD-04 | 0.843 |
| SIG-01 | 0.836 |
| SIG-04 | 0.838 |

Two conclusions follow, and both belong to G3b rather than to G3a:

1. **The perception edge is not what carries `track`.** Setting it to 0.65 for everyone leaves the hybrid at 0.836. G3a's closing reading ("`track` pays through a second, still-free mechanism: the informed member's 0.9 direction accuracy") is wrong, and G3a's report needs correcting.
2. **The track hybrid is an orchestrator with decoration.** `DOL-04` alone reaches 0.763 of its 0.836, and removing `DOL-04` collapses it to 0.383, below the fixed schedule. Every other flag in the hybrid is worth 0.005 or less, and two of them cost slightly. The "selo" on `track` is a central leader, not a swarm mechanism.

This is the same shape as G2's H-G10 (the orchestrator matches or beats the archetypes) and it is the third time a result attributed to distributed mechanism turns out to be carried by centralisation.

## Question

If `track` is an orchestrator result, does anything in this world beat a centralised leader without being one? G3b answers that and closes the two open limitations of G3a.

## Instrument

Unchanged from G3a (`tasks/G3-DEC04-PREREG.md`, `observatory/genome/sim/engine.mjs`): ring of 160 sites, 24 members, 300 rounds, four tasks, 19 flags, archetypes compiled from G1, controls, threat 0 and 0.2, greedy selection on training seeds 2000–2039.

One new arm, and no change to any mechanism:

- **Leaderless orchestrator equivalent**: the orchestrator's assignment rule (`leaderAssign`) driven by a `DOL-04`-free regime, evaluated as a diagnostic only, to measure how much of the orchestrator's gain survives when the leader is removed. It is not added to the flag set and cannot be selected.

## Seeds

- **Test seeds 1000–1199**, 200 per cell, as in G2 and G3a. The pilot above already read 50–100 of them at threat 0 on `track`, so every `track` figure in this study is disclosed as seed-exposed in the report.
- **Training seeds 2000–2039** for selection, unchanged.
- **Sensitivity seeds 3000–3049** (new, never used): reserved for H-G20 only, so that the cap sensitivity is not tested on seeds the study already reads for other hypotheses.

## Hypotheses

| Id | Prediction | Test |
|---|---|---|
| H-G19 | The perception edge is not load-bearing: at threat 0 on `track`, the task hybrid scores within 0.02 with the informed edge set to 0.65 | paired by seed, 200 test seeds |
| H-G20 | G3a's open limitation is closed: school and the task hybrids change by less than 0.02 across `informedSense` of 0, 2, 4 and 8, on all four tasks at threat 0 | 50 sensitivity seeds, never used before |
| H-G21 | Centralisation is the whole `track` result: `DOL-04` alone scores at least 0.90 of the task hybrid on `track` at threat 0 | 200 test seeds |
| H-G22 | A leaderless regime beats the orchestrator on at least one task at threat 0.2, which no run of this project has yet shown | test seeds, all presets and hybrids |

H-G19 is a check on G3a's own reasoning, registered before the confirming run. H-G21 sets a numeric floor on "the hybrid is an orchestrator with decoration", so the claim is falsifiable rather than a reading. H-G22 is the substantive question and the one a later paid study would build on.

## Reading rules

- Sensitivity runs use seeds 3000–3049 only (H-G20). No other hypothesis may read them.
- H-G19 and H-G21 are decisions about how to describe existing results, not new mechanisms. If H-G21 holds, `track` stops counting as evidence for distributed coordination anywhere in the project.
- `track` results carry the seed-exposure disclosure in the report. All other tasks are clean.
- If H-G22 fails, the project's next paid study should not be built on a claim that a leaderless swarm beats a leader anywhere in this instrument.

## Outputs

`results/genome-g3b/`: `grid.json`, `ablation.json`, `sensitivity.json`, `analysis.json`, `REPORT.md`. A correction notice is appended to `results/genome-g3a/REPORT.md` for the perception-edge attribution.
