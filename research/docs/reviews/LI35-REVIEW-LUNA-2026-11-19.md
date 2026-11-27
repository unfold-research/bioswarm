# LI35 independent review

**Reviewer:** openai-codex/gpt-6-luna (Colony bench, research bench automatic review)

| Severity | Finding | Response |
|---|---|---|
| Medium | **Primary result is inconclusive, not evidence of a hold-out advantage.** `stigwait` passes fresh checks in 12/12 versus 11/12 for manager; only case 35401 differs. Eleven paired ties mean exact two-sided sign-test p=1. This follows the preregistered rule; do not interpret 12 vs 11 as statistically supported. | — |
| Medium | **The mechanisms differ as claimed, with a relevant cost/round confound.** Sampled requests show `stigwait` member output requires `traces` (sample `wave-1-p0`, `stigwait-…-w1-m24`); manager makes a distinct `…-plan` request requiring assignments, then separate member requests. Both use Sonnet 5.5 low effort, but manager plans have 24,000-token limit versus member/trace requests at 6,000. | — |
| Info | **Common starting conditions and limits check out.** Round-0 history is marked `shared:true`; both arms have matching 12 seed IDs (35400–35411), all 40 actors. All batch parts are complete, with no failed calls. Recorded study spend is [US$ redacted] against the [US$ redacted] study cap and [US$ redacted] ledger cap; each batch reserve is below the ledger's [US$ redacted] per-batch cap. | — |
| High | **The secondary claims are striking but narrow.** Verdict logic's exact paired sign test and Holm adjustment match preregistration: token wins 12–0, act-round wins 12–0, each raw p=.000488 and Holm p=.000977. These are secondary outcomes; small n and correlated outcomes still limit inference. | — |
| Medium | **The lingering failure is a symmetric interface mismatch, not a broad inability to solve.** Manager case 35401 ends with three symmetric checks: `M33.encodeRoute~M20.decodeRoute`, `M33.encodeRelease~M5.decodeRelease`, `M20.encodeVendor~M16.decodeVendor`; all directed checks are fixed. This pattern is consistent with both endpoint developers changing formats incompatibly. | — |
| Low | **External validity is limited:** 12 synthetic seeded cases, one model family/version, and a single size. Across three hypotheses (one primary), Holm is applied only to the two secondary hypotheses, as specified; it does not make the experiment broad or overcome the primary's low information. | — |

## Re-derived numbers

- **Solved:** `stigwait` 12/12; `manager` 11/12. **Fresh hold-out pass:** 12/12 and 11/12 respectively; case 35401 alone has 3 failing checks for manager, all others pass in both arms. `analysis.json` agrees: final failures sum 0 vs 3 (median 0 for both); outputs average 46,505 vs 71,844 tokens, costs [US$ redacted] vs [US$ redacted] per case.
- **H-LI105** (`holdoutFailing`): 1 win–0 losses, 11 ties; p=1, inconclusive. Preregistration's verbal rule is consistent with the sign test, but the one differing case cannot pass p<.05.
- **H-LI106** (`tokens`): 12–0; p=.000488, Holm .000977; supported.
- **H-LI107** (`actRounds`): 12–0; p=.000488, Holm .000977; supported. These are lower-is-better metrics in `verdict.mjs`; manager plan-only waves are excluded from act rounds.

The manager gradually clears checks (case 35401: 69 → 23 after its first act, then 17, 15, 11, 8, 6, 4, and 3). `stigwait` reaches 12/12 by wave 4. Most remaining work is eliminating incompatible symmetric encoders/decoders; the three residual failures are concrete examples. Verdict hold-out counts are derived from fresh-input per-case check counts, not merely solved-in-run counts.
