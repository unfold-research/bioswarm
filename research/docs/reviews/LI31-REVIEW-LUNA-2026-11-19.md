# LI31 independent review — Colony study

Reviewer: gpt-6-luna (outside the Claude model family)

| Severity | Finding | Response |
|---|---|---|
| HIGH | **Primary metric is not specific to format-pair adaptation.** `dynamics()` treats a format pair as two file indices and counts any hash change in both whole files between polls. Each file contains several functions; unrelated local/helper edits therefore count, and a format edit may be missed if its file changes outside that interval. This is co-change of files, not demonstrated simultaneous changes to the pair's encoder/decoder. | — |
| HIGH | **Verdicts reproduce, but evidence is weak and descriptive.** Running `node observatory/batch2/colony/analyze-li31.mjs` reproduces the script's verdicts. Claim vs nopeer primary: 6 vs 2 case wins, exact two-sided sign p=.289; not significant. Secondaries: claim vs nopeer holdout 1 vs 0, p=1; time 5 vs 3, p=.727; claim vs market holdout 4 vs 0, p=.125, Holm=.375. All inconclusive under prereg rules; no support/refutation. | — |
| MEDIUM | **Function-level audit confirms announcements and final compatibility, but not continuous holding.** Across claim exports I found 62 explicit “Eu me adapto ao seu formato de X; mantenha o seu” traces. Matching trace target module + named encode/decode function against the seeded instance links 50 traces to 41 unique symmetric pairs; every linked pair passes final ordinary checks, and all claim runs pass the final holdout suite. This supports that ants announced a specific adaptation and the resulting formats worked. However, no function-level snapshots exist: timelines hash whole multi-function files every 15s, and write/edit exports retain only file path and hash, not diffs. Thus we cannot verify the receiver left that exact function untouched throughout or that each claim held its promise during intermediate rounds. | — |
| MEDIUM | **Market’s holdout losses are concrete edge/integration bugs, not evidence that coordination itself caused them.** Re-running the evaluator’s 40-input holdout generator against market `.code.json` identifies: s31402 `M28.brandTerm`/`M40.siftTitle` returns values 4 too low (e.g. expected 16, got 12); s31403 and s31406 mishandle empty tag arrays encoded as `-` (decode as `["-"]`); s31404 parses `M33.encodeVenue`'s `1|0|577` as `{paid:true,id:0,qty:577}` instead of `{id:577,qty:1,paid:false}`. These are helper semantics, empty-input sentinel, and field-order/boolean parsing defects. Claim’s 0/8 versus market’s 4/8 is consistent with better integration/testing, but does not isolate the mechanism. | — |
| LOW | **Scope/precision limits.** Eight paired seeds, one model family, synthetic tasks, concurrent multi-agent editing, and an instrument polling every 15 seconds constrain inference. A pair-level count of checks failing on fresh inputs is more interpretable than file-level hash co-change. | — |

## Re-derived numbers

| Arm | Solved / 8 | Holdout pass / 8 | Capped | Simultaneous-file events | Regressions | Traces (analysis) | Median wall time |
|---|---:|---:|---:|---:|---:|---:|---:|
| claim | 8 | 8 | 0 | 142 | 38 | 343 | 20.9 min |
| nopeer | 8 | 7 | 1 | 194 | 45 | 341 | 17.1 min |
| market | 8 | 4 | 0 | 189 | 63 | 0 | 15.0 min |

Holdout failures: claim 0/8; nopeer seed 31404: 1; market seeds 31402, 31403, 31404, 31406: 1 each. Exports establish claim used `field:"claim"`, `peer:false`; across 8 exports I counted 356 trace events, 351 closed, including 62 explicit adapt/keep announcements. Nopeer had 372 traces; market had `field:false` and extensive ant-to-ant coordination (`ant_send`). Of 50 announcement-to-pair links, each pair passes final ordinary checks; all claim final holdouts pass. Whole-file hash timelines cannot show whether each individual function stayed unchanged between polls. The experiment does not isolate communication from file-level simultaneous-edit behavior.
