# LI37 independent review

**Reviewer/model:** openai-codex/gpt-6-luna (Colony bench, research bench automatic review); read-only.

| Severity | Finding | Response |
|---|---|---|
| High | **Verdict-rule mismatch for H-LI111.** Preregistration says a hypothesis is supported if claim wins more seeds with p<.05; refuted if comparator wins more; otherwise inconclusive. Analyzer labels any directional comparator advantage “refuted,” even when p is nonsignificant. Here 5 vs 3 wins (4 ties), p=.7266: the registered rule yields **inconclusive**, not “refuted.” | — |
| High | **H-LI113 overlooks multiplicity.** Raw p=.0386 meets the stated per-hypothesis rule, but Holm-adjusted p=.1157 does not. Preregistration mentions Holm for secondary hypotheses yet the verdict code uses unadjusted p for every verdict; report support only as nominal under the literal rule, not family-wise significant evidence. | — |
| Medium | **Arm contrast is broader than announcements.** Config confirms claim field=`claim`, nopeer=`wait` with peer messaging disabled, and market has no field; claim/nopeer also share the “do not decide who changes” instruction. However full prompts and task context may differ: this review did not exhaustively compare all exports. It is not a clean isolated test of announcement wording. | — |
| Medium | **Small n, multiple outcomes, synthetic tasks, one model/runtime.** Twelve paired seeds give limited power; four hypotheses/outcomes invite multiplicity concerns. Conclusions may not generalize beyond generated modules and this model family. | — |
| Low | **Mechanics and accounting.** Per-run files cover all 36 planned runs; seeds pair across arms. Analyzer regenerates instances from identical seed and shape. Logs show two market runs hit 90.2-minute cap; no others capped. No financial ledger exists (subscription runs); token counts are telemetry, not spend. | — |

## Re-derived numbers

Ran `node observatory/batch2/colony/analyze-li37.mjs`; it exactly reproduces `results/li37/analysis.json`. All arms have 12 records, seeds 37800–37811. Solved / holdout passed / capped: **claim 12/12/0; nopeer 12/11/0; market 10/10/2**. Adapted pairs: **24 / 28 / 25**; validated trace among adapted pairs: **22/24 / 19/28 / 0/25**. Bilateral edit events **37 / 35 / 34**; regressions **50 / 49 / 66**. Median minutes **19 / 21.5 / 17**; token totals **317,499,004 / 454,187,846 / 296,112,636**.

| Hypothesis | Claim wins–comparator wins (ties) | p; Holm | Analyzer verdict; review |
|---|---:|---:|---|
| H-LI111 adapted pairs vs nopeer | 5–3 (4) | .7266; — | inconclusive; **inconclusive** |
| H-LI112 holdout failures vs market | 2–0 (10) | .5; .5 | inconclusive; **inconclusive** |
| H-LI113 wall time vs nopeer | 10–2 (0) | .0386; .1157 | supported; nominal only; Holm-inconclusive |
| H-LI114 tokens vs nopeer | 9–3 (0) | .1460; .2920 | inconclusive; **inconclusive** |

H-LI112 is ceiling-limited: 34/36 runs passed holdout, with the two failures both market (121 and 154 checks); it does not establish equivalence. Sampled cases illustrate why: market seed 37808 and 37810 each consumed the full cap and still had 121/154 fresh-input failures, while claim seed 37802 solved all checks after 12 adapted pairs (all 12 had validated announcements). This is consistent with incomplete implementation under a hard cap, not proof that announcements caused the difference. Sampled claim seed 37808 had one adapted pair without a validated announcement; nopeer seed 37807 had nine adapted pairs but only one validated trace, consistent with traces not guaranteeing broader coordination.

Verified the analysis rerun, spec, per-run inventory, report and run log. No separate `state.json`/`holdout.json` files were present; holdout status is in per-run records. Did not independently replay every check or inspect every export; mechanism validation therefore relies on spec/config and analyzer telemetry definitions.
