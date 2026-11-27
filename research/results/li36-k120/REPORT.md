# LI36 report: waiting for the trace against a manager with twelve act rounds (2026-11-20)

Preregistration: `tasks/LI36-MANAGER-ROUNDS-PREREG.md`; Code: spec `observatory/batch2/rc/sweeps/LI36.json`; Data: `results/li36-k120/`; Analysis: `results/li36/verdicts.json`; Review: `docs/reviews/LI36-REVIEW-LUNA-2026-11-20.md`. The preregistered design compares `stigwait` with `manager` on 12 paired, 120-module synthetic code cases, using Haiku 5.5/default effort, strict live scoring, and 12 act rounds for each arm. Both arms otherwise use the LI34 setup (240 directed and 80 symmetric edges, 16 test inputs per check); `managerSlack` allows manager plan waves without reducing its 12 member-act rounds. LI34/35 results were known before registration, as disclosed in the preregistration.

| Arm | Solved (strict check) | Pass on fresh inputs | Mean output tokens per case | Mean cost per case | Calls | Truncated |
|---|---:|---:|---:|---:|---:|---:|
| `stigwait` | 12 of 12 | 12 of 12 | 496,493 | [US$ redacted] | 3,102 | 0 |
| `manager` | 12 of 12 | 12 of 12 | 585,523 | [US$ redacted] | 2,701 | 0 |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI108 (primary): fewer final failing checks | inconclusive | 0 better cases for either arm; p = 1 |
| H-LI109: fewer checks failing on fresh inputs | inconclusive | 0 better cases for either arm; p = 1, Holm p = 1 |
| H-LI110: fewer tokens per case | supported | `stigwait` better in 11 cases, manager in 1; p = 0.00634765625, Holm p = 0.0126953125 |

## What it shows

1. **With twelve act rounds, final correctness ties.** Both arms solve all 12 cases with zero final failing checks, and all 12 cases pass holdout checks in both arms. There is no evidence of a final-quality advantage for waiting.
2. **The manager converges more slowly in the recorded mean trajectory.** In example k120s36210, failing checks fall from 321 to 0 by `stigwait`'s fourth act wave; the manager falls from 321 to 0 by its twelfth member-act round, with plan waves between acts. Across cases, mean failures decline to 0.17 by `stigwait` wave 4 and 0 by wave 5; the manager trajectory reaches 0 only after act round 12. Exploratory (not a registered hypothesis): these trajectory and round comparisons.
3. **Waiting uses fewer output tokens, not fewer calls.** Its mean output tokens are about 15% lower per case, consistent with H-LI110; the manager made fewer calls (2,701 versus 3,102). Exploratory (not a registered hypothesis): mean estimated cost was also lower for `stigwait`.

## Limits

Only 12 paired synthetic code cases, one model family/version, and one configuration were tested; generalization is limited. Earlier LI34/35 results were known before registration, although this was disclosed and the secondary token/holdout tests use Holm correction. The reviewer confirmed sampled `stigwait` wave-1 requests contain trace instructions/data, manager requests include plan calls followed by member acts, and the shared wave 0 has 1,440 start requests; both arms share round 0, model/configuration, 120-module cases and strict scoring. These checks support the setup but not a final-quality difference. The reviewer found [US$ redacted] total against the [US$ redacted] cap; reserve, submit and reconcile ledger entries for every batch; reconciled batch requests/results (including wave 2 split 2,052 + 539); successful statuses; and zero truncations. Both arms pass generated fresh-input task checks, but these are not external software tests; the review did not independently recompute strict scoring from every raw result or rerun model calls.
