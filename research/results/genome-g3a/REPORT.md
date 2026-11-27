# G3a result: charging for the informed minority (2026-11-15)

Preregistration `tasks/G3-DEC04-PREREG.md`, written and committed before the test seeds ran. Simulator `observatory/genome/sim/`; the uncorrected engine is kept at `observatory/genome/sim-g2-ref/` for comparison. Free: no model call. 200 test seeds per cell (1000–1199), 40 training seeds for selection (2000–2039); `node observatory/genome/sim/run.mjs` (16 minutes on 12 workers). Everything below is **in the model**.

## Verdicts

| Id | Prediction | Verdict |
|---|---|---|
| H-G15 | The informed channel was carrying the school archetype | **supported** (2 of 4 tasks, exactly at threshold) |
| H-G16 | The chemical mass hybrid survives the cost | **supported, but the test did not test what it claimed** — see the erratum below |
| H-G17 | Flag selection still pays per task | **refuted** (1 of 4 tasks at threat 0, needed 2) |
| H-G18 | No general hybrid, still | **supported** (3 of 8 cells within 0.05) |

## The correction and what it touched

`DEC-04` used to read `task.truth()` over ±8 sites for free. It now surveys its own neighbourhood through the same noisy `sense()` every member uses, capped at 4 sites per round, paid out of the member's per-round action budget. The `track` perception edge (0.9 against 0.65) was left alone: it is a second, legitimate mechanism, and the pre-registration said so.

The result is a clean partition of the G2 table:

| Cell | G2 | G3a | Delta |
|---|---|---|---|
| maintain 0 school | 0.521 | 0.417 | −0.103 |
| maintain 0 independent | 0.501 | 0.501 | 0.000 |
| maintain 0.2 school | 0.460 | 0.364 | −0.096 |
| maintain 0.2 task-hybrid | 0.577 | 0.424 | −0.154 |
| mass 0 school | 0.171 | 0.080 | −0.091 |
| mass 0.2 school | 0.094 | 0.043 | −0.051 |
| pipeline 0 school | 0.609 | 0.536 | −0.073 |
| pipeline 0 task-hybrid | 0.823 | 0.712 | −0.111 |
| pipeline 0.2 task-hybrid | 0.739 | 0.610 | −0.129 |
| track 0 school | 0.644 | 0.644 | 0.000 |
| mass 0.2 task-hybrid | 0.452 | 0.452 | 0.000 |
| every orchestrator, independent and schedule cell | — | unchanged | 0.000 |

Every cell containing `DEC-04` moved or was superseded; every cell without it is bit-identical. The correction did exactly what it was meant to do and nothing else.

## H-G15: the school advantage shrinks (supported)

Paired by seed over the 200 test seeds, school minus independent:

| Task | G2 advantage | G3a advantage | Paired difference (G3a) |
|---|---|---|---|
| maintain | +0.019 | −0.084 | −0.084 ± 0.008 |
| track | +0.413 | +0.413 | +0.413 ± 0.014 |
| mass | +0.139 | +0.048 | +0.048 ± 0.008 |
| pipeline | −0.090 | −0.163 | −0.163 ± 0.006 |

The threshold was "shrinks by at least half on at least 2 of 4 main tasks at threat 0". `maintain` and `mass` shrink (the advantage goes negative, below zero and past half in both). `pipeline` was already negative in G2, so it cannot shrink; `track` does not move at all, because `track` uses the perception edge on line 53 and never calls the survey channel.

**The pre-registered threshold counted `pipeline`, which was already negative and so had nothing to shrink.** Read strictly, the hypothesis passes at exactly 2 of 4. Read charitably, only `mass` demonstrates a discounted free channel and `maintain` demonstrates the school archetype was never better than independent members at all. Both readings point the same way: the school archetype's apparent breadth in G2 was part of a free sensor that no other archetype had.

## H-G16: who was actually on trial

**Erratum.** H-G16 was registered as "the mass task hybrid under threat 0.2 still beats the orchestrator by at least 0.10", with the note that "the hybrid's winning flag is `DEC-04`". That note is wrong. Reading `selection.json` of both studies, the `mass` hybrid at threat 0.2 is `ACT-02, ACT-03, DEF-01, DOL-01, DOL-04, FLD-01, SIG-02`, in both runs, and `DEC-04` is not in it: the greedy probe removed `FLD-03` on the third step and `DEC-04` never entered. G2's own hybrids table, row `mass`, says the same.

So the pass is real and the margin is real (0.452 against 0.107, a margin of 0.345, unchanged), but it says nothing about the cost of the informed channel, because the informed channel is not in that regime. **H-G16 as written is satisfied trivially, since the correction could not have touched it.** It should be re-registered against a cell that actually contains `DEC-04`; the honest candidate is `track`, where the task hybrid keeps `DEC-04` and its score is unchanged at 0.838.

