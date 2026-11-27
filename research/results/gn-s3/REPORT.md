# GN-S3 report: code-only swarm defence arms on CAGE Challenge 4 (2026-11-21)

Preregistration: `tasks/GN-S3-PREREG.md`. Code: spec `observatory/cyber/gn-s3/bench.json`; analysis `observatory/cyber/gn-s3/analyze-gn-s3.mjs`. Data: `results/gn-s3/`. Analysis: `results/gn-s3/analysis.json`. Review: `docs/reviews/GN-S3-REVIEW-LUNA-2026-11-21.md`. The study paired 30 new seeds per arm and each of two fixed reds in CC4, comparing three preregistered code traits with the `code-cd10` baseline on reward, under red-impact and blue-attributed-failure guards. Code-only arms (no model calls); free, with no ledger spend. DEF-04 (`code-scaled`) and DEF-07 (`code-sentinel`) verdicts are co-signed by Cyber Research. Stage 0 found an Analyse channel, so DEF-07 ran.

| Arm | Red | Episodes | Mean reward | Mean red Impacts | Mean blue-attributed green failures |
|---|---|---:|---:|---:|---:|
| `code-react` | FiniteStateRedAgent | 30 | -1797.43 | 24.70 | 1.83 |
| `code-cd10` | FiniteStateRedAgent | 30 | -1218.60 | 15.23 | 3.10 |
| `code-alarm` | FiniteStateRedAgent | 30 | -1510.77 | 18.97 | 2.87 |
| `code-scaled` | FiniteStateRedAgent | 30 | -1352.37 | 18.57 | 2.90 |
| `code-sentinel` | FiniteStateRedAgent | 30 | -1557.90 | 20.80 | 4.07 |
| `code-cd10-qa` | FiniteStateRedAgent | 30 | -1557.90 | 20.80 | 4.07 |
| `code-react` | DiscoveryFSRed | 30 | -237.90 | 1.17 | 0.07 |
| `code-cd10` | DiscoveryFSRed | 30 | -288.60 | 0.00 | 0.00 |
| `code-alarm` | DiscoveryFSRed | 30 | -305.80 | 0.00 | 0.00 |
| `code-scaled` | DiscoveryFSRed | 30 | -304.97 | 0.17 | 0.00 |
| `code-sentinel` | DiscoveryFSRed | 30 | -284.23 | 0.03 | 0.00 |
| `code-cd10-qa` | DiscoveryFSRed | 30 | -284.23 | 0.03 | 0.00 |

## Verdicts

| Hypothesis | Verdict (registered) | Paired reward wins/losses/ties vs `code-cd10`; one-sided p |
|---|---|---|
| H-GN-S3a (primary; SIG-04) | **hurts under one red** | FSM 12/18/0, p=.8998; Discovery 6/23/1, p=.9997 |
| H-GN-S3b (DEF-04) | **not supported** | FSM 10/13/7, p=.7976; Discovery 8/20/2, p=.9937 |
| H-GN-S3c (DEF-07) | **not supported** | FSM 10/20/0, p=.9786; Discovery 14/16/0, p=.7077; sentinel vs random-Analyse control tied 30/30 under each red |

The registered threshold is at least 22 wins of 30, plus both guards; p-values exclude ties. The analysis declares no hypothesis supported. The DEF-07 control comparison is an additional required gate.

## What it shows

1. The reference `code-cd10` had mean reward -1218.60 and 15.23 impacts against FiniteStateRedAgent; alarm, scaled, and sentinel had lower reward and more impacts. For DiscoveryFSRed, `code-cd10` had zero mean impacts, while scaled and sentinel averaged 0.17 and 0.03. These patterns do not meet the registered win and guard requirements.
2. Sentinel and its matched random-Analyse control were identical in summary outcomes: 30 reward ties out of 30 under each red. Each averaged about 450 Analyse actions per episode. Analyse changed the view 15 times in stage 0; this is the registered channel proxy, not proof that Analyse caused the change or that vigilance benefits defence.
3. Exploratory: the alarm's weaker cooldown did not improve outcomes here; the sentinel did not outperform matched extra Analyse checks. These observations are bounded to the tested policies and cell.

## Limits

This is one simulator, two fixed reds and 30 paired seeds each; all tasks are synthetic, and small effects or external validity remain unresolved. The code policies are crude, untuned stand-ins, the reds do not adapt, and CC4 has one agent per zone; DEF-04 tests response intensity, not adding defenders. A null can reflect these parameters or the cell, not the general mechanism. The alarm is delayed and this cell favours clearance over warning. The registered 22/30 threshold uses all seeds while p-values drop ties; report them separately as above. Six mechanism-by-red tests use the stated Bonferroni threshold, but additional multiplicity from DEF-07's control gate is not modeled. Analysis integrity checks are weak (duplicate keys overwrite, out-of-range records are accepted, and means can use incomplete pairs); this dataset nevertheless has 360/360 records with no missing. Initial-state hashes and independent regeneration of all metrics from raw trajectories were not verified. The stage-0 Analyse proxy means the host showed a cue within three steps, not necessarily because of Analyse. No holdout was preregistered. There were no model calls; one model family is not applicable.
