# Independent review of LI42: second-family replication (gpt-6-luna), stigwait vs manager at 160 modules

**Reviewer:** claude-sonnet-5-5 (research bench automatic review). I re-derived everything from the per-case numbers supplied in the prompt. I could not open the raw `wave-*.jsonl` files, the per-request samples, the ledger or the per-case hold-out file, so checks 2 and 3 are only partly done (see the table).

| Severity | Finding | Response |
|---|---|---|
| High | The H-LI127 win depends on counting manager plan waves, which is as preregistered, but they are structural: a manager alternates plan and act waves. With plan waves excluded (`actRounds`, reported without a verdict) I get stigwait better in 9 cases, manager in 2 (seeds 42401 and 42405), 1 tie, so p ≈ 0.065. The "faster" claim is mostly "fewer wall-clock waves", not "fewer repair rounds". | — |
| High | Verdict logic vs preregistration: the prereg says "refuted if the second arm is better in more cases", and `verdict.mjs` applies that with no p threshold. H-LI128 (0 vs 1, p = 1, 11 ties) is therefore labelled "refuted", and the prereg would then record it as a "trade-off". That is a label artefact. The honest reading is that final quality is not separated, with one stigwait failure. | — |
| Medium | Hold-out (H-LI129): stigwait passed fresh inputs on 8 of 11 solved cases, manager on 5 of 12. Paired result is 3 to 1 (p = 0.625), inconclusive. I could not see per-case hold-out data or the 40 fresh inputs. The likely mechanism is modules that pass the 16 visible tests but not the fresh ones; I did not check it. Neither arm is clean. | — |
| Medium | Failure case 42401 (stigwait): failing checks fall 391, 321, 43, 2, 2, 2, 1 and stay at 1 from wave 6. One actor acts each wave until the 12-round cap, and the case ends unsolved with 1 failing check. The manager cleared the same case at wave 8. A single stuck module is not repaired by the trace-waiting loop, so stigwait has a small tail-risk. | — |
| Medium | The prereg file supplied ends at Amendment 3. The spec cites "Amendment 4" (caps 1.5 / 10.5 / 2, margin rule) and carries the route change and the stop-rule clarification only in `reportNote`. Check that Amendment 4 is committed to `main` with the prereg, not only in the spec. | — |
| Medium | Not verified from the supplied material: sample requests per arm, `reasoning_effort` in the request bodies, shared round 0 at file level, the 160-module and 16-test configuration, and the ledger and caps. The summary supports the model and effort fields (10,124 requests, all `gpt-6-luna`, all `medium`, all flex, one transport entry). It shows no mid-run switch. The route was fixed (20:07) before the study (22:25), and the pilot is excluded. Wave-0 failing counts are identical across arms in all 12 cases, consistent with shared instances and a shared start. | — |
| Low | Multiplicity: four tests, with Holm applied to the three secondaries as preregistered. Holm p: H-LI130 0.00146, H-LI129 1, H-LI128 1. The primary is unadjusted, as preregistered. | — |
| Low | `tokensPerSolved` divides all tokens by the number of solved cases (11 vs 12), which slightly penalises stigwait. The per-case comparison is unaffected (12 to 0). Tokens include reasoning, and the manager's plan output counts. | — |
| Low | Scope limits: n = 12 per arm; one OpenAI model with no dated snapshot; effort scales differ from Haiku; synthetic coupled code tasks; pilot-phase transport and route incidents; a Cloudflare 524 on the public endpoint (the study ran over WireGuard). Direction-only comparison with Haiku is appropriate. Pooling LI38, LI41 and LI42 would not be valid. | — |

## Re-derived numbers

**wavesToSolve (stigwait vs manager), by seed 42400–42411:**

| Seed | 00 | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| stigwait | 5 | ∞ | 4 | 4 | 3 | 8 | 3 | 4 | 3 | 3 | 4 | 3 |
| manager | 12 | 8 | 16 | 12 | 8 | 10 | 12 | 10 | 8 | 14 | 8 | 10 |

- H-LI127: stigwait better in 11 cases, manager in 1 (seed 42401). p = 2·(1+12)/4096 = 0.00635. This matches `verdicts.json` (**supported**), and 11 to 1 meets the "10 to 2 or better" threshold.
- Solved: stigwait 11 of 12 (42401 unsolved), manager 12 of 12.
- **H-LI128 (final failing checks):** 0 vs 1, 11 ties, p = 1. This matches the file's verdict "refuted", which is a label artefact (see table).
- **H-LI129 (hold-out failing):** 3 vs 1, p = 0.625, inconclusive. Matches. Per-case values were not supplied, so I could not recompute the winners.
- **H-LI130 (tokens):** stigwait is lower in 12 of 12, p = 2/4096 = 0.000488, supported; Holm p = 0.00146. Matches.
- Token sums: stigwait 5,081,233 in total, 461,930 per solved case (÷11). Manager 8,685,714 in total, 723,810 per solved case (÷12). Both match. The per-case ratio is about 0.58.
- Secondary check: `actRounds` shows stigwait 9, manager 2, 1 tie, p ≈ 0.065.

**Verdicts reproduced:** primary H-LI127 supported; H-LI130 supported; H-LI129 inconclusive; H-LI128 mechanically "refuted" (p = 1).

**Conclusion:** latency (counting plan waves) and token direction transfer to gpt-6-luna. Quality is not separated, and the single stigwait failure and the weak hold-out parity should be stated alongside the claim. The cell should not be described as fully transferred without noting the plan-wave counting and the 12-case, two-family, synthetic-task scope.
