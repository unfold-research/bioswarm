# LI22 preregistration: do traces need to persist? (2026-11-18)

**Status:** registered 2026-11-18 before any LI22 data. Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` in parallel with the other studies of sweep 2 (LI19, LI21, LI22, LI23; rule 9). Spec: `observatory/batch2/rc/sweeps/LI22.json`. Verdicts: `observatory/batch2/rc/verdict.mjs` (per-case sign test; act rounds exclude manager plan waves; Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. The owner directed (2026-11-18) that the remaining research budget be used; the shared ledger cap is [US$ redacted]

**Why.** Pheromone trails evaporate (`docs/NATURE-MECHANISMS.md`, row 7). In `stigwait` a trace stays on the check until rewritten. LI22 lets traces evaporate one or three waves after they were written, unless the caller rewrites them.

**Arms.** `stigwait`, `stigwait_evap1`, `stigwait_evap3`. 40 modules, seeds 22400 to 22407.

## Hypotheses (the case is the unit)

- **H-LI64 (primary).** Persistent traces end with fewer failing checks than traces that evaporate after one wave: `stigwait` against `stigwait_evap1` on `final`.
- **H-LI65.** Traces lasting three waves end below traces lasting one: `stigwait_evap3` against `stigwait_evap1` on `final`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
