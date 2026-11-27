# LI36 independent review

**Reviewer:** openai-codex/gpt-6-luna (Colony bench, research bench automatic review)

| Severity | Finding | Response |
|---|---|---|
| Medium | **No evidence for the primary superiority claim.** Both arms finish with zero failing checks in every paired case; primary exact sign test is all ties (p=1), appropriately inconclusive. | — |
| Medium | **The registered mechanism and matching conditions are evidenced.** Sampled `stigwait` wave-1 requests contain the trace instructions/data; manager requests include explicit `-plan` calls followed by member acts. Common wave 0 has 1,440 `start` requests (120 modules × 12 instances) and each arm’s state records its round 0 as shared. Both use Haiku 5.5/default effort, same 120-module instances and strict live scoring. | — |
| Medium | **Caps and ledger appear respected.** `run.log` reports [US$ redacted] total against LI36’s [US$ redacted] cap; ledger has reserve, submit and reconcile records for every LI36 batch. Batch requests/results reconcile (including split wave 2: 2,052 + 539); all statuses succeeded, zero truncations. | — |
| Medium | **Convergence differs, although both eventually solve.** Example case k120s36210: `stigwait` falls 321→239→31→2→0 by its fourth act wave. Manager alternates plan/act; failures fall 321→88→42→21→10→3→2→1→0, reaching zero only at its 12th member-act round. These trajectories support slower convergence, not a final-quality advantage. | — |
| Low | **Interpret cautiously:** only 12 paired synthetic code cases, one model family/version, and one configuration. Prior LI34/35 results were known before registration (disclosed); the three-hypothesis family includes Holm correction for the two secondary tests, but small n and synthetic tasks constrain generalization. | — |
| Low | **Fresh-input failures do not explain a difference:** strict holdout reports 12/12 pass in each arm and zero failing checks per case. Thus no sampled fresh-input failure to attribute; fresh checks remain generated task tests, not external software. | — |

## Re-derived numbers

- **Final solved:** stigwait 12/12; manager 12/12. Final failing checks: 0 vs 0; local, directed and symmetric: all zero. **Holdout:** 12/12 vs 12/12 pass; zero failing checks in all 24 arm-case outcomes.
- **H-LI108 final:** ties 12, stigwait better 0, manager better 0; exact paired sign p=1, **inconclusive**.
- **H-LI109 holdoutFailing:** ties 12, wins 0–0; p=1, Holm p=1, **inconclusive**.
- **H-LI110 output tokens:** stigwait better in 11 cases, manager in 1; exact two-sided sign p=0.0063477, Holm p=0.0126953; **supported** under preregistered rule. Average output tokens/case: 496,493 vs 585,523 (about 15% lower for stigwait). This is not a claim of fewer failing checks.
- Analysis reports 3,102 vs 2,701 calls, estimated mean costs [US$ redacted] vs [US$ redacted]/case, no truncations. The final completed manager action is wave 16 (12 act rounds, with intervening plans); managerSlack therefore prevented plan waves from displacing the registered 12 member-act rounds.

Verdict logic matches preregistration’s direction and exact paired sign-test rule; it correctly labels ties inconclusive, with Holm on secondary hypotheses. The reported tokens comparison is per-case, not aggregate solved count. Evidence inspected: preregistration, sweep spec, state/analysis/holdout/verdict JSON, run log, raw requests/results and ledger records. Read-only review; did not rerun model calls or independently recompute strict scoring from every raw result.
