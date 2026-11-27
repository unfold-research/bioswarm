# LI17 preregistration: clonal selection on top of waiting for the trace (2026-11-17)

**Status:** registered 2026-11-17 before any LI17 data. Haiku 5.5, Message Batches API, strict live check for feedback and scoring, 8 act rounds, sizes 40 and 80 modules (8 cases each), run with the other studies of the same sweep at the same time (rule 9) by `observatory/batch2/rc/sweep.mjs`. Spec (arms, seeds, caps, hypotheses): `observatory/batch2/rc/sweeps/LI17.json`. Verdicts: the generic `observatory/batch2/rc/verdict.mjs` (per-case sign test, Holm on secondary hypotheses). Mechanisms: `observatory/batch2/rc/mechanisms.mjs`. An independent review follows the standard prompt `docs/reviews/REVIEW-PROMPT.md`.

**Why.** LI14 tested clonal selection (several helper variants, the field keeps the best) on agents that acted on the symptom. LI17 combines it with waiting for the trace (LI16): does selecting among variants that follow the requirement add anything?

**Arms.** `clonalwait`, `stigwait`, `manager`. Seeds 17400 to 17407 and 17800 to 17807. Runs in parallel with LI16, so neither result informed the other.

## Hypotheses (16 cases pooled; the case is the unit)

- **H-LI54 (primary).** Clonal selection on top of waiting for the trace generalises better: `clonalwait` against `stigwait` on `holdoutFailing`.
- **H-LI55.** Clonal selection with waiting ends below a manager agent: `clonalwait` against `manager` on `final`.

Rule (all hypotheses): supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
