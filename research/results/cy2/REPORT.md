# CY2 report: LLM blue teams with and without the clearance doctrine on CAGE Challenge 4 (2026-11-20)

Preregistration: `tasks/CY2-PREREG.md`. Code: specification `observatory/cyber/cy2/bench.json`; analysis `observatory/cyber/cy2/analyze2.mjs`. Data: `results/cy2/`. Analysis: `results/cy2/analysis.json`. Review: `docs/reviews/CY2-REVIEW-LUNA-2026-11-20.md`. The registered design compares four blue arms on 30 paired seeds under each of two fixed red agents in CC4, with actions gated by suspicious cues; the paid arms use Claude Haiku 5.5. The LLM-doctrine prompt adds the three-sentence clearance doctrine to the otherwise same LLM prompt, while `code-react` and `code-cd10` are free references; the pilot and its results are not study data.

| Arm | Red | Mean reward | Mean red Impacts | Mean green failures | Calls/episode | US$/episode |
|---|---|---:|---:|---:|---:|---:|
| `code-react` | FiniteStateRedAgent | -1752.20 | 21.37 | 858.90 | 0 | [redacted] |
| `code-cd10` | FiniteStateRedAgent | -1407.27 | 17.60 | 754.23 | 0 | [redacted] |
| `llm-plain` | FiniteStateRedAgent | -5659.20 | 35.07 | 1847.00 | 221.63 | [redacted] |
| `llm-doctrine` | FiniteStateRedAgent | -3093.23 | 33.40 | 1229.50 | 263.33 | [redacted] |
| `code-react` | DiscoveryFSRed | -275.07 | 1.27 | 267.27 | 0 | [redacted] |
| `code-cd10` | DiscoveryFSRed | -295.87 | 0.03 | 249.63 | 0 | [redacted] |
| `llm-plain` | DiscoveryFSRed | -2561.83 | 50.70 | 669.50 | 271.83 | [redacted] |
| `llm-doctrine` | DiscoveryFSRed | -599.83 | 9.70 | 275.37 | 344.93 | [redacted] |

## Verdicts

Registered verdicts are reproduced exactly from `results/cy2/analysis.json`; the primary hypothesis is first.

| Hypothesis | Verdict | Paired wins (FSM; Discovery) |
|---|---|---|
| **CY2-H1 (primary):** doctrine helps an LLM team | supported | 29/30; 29/30 |
| CY2-H2: LLM doctrine beats code-cd10 | not supported | 0/30; 11/30 |
| CY2-H2p (H2′): code-cd10 beats LLM doctrine | red-dependent | 30/30; 19/30 |

## What it shows

1. On both reds, doctrine improved reward over the plain LLM in 29 of 30 paired seeds. Mean red Impacts were also lower: 33.4 vs 35.0667 under FiniteStateRedAgent and 9.7 vs 50.7 under DiscoveryFSRed. The registered H1 guard (winner impacts no more than 1.10 times the loser's) passed in both comparisons.
2. The doctrine LLM did not beat the code rule. Under FiniteStateRedAgent, code-cd10 won all 30 pairs; under DiscoveryFSRed it won 19 of 30. The registered H2 impacts guard also failed both: doctrine/code mean impacts were 33.4/17.6 and 9.7/0.0333. Across all 120 paid episodes, spend was [US$ redacted] for 33,052 calls; three replies were invalid.
3. Doctrine was not equivalent to executing the rule: it departed from code-cd10 on 65.86% of FSM calls and 67.41% of Discovery calls. This is descriptive, not a registered hypothesis. The result is consistent with the observed choice of Analyse and Remove as well as Restore, rather than continuous adherence to restore-first behavior.

## Limits

The evidence is confined to one model family, one synthetic simulator, two fixed red scripts, and 30 seeds per red; it does not establish external validity, and small effects may be missed. Reward is dominated by failed green work, so reward differences do not alone establish better cyber defense; the registered Impact guard mitigates that concern for H1 and H2 but does not apply to H2′. The 21-win threshold is a registered absolute count: ties are dropped from the sign test, so its stated P=.0214 applies to 30 non-ties, not every comparison. Exact output p-values for the actual non-tie counts are in the analysis; H1 has no ties, H2′ Discovery has none, and H2 comparisons have no ties. Correction was across the two reds, not the family of H1/H2/H2′ comparisons; treat the hypotheses as registered, not as a family-wise corrected set. The analyzer does not itself validate duplicates or extra records, although it reports 240/240 expected episodes and none missing here. The review could not verify raw-call replay hashes or every request payload across 33,052 calls, nor shared-instance identity beyond matching seed/red records; calls were cue-gated as designed, and these remain verification limits.
