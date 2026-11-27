# GN1 Independent Review

Reviewer/model: `openai-codex/gpt-6-luna` (research bench automatic review)

| Severity | Finding | Response |
|---|---|---|
| High | Strong first-pass signal, but not the preregistered “mechanism check”: notebook improves symmetric failures by 75 and library by 89, while reductions on repeated edges (90/120) are smaller than on new edges (4/−3); notebook local failures rise 9→39. Benefit is not clearly specific to the carried-over edges. | — |
| High | Verdict wording is asymmetric: prereg says “supported” needs one-sided p<.05, but “refuted” follows merely from the comparator winning more units. Thus H3 is labeled refuted despite 5 vs 1 wins and p=.109 against notebook; H4 is refuted despite being an efficiency endpoint, with all 10 token comparisons favoring none. Report these as directional results, not evidence of statistically established harm. Holm-adjusted secondary p-values do not change the registered rule. | — |
| Moderate | Data are complete under cap, but cost-based sample is only five related sequences (10 case units) and two controls (4 guard units); correlated cases leave only five sequence-level related units. The guard is weak by registration. | — |
| Moderate | Hold-out has a floor: every arm has zero failing checks on fresh inputs. H5 is inconclusive/not refuted, not evidence of equivalence or safety. | — |
| Moderate | External validity and multiplicity: one Haiku model family, synthetic generated code, fixed f=0.5, many secondary/mechanism breakdowns, and no manager or alternative memory-size arm. | — |

## Re-derived numbers

Ran `node observatory/batch2/rc/analyze-gn1.mjs` successfully; regenerated output matches `results/gn1/analysis.json`. The preregistered cost rule selected five related + two control sequences after stage 0 passed narrowly (notebook overlap 22.25%, library 22.70%). Actual spend: [US$ redacted] including pilot [US$ redacted] within [US$ redacted]; run log records all 63 expected episodes (shared case 1 plus arm-specific cases 2–3). All arms use `stigwait`; sample episode records share instance hash for same sequence/case, while case 1 is shared. Notes are absent in none; notebook and library are present in corresponding arms. Request logs show memory arms’ note usage, and sampled notebook/library records show case-1 source and 0 / 21,291 note tokens read. Ledger includes GN1 batch reservation/reconciliation entries.

| Arm / verdict | Solved | First-pass failing (sum; median) | Waves (median) | Output tokens (sum) | Holdout failing (sum) |
|---|---:|---:|---:|---:|---:|
| none | 10/10 | 2,117; 212 | 3 | 3,203,559 | 0 |
| notebook | 10/10 | 2,053; 205.5 | 3.5 | 4,456,687 | 0 |
| library | 10/10 | 1,999; 199.5 | 3.5 | 5,031,574 | 0 |
| H1 notebook vs none | 10–0–0 wins/ties/losses; p=.00098; sequence 5–0, p=.03125 | supported | | | |
| H2 library vs none | 10–0–0; p=.00098; Holm=.00391; sequence 5–0, p=.03125 | supported | | | |
| H3 waves | 1–4 ties–5 favor none; notebook-direction p=.984 | refuted by rule | | | |
| H4 tokens | 0–0–10 favor none; p=1 in notebook direction | refuted by rule | | | |
| H5 holdout/no harm | all 10 ties; p=1 | inconclusive; “not refuted” | | | |

Control guard holds: notebook/none median first-pass failures 212.5/213.5 and waves 3.5/3.5 (4 units). Observed gain is modest: first-pass totals fall 3.0% notebook and 5.6% library. Sample case `related-51000`, case 2 starts at 212/207/197 failures (none/notebook/library); holdout failures are all zero. This fits a small live-check reduction, concentrated in symmetric checks—not demonstrably transfer of repeated-edge knowledge—and no faster completion. The prereg’s conditional card says “adopt, test more” for H1 supported, H5 not refuted, guard holding, but inference should remain restricted to this setup.

Evidence: analyzer output, prereg/spec, run log, episode records, sampled requests/results and ledger. Holdout was independently recomputed by the analyzer from episode final code and generated instances. No external model calls or repository edits beyond this requested review file.
