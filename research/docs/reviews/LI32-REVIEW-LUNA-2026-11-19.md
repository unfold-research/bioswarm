# LI32 independent review

**Reviewer:** openai-codex/gpt-6-luna (Colony bench, research bench automatic review), read-only.

| Severity | Finding | Response |
|---|---|---|
| High | **Primary result is narrow and metric-sensitive.** H-LI94 is supported by 10/1 wins among 11 non-tied seeds (two-sided sign test p=.0117), but the total bilateral-event counts (42 vs 116) are not the paired test. The event detector counts every matching encoder edit, potentially multiple events per pair; results are not an estimate of unique pairs or independent interactions. | — |
| High | **“Required announcement” is only partially evidenced.** The claim arm exports show field traces (65 in seed 32400) and the registered detector labels 278 traces across runs as announcements; nopeer also uses field traces (33 in that run) but none match its phrase detector. Market has no field. This supports distinct claim-vs-default behavior, not proof that every relevant rewrite was preceded by a valid announcement. `analyze-li32.mjs` counts phrase matches anywhere in `field_trace`, without checking pair, timing, or whether the trace was accepted. | — |
| Medium | **Bilateral definition and implementation have edge cases.** It attributes a pair when edits touch the named function within 60 seconds and the pair failed at the earlier edit's last recorded snapshot. Snapshot resolution can misclassify transient pass/fail states; it does not require the pair still failing at the later edit. File-level first-write exclusion also excludes same-timestamp first edits to other functions in that file. Function telemetry improves substantially on LI31 but does not establish intentional mutual adaptation. | — |
| Medium | **Holdout saturates.** All 36 runs solved and passed holdout (0 failing fresh checks), so H-LI95 is necessarily inconclusive (0/0, p=1); this is a ceiling, not evidence of equivalence. | — |
| Medium | **Small, narrow experiment.** n=12 paired seeds, three related arms in one model/runtime family, synthetic generated modules/checks. Results do not establish general effects across models, real codebases, or longer/other team structures. Four hypotheses and several aggregate metrics also invite selective emphasis; Holm is applied only to secondary hypotheses as registered. | — |
| Low | **Mechanics broadly match registration.** Each sampled run uses four worker ants partitioned over 10 modules each; claim/nopeer requests disable peer messaging, market does not, and claim/nopeer have the registered claim/wait field mode. Same seeds and `makeInstance` config produce common round-0 instances. No run capped; 200-cycle and 60-per-pair limits are declared in config. No ledger exists for subscription runs; per-run token totals are telemetry, not a budget audit. | — |

## Re-derived numbers

Ran `node observatory/batch2/colony/analyze-li32.mjs` (matches `results/li32/analysis.json`). All arms: **12/12 solved, 12/12 holdout pass, 0 capped**. Aggregate: claim 42 bilateral / 55 regressions / 278 announcements; nopeer 116 / 79 / 0; market 109 / 58 / 0. Median wall minutes: 12.1 / 9.8 / 9.3. Reported tokens: 156,258,451 / 111,400,288 / 102,491,988.

| Hypothesis (claim vs comparator) | Wins | p (Holm secondary) | Verdict |
|---|---:|---:|---|
| H-LI94 bilateral (nopeer) | 10–1, 1 tie | .01171875 | supported |
| H-LI95 holdout failures (market) | 0–0, 12 ties | 1 (1) | inconclusive |
| H-LI96 regressions (nopeer) | 7–3, 2 ties | .34375 (.6875) | inconclusive |
| H-LI97 wall time (nopeer) | 3–9 | .145996 (.437988) | refuted |

The rule implementation matches preregistration: two-sided exact sign test on paired non-ties; supported requires first arm lower more often and p<.05; refuted when comparator is lower more often; else inconclusive. The H-LI97 refutation is directional, not statistically significant; its p is not below .05.

**Cases:** claim seed 32400 shows why fresh-input success is distinct from repair dynamics: an early sampled round-trip failure was `M26.decodeDevice(M11.encodeDevice(rec))`, with encoder returning `undefined`; eventual run repaired all checks and holdout. Similar initial undefined exports cause broad failures before implementations land. In claim seed 32401 wall time was 23.1 min (longest claim); the registered paired comparison shows claim slower in 9 seeds. H-LI94’s paired wins establish fewer detected bilateral events, not that the field improves final correctness: every arm ended perfect. `run.log` records early `fetch failed` retries for rt-1 followed by completed 36-run batch; no rerun is disclosed as a replacement.

**Limits:** sampled exports inspected for seed 32400; all-run results reproduced via registered script. No sandbox replay or provider telemetry audit.
