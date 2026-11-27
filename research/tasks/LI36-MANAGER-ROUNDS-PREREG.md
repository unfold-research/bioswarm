# LI36 preregistration: waiting for the trace against a manager that gets twice the act rounds (2026-11-19)

**Status:** registered 2026-11-19 before any LI36 data, after the LI34 and LI35 reports and reviews were seen (disclosed). Haiku 5.5, Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` on the automatic research bench (benchhost). Verdicts: `verdict.mjs` (per-case sign test, Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. Study cap checked on expected spend. Spec: `observatory/batch2/rc/sweeps/LI36.json`.

**Why.** LI34 gave the manager default effort and a 96,000-token plan budget, and `stigwait` still solved 11 of 12 cases at 120 modules against 5 of 12. Its review noted that three plans per arm were truncated at 120 modules and that the manager's failing checks were still falling when its six act rounds ended (every residual was symmetric), so six rounds may not have been enough. LI36 changes one thing: **both arms get 12 act rounds** (`managerSlack` lets the manager re-plan and still reach them). Everything else is LI34: 120 modules, 240 directed and 80 symmetric edges, 16 test inputs per check, Haiku 5.5 with default effort and a 96,000-token plan budget.

**Arms.** `stigwait`, `manager`. 12 new cases (seeds 36200 to 36211). Cap [US$ redacted]

## Hypotheses (12 cases; the case is the unit)

- **H-LI108 (primary).** `stigwait` against `manager` on `final`.
- **H-LI109.** `stigwait` against `manager` on `holdoutFailing`.
- **H-LI110.** `stigwait` against `manager` on `tokens` (per case).

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive. Reported without a verdict: the manager's failing checks per wave (does it converge by round 12?), act rounds used, truncated plans.
