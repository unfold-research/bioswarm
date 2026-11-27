# LI35 preregistration: the LI16 comparison with Sonnet, with a cap that lets it finish (2026-11-19)

**Status:** registered 2026-11-19 before any LI35 data. Sonnet 5.5 (effort low), Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` as sweep 6 in parallel with the other sweep 6 studies and LI32 (rule 9), on the automatic bench where available. Verdicts: `verdict.mjs` (per-case sign test, Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. Study cap checked on expected spend. Funded by the owner's +[US$ redacted] on 2026-11-19 (ledger cap 300). Spec: `observatory/batch2/rc/sweeps/LI35.json`.

**Why.** LI21 tried this with Sonnet and was aborted at its cap after wave 1, before either arm could finish anything (the cap was checked on full reserves, now fixed). Every result of the line so far is Haiku in the batch bench; LI35 is the first complete check on a larger model.

**Arms.** `stigwait`, `manager` (`managerSlack` on). 12 cases at 40 modules (seeds 35400 to 35411), LI21's shape; 8 act rounds; member output up to 6,000 tokens, plans up to 24,000. Cap [US$ redacted]

## Hypotheses (12 cases; the case is the unit)

- **H-LI105 (primary).** With Sonnet, `stigwait` against `manager` on `holdoutFailing`.
- **H-LI106.** `stigwait` against `manager` on `tokens`.
- **H-LI107.** `stigwait` against `manager` on `actRounds`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
