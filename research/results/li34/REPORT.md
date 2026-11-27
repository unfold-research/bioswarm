# LI34 report: waiting for the trace against a fairer manager (2026-11-19)

Preregistration: `tasks/LI34-MANAGER-FAIR-RERUN-PREREG.md`; Code: spec `observatory/batch2/rc/sweeps/LI34.json`. Data: `results/li34-k80/`, `results/li34-k120/`. Analysis: `results/li34/verdicts.json`. Review: `docs/reviews/LI34-REVIEW-LUNA-2026-11-19.md`. The preregistered design compares `stigwait` with `manager` on 12 cases each at 80 and 120 modules, using Haiku 5.5, six act rounds and 16 tests per check. The manager uses default effort, a 96,000-token plan budget and slack for replanning; both arms share the starting batch and instances.

| Size | Arm | Solved (final) | Holdout solved | Final failing checks | Mean output tokens | Mean US$ |
|---|---|---:|---:|---:|---:|---:|
| k80 | `stigwait` | 12/12 | 12/12 | 0 | 365,540 | [redacted] |
| k80 | `manager` | 6/12 | 6/12 | 22 | 531,803 | [redacted] |
| k120 | `stigwait` | 11/12 | 11/12 | 1 | 497,957 | [redacted] |
| k120 | `manager` | 5/12 | 5/12 | 37 | 596,651 | [redacted] |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI102 (primary): fewer final failing checks | **supported** | 13 to 1; p = 0.0018310546875 |
| H-LI103: fewer holdout failing checks | **supported** | 13 to 1; p = 0.0018310546875; Holm p = 0.0018310546875 |
| H-LI104: fewer tokens per case | **supported** | 22 to 2; p = 0.000035881996154785156; Holm p = 0.00007176399230957031 |

## What it shows

1. Across 24 cases, `stigwait` solved 23 and the manager 11. The final residual was 1 versus 59 failing checks; all 59 manager residuals and the one `stigwait` residual were symmetric. No local or directed failures remained. These counts are re-derived from the per-size analyses.
2. Holdout results match the final counts: 23/24 versus 11/24. Manager holdout residuals total 22 at k80 and 37 at k120; `stigwait` has one residual at k120. This is the same set of cases, not independent evidence. The per-case paired tests count discordant cases, not effect size or share of all cases.
3. Mean output tokens per case were lower for `stigwait` at both sizes (365,540 vs 531,803; 497,957 vs 596,651). Aggregate tokens per solved instance were 450,520 vs 1,231,040. Recorded mean cost was also lower at both sizes. Exploratory: these aggregates are not the registered paired token test.
4. The review reports that both arms reached wave 12; no k80 plans and three k120 plans per arm were truncated. The manager was not deprived of its six registered act rounds. Review evidence also describes repeated revisions with persistent symmetric failures, consistent with interface/contract oscillation; this is an interpretation, not a registered causal test.

## Limits

The review notes the preregistered verdict rule compresses a directional comparison and a sign test: the tests use discordant cases and do not express effect size or the fraction of all 24 cases. The mechanisms are evidenced in requests (traced per-module `stigwait` requests; manager planning then acts), matching config hashes within sizes, and a shared start batch; these logs do not establish causal mechanism. The manager reached the available rounds, but three plans per arm at k120 were truncated; its failure trajectory was still declining, so six rounds may not suffice for every case. Results cover only 24 synthetic cases, one model/provider, sequential shared-round-0 execution, and differing request volumes; secondary outcomes raise multiplicity concerns, and there is no cross-model confirmation. Holdout is based on 16 generated checks per check and is not broader robustness evidence. The review records spending below per-size caps ([US$ redacted] and [US$ redacted]): about [US$ redacted] at k80 and [US$ redacted] at k120 (about [US$ redacted] total), below the shared [US$ redacted] ceiling; ledger records were complete, but accounting was not independently validated. Provider requests and all raw per-case tests were not independently rerun.
