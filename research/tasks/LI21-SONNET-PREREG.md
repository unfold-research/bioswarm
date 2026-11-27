# LI21 preregistration: does the LI16 result hold with a stronger model? (2026-11-18)

**Status:** registered 2026-11-18 before any LI21 data. Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` in parallel with the other studies of sweep 2 (LI19, LI21, LI22, LI23; rule 9). Spec: `observatory/batch2/rc/sweeps/LI21.json`. Verdicts: `observatory/batch2/rc/verdict.mjs` (per-case sign test; act rounds exclude manager plan waves; Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. The owner directed (2026-11-18) that the remaining research budget be used; the shared ledger cap is [US$ redacted]

**Why.** LI16 and LI17 used Haiku 5.5 only. LI21 repeats the decisive comparison (waiting for the trace against a manager agent) with Claude Sonnet 5.5 at effort low. Still the Claude family; the cross-family test is LI20 (gpt-6-luna in the Colony).

**Arms.** `stigwait`, `manager`. 40 modules, seeds 21400 to 21407, 8 test inputs per check (as LI16).

## Hypotheses (the case is the unit)

- **H-LI61 (primary).** With Sonnet, waiting for the trace uses fewer tokens than a manager agent: `stigwait` against `manager` on `tokens`.
- **H-LI62.** With Sonnet, waiting for the trace finishes in fewer act rounds than a manager agent: `stigwait` against `manager` on `actRounds`.
- **H-LI63.** With Sonnet, a manager agent generalises better than waiting for the trace: `manager` against `stigwait` on `holdoutFailing`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
