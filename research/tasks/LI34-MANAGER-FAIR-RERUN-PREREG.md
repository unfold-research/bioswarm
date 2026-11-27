# LI34 preregistration: waiting for the trace against a manager that gets its plans and its act rounds (2026-11-19)

**Status:** registered 2026-11-19 before any LI34 data, after the LI24 and LI30 reviews were seen (disclosed). Haiku 5.5, Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` as sweep 6 in parallel with the other sweep 6 studies and LI32 (rule 9), on the automatic bench where available. Verdicts: `verdict.mjs` (per-case sign test, Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. Study cap checked on expected spend. Funded by the owner's +[US$ redacted] on 2026-11-19 (ledger cap 300). Spec: `observatory/batch2/rc/sweeps/LI34.json`.

**Why.** LI24 meant to separate "slower" from "worse" for the manager, but at 120 modules its plans were cut off by adaptive thinking (92% of plan output) and a hidden wave limit starved cases of act rounds; LI30 lowered the manager's effort and that made plans worse. LI34 reruns LI24's design with the fixes the LI24 review listed: the manager keeps **default effort** with a **96,000-token plan budget** (twice LI24's), and `managerSlack` lets the run go to 3 × rounds + 1 waves so a re-planned case still gets its 6 act rounds. Reported for each case: act rounds, truncated plans.

**Arms.** `stigwait`, `manager`. 12 cases at 80 modules (seeds 34800 to 34811; 160 directed, 80 symmetric) and 12 at 120 (seeds 34200 to 34211; 240 directed, 80 symmetric); 16 test inputs per check; 6 act rounds. Caps [US$ redacted] and [US$ redacted]

## Hypotheses (24 cases; the case is the unit)

- **H-LI102 (primary).** `stigwait` against `manager` on `final`.
- **H-LI103.** `stigwait` against `manager` on `holdoutFailing`.
- **H-LI104.** `stigwait` against `manager` on `tokens` (per case).

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
