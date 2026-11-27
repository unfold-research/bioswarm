# LI23 preregistration: losing members with an equal wave budget (2026-11-18)

**Status:** registered 2026-11-18 before any LI23 data. Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` in parallel with the other studies of sweep 2 (LI19, LI21, LI22, LI23; rule 9). Spec: `observatory/batch2/rc/sweeps/LI23.json`. Verdicts: `observatory/batch2/rc/verdict.mjs` (per-case sign test; act rounds exclude manager plan waves; Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. The owner directed (2026-11-18) that the remaining research budget be used; the shared ledger cap is [US$ redacted]

**Why.** LI13 found the manager robust to losing members, but the review showed its lost plans were retried at no cost and time was not scored, and the runner ended one run early. LI23 repeats member loss (20% of members and the manager's plan down each wave, the same members in every arm) with the same 8-wave budget for every arm, plan waves included, and the runner fixed so a wave emptied by loss does not end the run.

**Arms.** `stigwait`, `manager`, `routed`. Seeds 23400 to 23407 (40 modules) and 23800 to 23807 (80).

## Hypotheses (the case is the unit)

- **H-LI66 (primary).** Under member loss and an equal wave budget, waiting for the trace ends with fewer failing checks than a manager agent: `stigwait` against `manager` on `final`.
- **H-LI67.** Under member loss, waiting for the trace ends below the geometry router: `stigwait` against `routed` on `final`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
