# LI34 independent review

**Reviewer:** OpenAI Codex, gpt-6-luna (Colony bench, research bench automatic review); independent, read-only.

| Severity | Finding | Response |
|---|---|---|
| High | The stated verdict rule is underspecified relative to the hypothesis wording: per-case sign tests count only discordant cases, not the fraction of all 24 cases or size of effect. Verdicts are consistent with this rule, but “better in more cases with p < .05” compresses a test and directional comparison into one sentence. | — |
| Medium | Mechanisms are evidenced in requests: `stigwait` sends one module request per failing module with traces (sample wave-1 `stigwait-k80s34800-m66` includes trace schema); manager wave 1 is 12 planning calls, then wave 2 sends per-module acts. All arms have matching config hashes within each size, and wave 0 is a shared `start` batch (960 / 1,440 requests) against common instances. | — |
| Medium | Manager was not starved of its registered six act rounds: both sizes reached wave 12 (6 plan/act cycles), enabled by `managerSlack`; no truncation at k80, only 3 plans per arm at k120. | — |
| Medium | `stigwait` nearly solves fresh inputs; manager failures are concentrated in symmetric checks and often persist despite repeated revisions, consistent with incompatible interface/contract oscillation. The remaining one k120 stigwait failure is symmetric. | — |
| Low | Evidence is limited to 24 cases, one model family/provider and synthetic code tasks; sequential shared-round-0 execution, different arm request volumes, and multiple secondary outcomes invite generalization and multiplicity concerns. No cross-model confirmation. | — |
| Low | Spending stayed below per-size caps: actual wave-log sums are about [US$ redacted] (k80, cap [US$ redacted]) and [US$ redacted] (k120, cap [US$ redacted]), combined ~[US$ redacted] Ledger batch records are complete; the shared global ceiling is [US$ redacted] | — |

## Re-derived numbers

Counts from `analysis.json` and holdout per-case records agree. At k80, `stigwait` solved 12/12 in-run and holdout; manager 6/12 and 6/12. At k120, `stigwait` 11/12 and 11/12; manager 5/12 and 5/12. Combined: 23/24 vs 11/24 for both final and holdout. Holdout failing checks: zero in all stigwait cases; manager totals match its residual final failures (22 at k80, 37 at k120). Thus holdout verdict is a repeat of final, not independent case sampling.

| Hypothesis | a better | b better | Exact paired sign p | Verdict |
|---|---:|---:|---:|---|
| H-LI102 final | 13 | 1 | 0.0018311 | Supported |
| H-LI103 holdoutFailing | 13 | 1 | 0.0018311 | Supported |
| H-LI104 tokens | 22 | 2 | 0.00003588 | Supported; Holm p=0.00007176 |

The verdict file’s counts and outcomes match the preregistration rule (a is stigwait; lower final/holdout failures and lower tokens are better); Holm is applied to secondary hypotheses, not the primary. `tokensPerSolved` aggregates are [US$ redacted] versus [US$ redacted] tokens per solved instance. Final residual failing checks are 1 versus 59 overall, all symmetric (22+37); no local or directed failures. Means: at k80 manager 531,803 tokens/output and [US$ redacted] stigwait 365,540/[US$ redacted]; at k120 manager 596,651/[US$ redacted] stigwait 497,957/[US$ redacted] These are aggregates, not paired test metrics.

Fresh-input interpretation: the holdout file shows manager residuals in k80 seeds 34801–34803, 34806–34807, 34811 (2,3,5,1,3,9) and k120 seeds 34200, 34204–34205, 34207–34209, 34211 (5,6,2,1,6,14,3); stigwait has only one residual check at k120 seed 34202. Both arms’ holdout labels pass wherever final state is fully solved; this does not establish robustness beyond the 16 generated checks per case. Manager trajectories still decline, so six rounds may be insufficient for some cases.

**Not verified:** did not independently rerun provider requests, recompute all per-case tests from raw API outputs, or validate ledger accounting beyond recorded completed wave spend. No code or repository files other than this review were changed.
