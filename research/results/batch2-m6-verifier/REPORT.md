# M6 a verifier with working space: reliable, and the cascade then matches the stronger model

Preregistration `tasks/M6-VERIFIER-PREREG.md`. Run 2026-11-11: 180 + 180 requests on `claude-haiku-5-5` (`m6-verifier`) and 90 on `claude-sonnet-5-5` (`../batch2-m6-verifier-sonnet/`), all succeeded and valid, none truncated. Usage estimate [US$ redacted] and [US$ redacted] `summary.json` and `combined.json` (from `observatory/batch2/m6-verifier/analyze.mjs`) in this folder.

## Result

Verifier on the answers of the answer-only searcher (38 correct, 52 wrong):

| Verifier | Accepts correct answers | Rejects wrong answers | Output tokens |
|---|---|---|---|
| answer only (v0) | 23 of 38 (0.61) | 36 of 52 (0.69) | 8 |
| at most 40 words of working (vw) | 38 of 38 (1.00) | 50 of 52 (0.96) | 120 |

Accuracy over all 90 tasks:

| Strategy | 12 | 24 | 48 | All |
|---|---|---|---|---|
| answer-only searcher (s0) | 0.67 | 0.43 | 0.17 | 0.42 |
| cascade with v0 | 0.73 | 0.80 | 0.83 | 0.79 |
| cascade with vw | 1.00 | 1.00 | 0.83 | 0.94 |
| searcher with 20 words of working, alone | 1.00 | 0.93 | 0.87 | 0.93 |
| Sonnet alone | 1.00 | 1.00 | 0.90 | 0.97 |

| Test | Verdict |
|---|---|
| P1 (H-02) working space makes the verifier reliable | **supported** |
| P2 the cascade improves with it | **supported**: +0.16, interval 0.08 to 0.23 |
| P3 the cascade then matches the stronger model | **supported**: 0.94 against 0.97, Sonnet called on 56% of tasks |
| P4 individual reasoning makes the cascade unnecessary | **supported**: 0.93 alone against 0.94 |

## Reading

- The weak verifier of M4 and M5 was weak for the same reason the searcher was: no working space. With forty words it made 2 errors in 90.
- H-02 holds in this instrument in the plain sense that the cascade is as good as its verifier: 0.79 with the poor one, 0.94 with the good one, with the same searchers and the same escalations.
- The cascade is still the wrong design here. One call of the small model with twenty words of working gets 0.93; the cascade gets 0.94 with three small-model calls and a Sonnet call on more than half the tasks. A verifier pays when the first answer is cheap and usually right, which an answer-only searcher at 0.42 is not.

## Limits

One synthetic task whose answer follows from the input, which is the best case for a verifier. The share escalated reflects a handicapped searcher. Sonnet runs with adaptive thinking.
