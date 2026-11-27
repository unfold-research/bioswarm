# LI30 preregistration: the trace or the tie-break, against a manager that gets its act rounds (2026-11-19)

**Status:** registered 2026-11-19 before any LI30 data, after the LI24 verdicts and review were seen (disclosed); LI27's 160-module run was still in progress and its counts were not looked at. Haiku 5.5, Message Batches API, strict live check, sweep 5 with LI28R (rule 9). Spec: `observatory/batch2/rc/sweeps/LI30.json`. Verdicts: `verdict.mjs`. Review: `docs/reviews/REVIEW-PROMPT.md`.

**Why.** LI27's 80-module run stopped at its study cap (incomplete), and the LI24 review found that the manager's plans hit the output limit because of adaptive thinking (92% of plan output at 120 modules), so truncated plans re-planned and the runner's wave limit starved some cases of act rounds. LI30 repeats LI27's three arms at 80 modules with a fairer manager: plans at **low effort** (`managerEffort: low`, members unchanged), and room for extra plan waves (`managerSlack`: the run goes on to 3 × rounds + 1 waves; the manager still stops at 6 act rounds). The cap is checked on expected spend (see LI28R).

**Arms.** `stigwait`, `stigwait_both` (both sides act on a failing symmetric check: no tie-break), `manager`. Seeds 30800 to 30811 (12 cases), 160 directed and 80 symmetric edges, 16 test inputs per check. Cap [US$ redacted]

## Hypotheses (the case is the unit)

- **H-LI87 (primary).** With a manager that plans at low effort and gets its act rounds, waiting for the trace without the tie-break still ends with fewer failing checks: `stigwait_both` against `manager` on `final`.
- **H-LI88.** The tie-break lowers failing checks when waiting for the trace: `stigwait` against `stigwait_both` on `final`.
- **H-LI89.** Waiting for the trace ends with fewer failing checks than the fair manager: `stigwait` against `manager` on `final`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive. Also reported: manager act rounds per case, truncated plans, tokens per case.