I did not edit the pre-registration after seeing the result. This erratum is the record.

## H-G17: per-task selection lost its teeth (refuted)

| Task | Threat 0 hybrid vs best preset | Threat 0.2 |
|---|---|---|
| maintain | 0.511 vs schedule 0.617 (−0.106) | 0.424 vs schedule 0.507 (−0.083) |
| track | 0.838 vs orchestrator+def 0.798 (+0.039) | 0.719 vs team 0.645 (+0.074) |
| mass | 0.530 vs orchestrator 0.559 (−0.029) | 0.452 vs orchestrator+def 0.381 (+0.071) |
| pipeline | 0.712 vs independent 0.699 (+0.012) | 0.610 vs independent 0.614 (−0.004) |

**1 of 4 at threat 0, 2 of 4 at threat 0.2.** The prediction needed 2 of 4 at both. G2's H-G13 was supported with 2 of 4 and 4 of 4.

This is the substantive loss. On the corrected engine, greedy selection beats the best preset only on `track` at both threat levels and on `mass` under threat. `maintain` never beats the fixed schedule, which no flag combination can reach, and `pipeline` never clears 0.03. G2's claim that per-task flag selection pays was carried in part by the free channel it was selecting for.

## H-G18: no general hybrid (supported)

The general hybrid is `DEC-04, DEF-01, DOL-04`, selected fresh. It lands within 0.05 of the best regime of each cell in **3 of 8** (`track` at 0, `mass` at 0, `mass` under threat). The prediction allowed at most 5 of 8. G2 found no general hybrid and the correction does not create one.

## Reading

1. **The correction was necessary and it cost G2 two results.** H-G13 (per-task selection pays) does not survive, and the school archetype stops being a broad baseline. The G2 grid should carry a correction notice on every `DEC-04` cell rather than be re-used as evidence.
2. **What survives is narrower and more interesting.** The `mass` hybrid is untouched by the correction and is still the clearest bio-engineering mix in the project: chemical recruitment plus a leader, castes, member recognition and a board with decay, 0.45 against 0.11 for an orchestrator. It never needed free information. Neither does the `track` hybrid.
3. **`track` is the only task where per-task selection still pays, and it pays through the perception edge, not the survey channel.** That edge is still free. If the next study charges for it, `track` is the cell to watch, and H-G16 should be re-registered against it.
4. **The fixed schedule remains unbeaten on `maintain` at both threat levels** (0.617 and 0.507), which no run of this project has yet touched. Any claim that a swarm beats engineering on upkeep is absent, not merely weak.

## Limits

- One world, one size (160 sites, 24 members, 300 rounds), four tasks designed by us.
- `informedSense = 4` and one action per read were declared before the run and not tuned. The outcome was not tested for sensitivity to them; a different cost could reverse `mass`.
- The correction charges the survey but leaves the `track` perception edge free, as registered. `track` results are therefore only partly corrected.
- Archetypes remain compiled from machine-coded G1 data with a 50% presence cut.

## Files

`grid.json` (all 160 preset cells plus the hybrids), `selection.json`, `analysis.json`, `run.log`. The uncorrected engine used for G2: `observatory/genome/sim-g2-ref/`.

## Correction notice for `results/genome-g2/REPORT.md`

The G2 grid is superseded on every cell whose regime contains `DEC-04`. Under the corrected engine (`results/genome-g3a/`), the school archetype falls on maintain (−0.10), mass (−0.09) and pipeline (−0.07) and does not move on track; the maintain and pipeline task hybrids fall by 0.11 to 0.15; and H-G13 (per-task selection beats presets) no longer holds at threat 0 (1 of 4). Every cell without `DEC-04` is unchanged. G2's note 6 named the defect correctly; its consequence was larger than a caveat.

## Correction notice (2026-11-15, after G3b)

Point 3 of the reading above attributed the survival of the `track` hybrid to "a second, still-free mechanism: the informed member's 0.9 direction accuracy". That mechanism is real but small: forcing it to 0.65 costs 0.041 of the hybrid's 0.838 (H-G19 refuted, `results/genome-g3b/`). What carries the hybrid is the central leader: `DOL-04` alone reproduces 0.916 of it, and removing `DOL-04` costs 0.466 (H-G21 supported). The correct attribution is centralisation, and `track` should not be cited as evidence for distributed coordination.

The limitation "the outcome was not tested for sensitivity to `informedSense`" is partly closed by H-G20: 7 of 8 cells are cap-invariant to four decimals; `pipeline`/school varies by 0.0224 between cap 0 and cap 2 and is flat from 2 to 8.
