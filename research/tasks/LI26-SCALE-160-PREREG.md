# LI26 preregistration: 160 modules, where one manager must hold everything (2026-11-18)

**Status:** registered 2026-11-18 before any LI26 data. Haiku 5.5, Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` as sweep 3, in parallel with the end of sweep 2 and LI20 (rule 9). Spec: `observatory/batch2/rc/sweeps/LI26.json`. Verdicts: `verdict.mjs` (per-case sign test; act rounds exclude manager plan waves; `wavesToSolve` counts every wave; Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. Registered after sweep 2's raw solved counts were seen, which motivated LI24; disclosed here.

**Why.** The natural-collective claim is about scale: no single member needs to hold the whole problem. LI26 grows the codebase to 160 modules (160 directed and 80 symmetric edges, 16 test inputs per check, 6 act rounds, the manager's plan waves on top, manager output up to 64,000 tokens per plan).

**Arms.** `stigwait`, `manager`. Seeds 26600 to 26607.

## Hypotheses (the case is the unit)

- **H-LI74 (primary).** At 160 modules with equal act rounds, waiting for the trace ends with fewer failing checks than a manager agent: `stigwait` against `manager` on `final`.
- **H-LI75.** At 160 modules, waiting for the trace leaves fewer checks failing on fresh inputs than a manager agent: `stigwait` against `manager` on `holdoutFailing`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
