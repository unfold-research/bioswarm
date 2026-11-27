# LI39 review: second-family Colony test of `wait` against `market` (gpt-6-luna, k160, 12 seeds)

**Reviewer:** openai-codex/gpt-6-luna (Colony bench, automatic review). I had no file or shell access. I re-derived everything from the pasted per-run numbers and `analysis.json`. I could not open the request samples, exports or code files, so checks 2 and 3 are only partly done (see the table).

| Severity | Finding | Response |
|---|---|---|
| High | **Primary is inconclusive: 7 wins, 3 losses, 2 ties, p = 0.344.** Under the registration this means no L2 for "faster", no rerun, and `market` stays the Colony default. The prediction in "What the result decides" for a supported result is not earned. | — |
| High | **The wins come from `market` stalling, not from `wait` being faster.** Five of the 7 wins are seeds where `market` never reached an all-pass (39400, 39405, 39407, 39409, 39411). Where both arms solved (39401, 39403, 39404, 39406, 39408), `wait` won 2 and lost 3. Its paired differences were +9.3, −7.3, +0.6, +12.0 and −0.1 minutes (positive means `wait` slower). Two of those differences, 0.6 and 0.1 minutes, are within the ~0.3–1 minute polling resolution. | — |
| High | **`antMessages` is 1932 in both arms**, yet `wait` has `peer: false`. An identical total across arms is implausible if the counter measures peer messages. Either the counter measures something else, or the `wait` arm was not isolated from peer messaging. I could not sample requests or exports, so check 2 (each arm ran its claimed mechanism) is not confirmed. | — |
| Medium | **"Never reached" mixes two outcomes.** Only 3 of the 7 `market` never-solved runs hit the cap (39402, 39405, 39407). The other 4 stopped early after the 180 s quiet window, unsolved (final failing 35, 15, 45, 156). Scoring both as cap+1 follows the registration, but the metric partly measures stopping behaviour. | — |
| Medium | **Three `market` caps were stalls, not slow progress.** 39402 stayed at 527 failing from minute 4.4 to 180. 39405 stayed at 399 from minute 4 to 180. 39407 stayed at 58 from minute 21 to 180. This explains the low tokens of those runs (0.33M, 0.39M, 1.14M). I could not check the cause from exports. | — |
| Medium | **H-LI122 points the opposite way:** `wait` used more tokens in 9 of 12 seeds (3 wins, 9 losses, p = 0.146). The medians are 1.57M for `wait` and 1.25M for `market`. Tokens are confounded with stalls, as the registration warns. | — |
| Medium | **Fleet concurrency log looks incomplete.** Every run records `otherRuns` 0 and `agents` 0, although both arms of a seed started simultaneously on the same runtime. The partner run is not counted. The log cannot support the "shared fleet conditions" claim. Also, rt-1 hosted 8 seeds and rt-2 only 4. | — |
| Medium | **The arms differ in more than the mechanism.** `wait` got extra instruction text about format pairs, ownership and the field, while `market` got none. This is stated in the registration for channel and ownership, but the instruction difference is not listed. | — |
| Low | **H-LI121 depends on `holdoutFailing`.** The fallback would score a solved run that fails fresh inputs as 0. The reported 6/2/4 differs from H-LI120's 6/1/5, so the field was evidently present. I could not verify its values. `wait` seeds 39404 and 39409 solved but failed the hold-out (8 of 12 `wait` runs pass the hold-out, against 5 of 12 for `market`). I did not sample the fresh-input failures. | — |
| Low | **Skeptic limits.** One model family. Synthetic tasks. n = 12 with an exact sign test that drops ties, so power is low. Four hypotheses, with Holm only across the three secondaries, which is as registered. The sign test is two-sided, which is conservative. The pilot (seed 39990) was seen before registration. `market` solved only 5/12 here, against 10/12 at k80 in LI37, so size matters. | — |

## Re-derived numbers

**Minutes to first all-pass** (`wait` / `market`; "never" scores 181):

| Seed | `wait` | `market` | Winner |
|---|---:|---:|---|
| 39400 | 32.7 | never | wait |
| 39401 | 29.3 | 20.0 | market |
| 39402 | never | never | tie |
| 39403 | 27.4 | 34.7 | wait |
| 39404 | 24.2 | 23.6 | market |
| 39405 | 26.1 | never | wait |
| 39406 | 33.3 | 21.3 | market |
| 39407 | 18.1 | never | wait |
| 39408 | 25.3 | 25.4 | wait |
| 39409 | 22.0 | never | wait |
| 39410 | never | never | tie |
| 39411 | 23.7 | never | wait |

- **H-LI119:** 7 wins, 3 losses, 2 ties. n = 10, p = 2·(1+10+45+120)/1024 = 0.34375. Inconclusive. This matches `analysis.json`.
- **H-LI120 (final failing):** `wait` 0 in 10 of 12 runs (16 and 90 otherwise). `market` finals are 35, 0, 527, 0, 0, 399, 0, 58, 0, 15, 45, 156. Result: 6 wins, 1 loss (39410), 5 ties, p = 0.125, Holm 0.375. Inconclusive. Matches.
- **H-LI121 (fresh inputs):** I could not recompute it independently. The reported 6/2/4 with p = 0.289 is consistent with the sign test, Holm 0.375. Inconclusive.
- **H-LI122 (tokens):** 3 wins (39403, 39409, 39411), 9 losses, p = 2·299/4096 = 0.146, Holm 0.375. Inconclusive. Matches.
- **Holm** across the three secondaries: 0.125·3 = 0.375, 0.146·2 = 0.292 (raised to 0.375 by the running maximum), 0.289·1 raised to 0.375. All match.
- **Counts:** `wait` solved 10/12 with 0 capped. `market` solved 5/12 with 3 capped. Median wall time is 33.6 minutes for `wait` and 35.0 for `market`. Traces are 1329 for `wait` and 0 for `market`.

**Verdict logic against the registration:** the analysis implements the registered rules. They are the exact sign test, ties dropped, cap+1 for never-solved, both-never as a tie, and Holm on H-LI120 to H-LI122. All four verdicts are inconclusive, with no mismatch in the verdicts. The open points are the identical `antMessages`, the incomplete concurrency log, and the unverified `holdoutFailing` field.

**Net reading:** `wait` finished more runs (10 against 5), but `market` was not slower when it did finish. The data are consistent with `wait` being more robust against stalls. They do not show it is faster, and it costs more tokens.
