# LI41 independent review

**Reviewer:** openai-codex/gpt-6-luna (research bench automatic review)

| Severity | Finding | Response |
|---|---|---|
| High | All 12 cases solved on both arms and all 12 pass fresh holdout. Thus the striking result is convergence speed, not final correctness or generalization separation. H-LI123 is supported (12–0; exact two-sided sign p=.000488). | — |
| High | The reported waves-to-solve advantage follows the registered metric, including manager plan waves, but measures the full protocol (stigwait trace-driven action vs manager planning), not an isolated mechanism effect. | — |
| Medium | Mechanism evidence: stigwait requests include trace/peer coordination activity; manager requests include centralized plan waves. Shared initial wave is present for both arms; the spec fixes the same 160-module instances/seeds and round-0 state. | — |
| Medium | Both arms hit zero failures; no cap/ledger violation apparent. Request manifests reconcile as complete; registered [US$ redacted] cap, shared-ledger authorizations and per-wave accounting are consistent with recorded spend. | — |
| Medium | Four hypotheses were tested; Holm applies only to secondary LI124–126 as preregistered. LI126 survives Holm (p=.0190), but H-LI123 is primary and unadjusted exactly as registered. Small n=12 and paired binary signs limit precision. | — |
| Low | Scope is narrow: one model family (Haiku 5.5), synthetic coupled code tasks, 12 seeds, and manager’s whole-state plans may make wave latency protocol-dependent. Prior LI38 result was known, although prereg states seeds were fresh and design unchanged. | — |

## Re-derived numbers

**Solved / holdout:** stigwait 12/12; manager 12/12. Holdout failures: 0/12 each (every per-case entry is zero). Final strict failures: 0 each; by kind local/directed/symmetric = 0/0/0. Mean output tokens/case: 609,969 vs 685,747; mean estimated cost: [US$ redacted] vs [US$ redacted] Calls: 4,069 vs 3,149; truncations 2 vs 1.

**Verdicts:** LI123 wavesToSolve: stigwait better 12, manager 0, ties 0; p=.00048828125 → supported. LI124 final: 0/0, p=1 → inconclusive (Holm 1). LI125 holdoutFailing: 0/0, p=1 → inconclusive (Holm 1). LI126 tokens: 11/1, p=.00634765625; Holm=.01904296875 → supported. These follow the preregistered rule (sign test, first arm wins with p<.05; refuted only if second arm wins more cases); no verdict mismatch found.

**Sampled results / interpretation:** Mean trajectories show stigwait failures 399→319.33→39.75→0.58→0 by wave 4; manager 399→399→96.17→96.17→38.17→38.17→14→14→6.75→6.75→2.42→2.42→1.08→1.08→0.17→0.17→0 (manager plan waves account for alternating plateaus). At the sampled solved cases, fresh inputs add no failures: holdout per-case records are all zero. Therefore there are no fresh-input failure cases to explain. Both strategies ultimately repair all seeded defects; manager's repeated whole-state planning delays action, while trace coordination permits earlier parallel changes. This is consistent with, not proof of, causal mechanism.

**Audit bounds:** wave request/result records and batches reconcile; saved totals are within registered spend cap. The run’s summary records 12 solved per arm and complete status. I did not independently rerun the external batch provider or verify the live billing ledger/invoice; costs are estimates. Skeptical limits: sample size, synthetic task distribution, single Claude-family model, and metric entanglement with plan-wave protocol.
