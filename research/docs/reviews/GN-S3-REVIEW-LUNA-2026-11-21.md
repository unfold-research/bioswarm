# GN-S3 Independent Review

Reviewer/model: OpenAI Codex, `openai-codex/gpt-6-luna` (research bench automatic review)

| Severity | Finding | Response |
|---|---|---|
| Moderate | Analyzer verdict labels match preregistered win thresholds and guards, but its “sign test” p-value drops ties while the 22/30 decision threshold is fixed on all seeds. The preregistration explicitly permits that distinction; quote wins and p-values separately. | — |
| Moderate | Analysis silently overwrites duplicate keys, accepts out-of-range records, and computes means over available pairs rather than requiring 30; the current dataset is complete (360/360, no missing), but integrity checks are weak. | — |
| Moderate | `Analyse` “changed view” is operationalized as the analyzed host showing a cue within three steps—not necessarily a causal change caused by Analyse. Stage 0 therefore establishes the preregistered channel proxy, not evidence of surveillance benefit. | — |
| Moderate | One simulator / two fixed reds, 30 paired seeds each, one model family is not applicable (no model calls), and all tasks are synthetic; small effects and external validity remain unresolved. | — |
| Low | Three mechanism comparisons across two reds use 22/30 (the stated Bonferroni threshold); the DEF-07 additional control comparison is a further gate. The hypotheses are explicitly preregistered, but multiplicity beyond the six mechanism-by-red tests is not modeled. | — |

## Re-derived numbers

Ran `node observatory/cyber/gn-s3/analyze-gn-s3.mjs`: **360/360** records, 30 paired seeds per arm/red, six arms; no holdout/state/ledger artifacts are present in this copy. Preregistration says code-only, free, no API/ledger spend; driver runs Docker with `--network none`. Stage 0 passed: CY2 cd10 hash reproduced for both reds, replay stable, no cross-zone targets, and sentinel Analyse changed the view 15 times on the pilot. Run log records all 360 jobs completing. A holdout was not preregistered: the block is new seeds, not an untouched arm-independent holdout.

| Trait (vs cd10) | FSM wins / losses / ties; p | Discovery wins / losses / ties; p | Verdict |
|---|---:|---:|---|
| SIG-04 alarm | 12/18/0; .8998 | 6/23/1; .9997 | Hurts under one red (Discovery: cd10 wins 23) |
| DEF-04 scaled | 10/13/7; .7976 | 8/20/2; .9937 | Not supported |
| DEF-07 sentinel | 10/20/0; .9786 | 14/16/0; .7077 | Not supported; sentinel vs random-Analyse control is 30/30 ties for each red |

No trait passes the ≥22 wins and both guards. Against FSM, mean reward/impacts: cd10 −1218.6/15.23; alarm −1510.77/18.97; scaled −1352.37/18.57; sentinel −1557.9/20.8. Discovery has zero cd10 impacts, while scaled/sentinel average .167/.033 respectively, so the 1.1× impact guard fails even with tiny absolute differences. Sentinel also has worse blue-attributed failures under FSM (4.07 vs 3.1).

Mechanisms and pairing: `gn_s3.py` implements delayed cross-zone alarm with 5-step cooldown while on; own-zone threat counts select scaled cooldown; rotating sentinel Analyse is on quiet steps, with a matched seeded-random Analyse control. Recorded action counts corroborate: alarm/scaled only Restore/Sleep, sentinel and control include about 450 Analyse actions/episode. All arm-red-seed combinations exist, enabling paired seeds; each episode is independently constructed from the same seed and red, rather than a single shared live instance. Initial-state equality across arms is expected by seeded construction, but no per-episode initial-state hash is stored, so it is not directly verified. Caps are 500 steps and one action per agent per step by driver; records report 500-step episodes. No financial cap/ledger applies to this free code run.

Cases: FSM seed 77001 cd10 earns −1142 with 21 impacts; alarm −1270/25, while sentinel and its control tie at −977/22. Discovery seed 77002 cd10 has −345/0 impacts; alarm −363/0, scaled ties reward at −345/0, sentinel/control tie −371/0. This fits alarm's delayed cue and weaker cooldown failing to improve immediate containment; scaling often yields identical actions when its cooldown threshold does not change eligibility. Analyse consumes quiet-step actions but sentinel selection does not outperform random checks; duplicated sentinel/control summary statistics reflect equal rewards, failures, and impacts throughout the sample. These patterns support a bounded null in this cell, not general rejection of the traits.

Not verified: per-episode initial-state hashes, independent regeneration of every metric from raw simulator trajectories, external holdout, or ledger elsewhere; this copy lacks Git metadata. The analyzer was executed successfully; `python3` is unavailable, so no separate Python replay was run.
