# LI27 preregistration: the trace or the tie-break? (80 and 160 modules) (2026-11-18)

**Status:** registered 2026-11-18 before any LI27 data, after LI26's verdicts and review were seen (disclosed). Haiku 5.5, Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` as sweep 4, in parallel with the end of LI24, with LI28 and with LI29 (rule 9). Spec: `observatory/batch2/rc/sweeps/LI27.json`. Verdicts: `verdict.mjs` (per-case sign test pooled over both sizes; Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. A stop at the study cap now ends the run as incomplete (exit 3, no summary, no verdicts), after the LI21 review.

**Why.** LI26 ended 4 to 0 for waiting for the trace against a manager at 160 modules (inconclusive with 8 cases). Its review found that every check the manager left failing was a symmetric one (an encoder and decoder pair) where the manager kept rewriting both sides, while `stigwait` sends each failing symmetric check to one side by a hash tie-break, and traces exist only on directed checks. So LI26 compared "tie-break plus trace" with "a manager without a tie-break". LI27 adds `stigwait_both`: the same trace rule with both sides acting on a failing symmetric check (no tie-break). It runs at two sizes in the same sweep and counts tokens per case, as the review asked.

**Arms.** `stigwait`, `stigwait_both`, `manager` (6 act rounds each, the manager's plan waves on top). 12 cases per size: seeds 27800 to 27811 (80 modules) and 27600 to 27611 (160 modules); 160 directed and 80 symmetric edges, 16 test inputs per check. Caps [US$ redacted] and [US$ redacted]

## Hypotheses (24 cases; the case is the unit)

- **H-LI76 (primary).** Without the one-side tie-break on symmetric checks, waiting for the trace still ends with fewer failing checks than a manager agent: `stigwait_both` against `manager` on `final`.
- **H-LI77.** The one-side tie-break lowers failing checks when waiting for the trace: `stigwait` against `stigwait_both` on `final`.
- **H-LI78.** Waiting for the trace uses fewer tokens per case than a manager agent: `stigwait` against `manager` on `tokens`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive. Reported without a hypothesis: `stigwait` against `manager` on `final` (the LI26 comparison) and each size apart.
