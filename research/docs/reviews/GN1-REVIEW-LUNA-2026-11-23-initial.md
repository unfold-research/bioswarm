# GN1 Independent Review

Reviewer/model: `openai-codex/gpt-6-luna` (research bench automatic review)

| Severity | Finding | Response |
|---|---|---|
| High | `analyze-gn1.mjs` could not run in this copy: `ERR_MODULE_NOT_FOUND` for `observatory/batch2/ne/tasks.mjs` imported by `rc/code.mjs`. Thus the checked-in analysis is not independently regenerated here. | — |
| Moderate | The result table’s p-values need careful interpretation: preregistered refutation is directional (the comparator wins more units), without a p<.05 requirement; H3 (5 wins to notebook vs 1) and H4 (none wins all 10 token comparisons) are therefore refuted as registered. Holm-adjusted p-values are also reported for secondary tests, but they do not alter that registered refutation rule. | — |
| Moderate | None/Notebook/Library have 10/10 solved, but first-pass failure reduction is modest (2117→2053; 2117→1999), and no holdout failures in any arm. Gains are not concentrated on repeated edges: notebook repeated 970 vs new 1044; library repeated 940 vs new 1051. Sample case 2/seed 51000: none/notebook/library had 212/207/197 initial failures; holdout scoring reports zero failures for each arm. | — |
| Moderate | All arms share the same case-1 run per sequence and use stigwait; sample records show `protocol: stigwait`, shared `instHash` across arms, and notes are read only in memory arms. Yet the cost-driven sample is only five related sequences and two controls (4 weak-guard units), not the planned full sample. | — |
| Moderate | Small, correlated n (10 units, only 5 independent sequences), one Haiku model, synthetic generated code tasks, and multiple secondary outcomes limit inference/external validity. | — |

## Re-derived numbers

`results/gn1/analysis.json` reports 10 related units (cases 2–3, five sequences) and four control units; 14 planned units dropped by the registered cost rule. Stage-0 overlap passed narrowly: notebook 22.25%, library 22.70%. Plan projection selected five related + two control sequences ([US$ redacted] study projection; [US$ redacted] including [US$ redacted] pilot). Run log ends with 63 records and [US$ redacted] total—under the [US$ redacted] cap.

| Arm / comparison | Solved | First-pass failing checks (sum; median) | Waves median; tokens sum | Holdout failing |
|---|---:|---:|---:|---:|
| none | 10/10 | 2117; 212 | 3; 3,203,559 | 0 |
| notebook | 10/10 | 2053; 205.5 | 3.5; 4,456,687 | 0 |
| library | 10/10 | 1999; 199.5 | 3.5; 5,031,574 | 0 |
| H1 notebook vs none | 10–0–0 wins/ties/losses; p=.00098; sequence 5–0, p=.03125 | supported | | |
| H2 library vs none | 10–0–0; raw p=.00098, Holm=.00391; sequence 5–0, p=.03125 | supported | | |
| H3 notebook vs none, waves | notebook better 1, none better 5, ties 4; notebook-direction p=.984 | refuted (none better in more units) | | |
| H4 notebook vs none, tokens | notebook better 0, none better 10; ties 0 | refuted (none better in more units) | | |
| H5 holdout, no-harm | 0–10 ties; p=1; every arm has zero failures | inconclusive / no harm detected | | |

H1/H2 reductions occur mainly in symmetric failures (none 527, notebook 452, library 438); notebook local failures increase 9→39. Fresh-input results are a floor effect, not evidence of equivalence. The dataset supports a consistent first-pass reduction on these generated related cases, not faster completion (both memory arms have larger wave sums), and at notable extra token cost. Per preregistered card, H1 is supported, H5 is not refuted, and control guard holds (medians 212.5 vs 213.5 first-pass; 3.5 vs 3.5 waves), but the guard has only four units: “adopt, test more,” narrowly scoped to this setup.

Evidence checked: prereg, spec, episode records, run log, analysis, pilot/study wave request logs, and ledger artifact. Sampled same-seed cases share instHash `113523f7d5c2`, all say `stigwait`; notebook’s sample read 0 note tokens and library 21,291. Ledger logs include GN1 reservations/reconciliations. The analyzer could not execute in this copy: `family.mjs` and `code.mjs` import missing `observatory/batch2/ne/tasks.mjs`; the separate `results/gn1/state.json` and `holdout.json` are absent (only analysis plus study/pilot states exist). Therefore holdout and generated instance checks rely on recorded analysis/episode data, not a successful fresh analyzer run.
