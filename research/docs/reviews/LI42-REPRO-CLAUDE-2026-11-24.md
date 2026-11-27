# Reproduction check: LI42 verdicts

## 1. Re-run against the registered verdicts

The bench's re-run of `node observatory/batch2/rc/verdict.mjs observatory/batch2/rc/sweeps/LI42.json` and `results/li42/verdicts.json` agree. I compared them field by field:

- **Totals:** stigwait 11 solved, 8 holdout-clean, tokensPerSolved 461930. Manager 12 solved, 5 holdout-clean, tokensPerSolved 723810.
- **H-LI127:** 11 to 1, p = 0.00634765625, supported.
- **H-LI128:** 0 to 1, p = 1, pHolm = 1, "refuted".
- **H-LI129:** 3 to 1, p = 0.625, pHolm = 1, inconclusive.
- **H-LI130:** 12 to 0, p = 0.00048828125, pHolm = 0.00146484375, supported.

They match, and the bench reports them byte-identical as JSON. This shows the analysis step is deterministic on a fixed `state.json`. It does not show that `state.json` itself is faithful to the raw model replies, or that the model run would reproduce (see section 3).

## 2. Hand re-derivation of `wavesToSolve`

I read the first index in `failingPerWave` where the count is 0, with the start wave as index 0. I did this for all 12 cases in both arms, not just 3. An unsolved case is ∞.

| Case | stigwait: first 0 at | manager: first 0 at | Better arm |
|---|---|---|---|
| 42400 | 5 | 12 | stigwait |
| 42401 | unsolved (stuck at 1) = ∞ | 8 | **manager** |
| 42402 | 4 | 16 | stigwait |
| 42403 | 4 | 12 | stigwait |
| 42404 | 3 | 8 | stigwait |
| 42405 | 8 | 10 | stigwait |
| 42406 | 3 | 12 | stigwait |
| 42407 | 4 | 10 | stigwait |
| 42408 | 3 | 8 | stigwait |
| 42409 | 3 | 14 | stigwait |
| 42410 | 4 | 8 | stigwait |
| 42411 | 3 | 10 | stigwait |

- The split is 11 to 1 with no ties. The exact two-sided sign test gives p = 2·(1 + 12)/2¹² = 26/4096 = 0.00634765625. This matches the registered file, and the supported verdict is correct under the 10-to-2 threshold.
- The `solved` flags agree with the arrays. Eleven stigwait cases end at 0, and 42401 ends at 1. All 12 manager cases end at 0.

### Other numbers I could check from the per-case data

- **H-LI128 (`final`):** the only non-tie is 42401, with stigwait at 1 and manager at 0. That gives 0 to 1 and p = 1, which matches.
- **H-LI130 (`tokens`):** stigwait is lower in all 12 cases, so 12 to 0 and p = 2/4096 = 0.000488, which matches. Holm over the three secondary p-values (0.000488, 0.625, 1) gives 0.00146, 1 and 1, which matches.
- **tokensPerSolved:**
  - Stigwait's 12-case token sum is 5,081,233. Dividing by 11 solved gives 461,930.3, which rounds to 461930.
  - Manager's sum is 8,685,714. Dividing by 12 gives 723,809.5, which `Math.round` takes to 723810.
  - Both match.
- **H-LI129 (`holdoutFailing`) and the holdout totals (8 vs 5):** I could not re-derive these. The per-case numbers I was given exclude `holdout.json`. I can only say they are consistent with the re-run.

## 3. Mismatches and concerns

**Mismatches:** none.

**Concerns, none of which changes a verdict:**

1. **"Refuted" on H-LI128 rests on a single case.**
   - The 0-to-1 split comes only from the unsolved stigwait case 42401. The literal rule ("second arm better in more cases") labels it "refuted" with p = 1.
   - The prereg says a refuted H-LI128 is "recorded as a trade-off". That reading would be overstated. The report should say the evidence is one case with p = 1, not a quality difference.
2. **Different `tokensPerSolved` divisors.**
   - Stigwait's total includes the tokens of the unsolved case 42401, but the sum is divided by 11 solved. Manager's is divided by 12.
   - The metric as defined is mechanically correct, but it inflates stigwait's per-solved figure slightly. The registered test (per-case paired tokens, 12 to 0) is unaffected.
3. **Round budget is not visibly symmetric.**
   - The per-wave arrays have 17 entries (waves 0 to 16). Stigwait 42401 stops acting after index 12, which is consistent with 12 act rounds.
   - Manager, with plan waves interleaved, reaches index 16 with only about 8 act rounds. Case 42402 solves exactly at the last index (16).
   - No manager case was censored, since all solved, so the result is unaffected. But the report should state how the wave cap maps to "12 act rounds" for the manager arm. If any manager case had needed more waves, the cap would have mattered.
4. **Ties and infinities.**
   - `wavesToSolve` uses `Infinity` for unsolved cases. A case where both arms were unsolved would be a tie and drop out of the sign test; none occurs here.
   - Infinity never reaches the JSON output, so serialization is not an issue.
5. **Non-determinism.**
   - Only the analysis is reproduced, and it is deterministic.
   - The data-generating run is not reproducible, because of a model with no dated snapshot, a flex transport and sampling.
   - The distinct returned `model` strings are not visible in what I was given. If more than one appeared, the prereg says the cell stays `preliminary-*` regardless of these verdicts.
6. **Spec versus prereg text.** The spec has pilot cap 1.5 and study cap 10.5 (Amendment 4), while the prereg body still says 1 and 11. This is a documentation inconsistency and does not touch the verdict computation. The report should carry the amended values.

**Conclusion:** the re-run matches the registered verdicts exactly. My hand derivation of `wavesToSolve` and its sign test (11 to 1, p = 0.00634765625) confirms the primary result. The secondary results I could check from the data (H-LI128, H-LI130, token averages) also match. H-LI129 and the holdout totals are not verifiable from the numbers provided.
