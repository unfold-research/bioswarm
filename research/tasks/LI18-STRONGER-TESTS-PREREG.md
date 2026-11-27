# LI18 preregistration: do weak test suites explain the generalisation gap? (2026-11-17)

**Status:** registered 2026-11-17 before any LI18 data. Haiku 5.5, Message Batches API, strict live check for feedback and scoring, 8 act rounds, sizes 40 and 80 modules (8 cases each), run with the other studies of the same sweep at the same time (rule 9) by `observatory/batch2/rc/sweep.mjs`. Spec (arms, seeds, caps, hypotheses): `observatory/batch2/rc/sweeps/LI18.json`. Verdicts: the generic `observatory/batch2/rc/verdict.mjs` (per-case sign test, Holm on secondary hypotheses). Mechanisms: `observatory/batch2/rc/mechanisms.mjs`. An independent review follows the standard prompt `docs/reviews/REVIEW-PROMPT.md`.

**Why.** LI12 to LI13 used 8 test inputs per check; the reviews found several hold-out failures whose requirement was constant on those 8 inputs, or near-miss functions equal on them. LI18 doubles the inputs per check to 16 (more chances for a wrong helper to show) and asks whether the manager's advantage on fresh inputs survives.

**Arms.** `stig`, `manager`, `routed`, 16 test inputs per check. Seeds 18400 to 18407 and 18800 to 18807.

## Hypotheses (16 cases pooled; the case is the unit)

- **H-LI56 (primary).** With 16 test inputs per check the manager still generalises better than agent traces: `manager` against `stig` on `holdoutFailing`.
- **H-LI57.** With 16 test inputs per check the manager still generalises better than the router: `manager` against `routed` on `holdoutFailing`.

Rule (all hypotheses): supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
