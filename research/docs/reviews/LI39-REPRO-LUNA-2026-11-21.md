# LI39 reproduction check

## Method and reproduction

Ran `node observatory/batch2/colony/analyze-li39.mjs` from the project folder and compared its stdout byte-for-byte with `results/li39/analysis.json` (`cmp -s`): identical (exit 0).

Independently read each `wait-s<seed>.json` and `market-s<seed>.json` raw `timeline`, selected the first poll with an array-valued empty `fails`, and divided `t` by 60,000; where absent, assigned cap+1 = 181 minutes. This covers all 12 paired seeds (at least three runs per arm).

| Seed | wait minutes | market minutes |
|---:|---:|---:|
| 39400 | 32.662967 | 181 |
| 39401 | 29.256583 | 19.993083 |
| 39402 | 181 | 181 |
| 39403 | 27.375517 | 34.737017 |
| 39404 | 24.155700 | 23.579417 |
| 39405 | 26.110900 | 181 |
| 39406 | 33.290550 | 21.289117 |
| 39407 | 18.062817 | 181 |
| 39408 | 25.302600 | 25.449500 |
| 39409 | 22.035067 | 181 |
| 39410 | 181 | 181 |
| 39411 | 23.699200 | 181 |

The independently derived values match the registered timeline-based metric, including the 181-minute cap-plus-one values. Pairwise primary result: wait wins 7, loses 3, ties 2; the two ties are both-never-all-pass seeds 39402 and 39410. Exact two-sided sign-test p = 0.34375, matching `analysis.json`; H-LI119 is inconclusive.

## Concerns / limitations

- This reproduces the recorded data and analysis, not the experiment itself; no fresh runs were made, so runtime/model non-determinism is not measured.
- The analyzer selects the first timeline entry whose `fails` is an array and empty; it does not explicitly validate timestamp ordering or timeline completeness. The independent calculation applies the same first-entry rule. No discrepancy was found in these records.
- No non-tied equal finite primary values appear in the paired results; exact value ties are counted as ties, and both never-pass runs are also tied as specified. Conclusions are limited by 12 pairs and the test is not statistically significant.
