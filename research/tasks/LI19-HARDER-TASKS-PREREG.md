# LI19 preregistration: harder tasks, equal wave budget (2026-11-18)

**Status:** registered 2026-11-18 before any LI19 data. Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` in parallel with the other studies of sweep 2 (LI19, LI21, LI22, LI23; rule 9). Spec: `observatory/batch2/rc/sweeps/LI19.json`. Verdicts: `observatory/batch2/rc/verdict.mjs` (per-case sign test; act rounds exclude manager plan waves; Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. The owner directed (2026-11-18) that the remaining research budget be used; the shared ledger cap is [US$ redacted]

**Why.** LI16 and LI17 hit the ceiling (every arm solved 16 of 16), so they could show cost and speed but not who solves more. LI19 makes the tasks harder: 80 and 120 modules, twice as many directed edges (2k) and 80 symmetric ones (the record-name pool holds 82), 16 test inputs per check, only 6 waves, and the same wave budget for every arm (`waveBudget`: the manager's plan waves count, LI13 review).

**Arms.** `stigwait` (LI16), `manager`, `routed`, `oracle` (reference). Seeds 19800 to 19807 (80 modules) and 19200 to 19207 (120). Haiku 5.5.

## Hypotheses (the case is the unit)

- **H-LI58 (primary).** On harder tasks with an equal wave budget, waiting for the trace ends with fewer failing checks than a manager agent: `stigwait` against `manager` on `final`.
- **H-LI59.** On harder tasks, waiting for the trace leaves fewer checks failing on fresh inputs than a manager agent: `stigwait` against `manager` on `holdoutFailing`.
- **H-LI60.** On harder tasks, waiting for the trace ends below the geometry router: `stigwait` against `routed` on `final`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
