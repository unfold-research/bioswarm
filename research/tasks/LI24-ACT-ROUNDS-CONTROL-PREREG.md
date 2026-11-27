# LI24 preregistration: harder tasks with equal act rounds (control for LI19 and LI23) (2026-11-18)

**Status:** registered 2026-11-18 before any LI24 data. Haiku 5.5, Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` as sweep 3, in parallel with the end of sweep 2 and LI20 (rule 9). Spec: `observatory/batch2/rc/sweeps/LI24.json`. Verdicts: `verdict.mjs` (per-case sign test; act rounds exclude manager plan waves; `wavesToSolve` counts every wave; Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. Registered after sweep 2's raw solved counts were seen, which motivated LI24; disclosed here.

**Why.** In sweep 2's raw counts (LI19, LI23: before analysis), the manager solved nothing under an equal wave budget, while waiting for the trace solved nearly every case. An equal wave budget halves the manager's act rounds, because it plans in every other wave. LI24 separates "slower" from "worse": the same harder tasks as LI19 (2k directed edges, 80 symmetric, 16 test inputs) with 6 act rounds for every arm, the manager's plan waves on top (no wave budget).

**Arms.** `stigwait`, `manager`. Seeds 24800 to 24807 (80 modules) and 24200 to 24207 (120).

## Hypotheses (the case is the unit)

- **H-LI71 (primary).** On harder tasks with equal act rounds (manager plan waves extra), waiting for the trace still ends with fewer failing checks than a manager agent: `stigwait` against `manager` on `final`.
- **H-LI72.** On harder tasks, waiting for the trace solves in fewer waves than a manager agent: `stigwait` against `manager` on `wavesToSolve`.
- **H-LI73.** On harder tasks, waiting for the trace uses fewer tokens than a manager agent: `stigwait` against `manager` on `tokens`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
