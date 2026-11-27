# G3b result: what actually carries the track hybrid (2026-11-15)

Preregistration `tasks/G3B-TRACK-PREREG.md`, written before the registered run and after a disclosed pilot. Free: no model call. Test seeds 1000–1199 (200 per cell); sensitivity seeds 3000–3049, used for H-G20 only; `node observatory/genome/sim/g3b.mjs` (3.5 minutes on 12 workers). Everything below is **in the model**.

## Verdicts

| Id | Prediction | Verdict |
|---|---|---|
| H-G19 | The informed perception edge is not load-bearing on track | **refuted** |
| H-G20 | G3a's result does not depend on the survey cap | **refuted** (1 of 8 cells) |
| H-G21 | The track hybrid is an orchestrator with decoration | **supported** (ratio 0.916) |
| H-G22 | A leaderless regime beats the orchestrator under threat | **supported, but on a degenerate case** |

## H-G19: refuted, and the pilot was wrong

Registered: the track hybrid scores within 0.02 with the informed edge forced to 0.65. Measured over 200 test seeds, paired:

- edge 0.9: **0.8376**
- edge 0.65: **0.7962**
- paired difference **0.0414 ± 0.0074**, separable

The edge is worth **0.041**, not nothing. My pilot said 0.836 against 0.836; that was 100 seeds on a subsample of the same range, and it was wrong. The pre-registration states the pilot as disclosed evidence that the edge is not load-bearing; the registered run refutes that reading. **G3a's closing attribution was accidentally right**: the edge does contribute. The lesson is about my own method, not the model: a 50–100 seed pilot is not enough to settle a 0.04 effect, and I nearly wrote it into two documents as a fact.

## H-G21: supported

`DOL-04` alone reaches **0.7673** against the hybrid's **0.8376**, a ratio of **0.916** (threshold 0.90). The ablation makes the shape plain:

| Flag removed | Hybrid score lost |
|---|---|
| DOL-04 | **0.4663** |
| DEC-04 | 0.0316 |
| FLD-04 | −0.0039 (costs slightly) |
| SIG-04 | −0.0039 (costs slightly) |
| DEF-04 | −0.0017 |
| DEF-01 | −0.0011 |
| SIG-01 | 0.0002 |

One central leader is worth 0.47; the six other flags together are worth 0.03, and two of them cost. The track hybrid is an orchestrator with decoration, and `track` no longer counts as evidence for distributed coordination anywhere in this project.

## H-G22: supported, but do not read it as a swarm result

| Task | Best leaderless | Score | Best orchestrated | Score | Paired | Verdict |
|---|---|---|---|---|---|---|
| maintain | fixed schedule | 0.5065 | orchestrator | 0.3974 | +0.109 ± 0.005 | separable |
| pipeline | **independent members** | 0.6142 | orchestrator | 0.5071 | +0.107 ± 0.006 | separable |
| track | school | 0.6285 | orchestrator+defence | 0.6386 | −0.010 ± 0.019 | not separable |
| mass | board | 0.1054 | orchestrator+defence | 0.3813 | −0.276 ± 0.014 | loses badly |

The hypothesis is satisfied: a `DOL-04`-free regime beats the orchestrator under threat on two tasks, separably. But both winners are degenerate:

- On `pipeline`, the winner is **independent members with no flags at all** — no coordination of any kind. That is not a swarm beating a leader; it is the task not needing one ("independent" 0.6142 against "school" 0.4650 and "chemical" 0.2210 in the same cell). Read against the orchestrator alone, coordinateless agents win because coordination costs here and the threat punishes anyone reading a shared channel.
- On `maintain`, the winner is the **fixed schedule**, which communicates nothing by construction. G2's H-G08 already showed the schedule unbeaten on upkeep at both threat levels.

Neither winner is a leaderless *collective*. A regime with no communication is the null model, and reporting it as a swarm victory would be the same error as G2's free channel, in the opposite direction. **The honest reading: no leaderless collective mechanism beats a centralized one anywhere in this instrument.** H-G22 should be re-registered with "leaderless regime" excluding the schedule and excluding empty flag sets, and under that reading this run does not support it.

## H-G20: refuted on one cell

Seven of eight cells are cap-invariant to four decimals, most exactly zero. The exception:

| Task | Regime | cap 0 | cap 2 | cap 4 | cap 8 | Range |
|---|---|---|---|---|---|---|
| pipeline | school | 0.5666 | 0.5451 | 0.5442 | 0.5442 | **0.0224** |

The preregistered threshold was 0.02 in every cell, so H-G20 is refuted. The failure is small and has a clear shape: the effect is between cap 0 and cap 2 and flat afterwards, so it is the presence of the survey, not the declared cap of 4, that matters. G3a's numbers are not a artifact of choosing 4 — caps 4 and 8 are identical — but the limitation G3a listed as untested turns out to matter at the second decimal.

## What this leaves

1. **The track result is a leader result.** Stated in G3a as "the one task where per-task selection still pays"; the payment is 0.47 of centralisation and 0.03 of everything else.
2. **The mass hybrid remains the project's one clean swarm-shaped result**: untouched by the G3a correction, 0.452 against 0.107 for the orchestrator under threat, built from recruitment, castes, recognition and a decaying board rather than a leader.
3. **No leaderless collective wins anywhere.** Nine studies into the swarm programme, and the centralised control is beaten only by doing nothing or by a script.
4. **The defence agenda now has a target.** `programs/defence.md` requires a threat model before any defence experiment. This run supplies the case that needs defending: `mass` under threat is the only regime that a compromised minority does not gut, and it is the only one worth protecting in a paid study.

## Limits

- One world, one size, four tasks designed by us; `informedSense` sensitivity is now measured (H-G20) and is non-zero at the second decimal on one cell.
- `track` test seeds were partly seen in the disclosed pilot (H-G19, H-G21). The pilot's error on H-G19 is exactly the risk this creates; the registered numbers supersede it, but `track` figures in this report are not seed-clean in the way the other tasks are.
- H-G22 is satisfied as written and does not support the claim it was written to test. It is reported as a registration defect, not repaired after the fact.

## Files

`grid.json`, `ablation.json`, `sensitivity.json`, `analysis.json`, `run.log`.

## Correction notice for `results/genome-g3a/REPORT.md`

G3a's closing reading attributed the survival of the `track` hybrid to a "second, still-free mechanism: the informed member's 0.9 direction accuracy". That mechanism is real but worth 0.041, not the hybrid's survival: `DOL-04` alone reproduces 0.916 of the hybrid and removing it costs 0.47 (H-G21, this study). The correct attribution is centralisation. G3a's H-G15, H-G17 and H-G18 verdicts are unaffected, and its note that the survey cap was not tested is now partly closed (H-G20: invariant on 7 of 8 cells, 0.0224 on one).
