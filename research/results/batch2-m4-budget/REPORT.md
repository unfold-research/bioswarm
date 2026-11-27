# M4 verifier or one more searcher: neither helped, because resampling returns the same answer

Preregistration `tasks/M4-BUDGET-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled: 450 searcher calls and 182 verifier calls, all succeeded and valid. Usage estimate [US$ redacted] `summary.json` in this folder.

## Result

Accuracy by number of records per task (30 tasks each). All three sizes fell in the registered band.

| Records | single | vote3 | verify3 | vote5 | chain5 | any of 3 right |
|---|---|---|---|---|---|---|
| 12 | 0.73 | 0.73 | 0.73 | 0.73 | 0.73 | 0.73 |
| 24 | 0.37 | 0.37 | 0.37 | 0.37 | 0.37 | 0.37 |
| 48 | 0.27 | 0.23 | 0.23 | 0.23 | 0.23 | 0.27 |
| pooled | 0.46 | 0.44 | 0.44 | 0.44 | 0.44 | 0.46 |

| Test | Verdict |
|---|---|
| P1 (H-M03) verify3 against vote3 | **not supported**: difference 0, interval 0 to 0 |
| P2 (H-M03) chain5 against vote5 | **not supported**: difference 0 |
| P3 (H-02) verifier accepts at least 90% of correct answers | **not supported**: 29 of 41 (0.71) |

## Reading

- **Five samples of one prompt gave one answer in 82 of 90 tasks.** With thinking off and an answer-only format the searcher is close to deterministic, right or wrong. Voting over copies buys nothing, and a verifier that rejects an answer and falls back on another sample gets the same answer back. Both strategies spent two to five calls to return what one call returned.
- **The verifier is informative but not specific.** It rejected 38 of 51 wrong answers the searchers gave (0.75) and 89 of 90 planted decoys, and accepted 29 of 41 correct ones. Of the 42 first answers it accepted, 29 were right (0.69), against 0.46 unfiltered. At 12 records, 19 of 21 accepted answers were right. So a verifier of this quality is worth something as a filter that abstains, and nothing as a trigger for a retry by an identical searcher.
- Only 10 of 248 wrong samples named the planted decoy. The searcher's errors are of another kind than the one the task was built around, and the verifier was much better on the planted kind (0.99) than on the real kind (0.75). M3's planted errors overstated verifier quality in the same way.

For Murmur: H-M03 as written, verify before adding searchers, is not supported, and neither is its alternative. What the result points to is that both verification and voting need a second searcher that differs from the first.

## Limits

One model, one synthetic task, thinking disabled. The near-determinism is a property of this configuration; V1b on the same model shows more variation on arithmetic. The fallback sample was an independent draw of the same prompt by design; a retry that is told its answer was rejected, or that uses another prompt or model, was not tested.
