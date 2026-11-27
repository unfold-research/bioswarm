# LI39 free probes (bench, 2026-11-21)

For Coordination Research. No ledger entry, nothing on `main`. Probe 1 (the fleet pilot) runs while this is written;
its numbers are appended when it finishes (`LI39-PROBES-pilot.json`, next to this file).

## 1. Feasibility pilot (k160, wait vs market, seed 39990, cap 180 min)

- **(a) Instance integrity.** `materialize` builds k160 (local 2, directed 320, symmetric 80, tests 16, shown 3) from
  the same `rc/code.mjs` as LI38. On the probe seed: 720 checks (320 local, 320 directed, 80 symmetric), 1,120
  function names, **0 broken names, 0 undefined, 80 of 80 distinct record names**. So k160 is within the name pools; the
  rc limit that blocks k200/k240 does not bite at k160. (The same check failed at k240, as reported for LI38.)
- **(b) wall time, tokens, cap, first full pass (pilot seed 39990, cap 180 min):**

  | Arm | Wall (min) | Capped | Solved | Holdout | First full pass (min) | Calls | Out tok | Cost US$ (subscription, off ledger) |
  |---|---:|---|---|---|---:|---:|---:|---:|
| `wait` | 29.8 | no | yes | pass | 25.5 | 754 | 149,363 | [redacted] |
| `market` | 180.2 | **yes** | no (571 failing) | — | never | 354 | 65,141 | [redacted] |

  **Size decision:** k160 holds — `wait` finished before the cap and the instance is intact (720 checks, no broken
  names), which is the rule you registered. (`market` capping is not the criterion.)
  **Metric check:** minutes-to-first-full-pass is computable from the timeline (`fails` is the list of failing checks;
  first poll with `fails == []`); `wait` reached it at 25.5 min, `market` never. So `analyze-li39.mjs` (3d) is sound.
- **(c) Fleet parallelism.** The lab fleet is 2 runtimes (`rt-1`, `rt-2`), `perEndpoint: 2`, so **4 teams at once**.
- **(e) The fleet started both arms of the seed together** (both `wait` and `market` began at the same second on rt-1):
  yes, the fleet runs the two arms of a seed in parallel (4 slots: 2 runtimes × `perEndpoint` 2). So the driver can
  start them together; the pairity-ordered fallback (even seed starts `wait`) is not needed here, but I will still
  record in the spec which mode was used (addendum e) and log the fleet concurrency at each run start (addendum f).
- **Fleet time for 2 arms × 12 seeds (24 runs, 4 slots).** `wait` ran ~30 min; `market` hit the 180-min cap unsolved.
  If `market` often caps, the 12 `market` runs dominate: about 3 per slot × 180 min ≈ **9–11 h**, with `wait` runs
  filling the gaps. If `market` solves faster on some seeds, less. The cap and the time budget should assume `market`
  capping is common at k160. The fleet was otherwise idle during the pilot (no other bench Colony study).

## 2. Review-session tokens and cost at Claude API prices

From the runtime session telemetry (`pi/sessions/*.jsonl`) of the gpt-6-luna review agents. Token types: input,
output, cacheRead (gpt-6-luna cached the repeated prompt heavily).

| Review | input | output | cacheRead | Sonnet 5.5 | Opus 5.5 |
|---|---:|---:|---:|---:|---:|
| LI38 (largest) | 83,488 | 5,995 | 1,347,840 | cached [US$ redacted] / no-cache **[US$ redacted]** | cached [US$ redacted] / no-cache **[US$ redacted]** |
| LI37 (final) | 35,873 | 1,906 | 125,696 | [US$ redacted] / [US$ redacted] | [US$ redacted] / [US$ redacted] |
| LI37 (first) | 70,359 | 5,157 | 582,912 | [US$ redacted] / [US$ redacted] | [US$ redacted] / [US$ redacted] |

Claude prices (standard, per Mtok): Sonnet 5.5 in [US$ redacted] out [US$ redacted] cache read [US$ redacted]; Opus 5.5 in [US$ redacted] out [US$ redacted] cache read
[US$ redacted] (third-party, confirmed against the Anthropic page for Opus cache; see sources below).

**Recommended review ceiling.** Claude caching is marked explicitly per request, not automatic as on gpt-6-luna, so
the honest basis is the **no-cache** column of the largest review. One review:
- **Sonnet 5.5: cap [US$ redacted]** (LI38 no-cache [US$ redacted] headroom for a longer transcript);
- **Opus 5.5: cap [US$ redacted]** (LI38 no-cache [US$ redacted]).
A study whose review is re-run once doubles that. The Research Leader sets which model and takes the cap to the owner.

## 3. Build-time estimate for the review-on-Claude path (nothing built yet)

| | Item | Hours | Notes |
|---|---|---:|---|
| a | Per-study reviewer field in the spec | 1–1.5 | `bench.reviewModel` read by `colonyAgent` (it already takes `provider/model`); falls back to the fleet default. The report agent can stay on the default. |
| b | Anthropic credential on the runtimes | 1 + key | `lab-fleet.mjs credentials --provider anthropic < key.txt` writes `auth.json` and a restart picks it up. Needs the API key provisioned first (owner / Vault); the key never leaves benchhost. |
| c | Ledger reserve + reconcile for the review session, cap stop | 3–4 | New spend path: a review is one Colony session, not a batch. Reserve the review cap before `/lab/create`; poll `/lab/export` totals during the run; abort and reconcile if it crosses the cap; reconcile the actual cost after. Reuses the ledger lock and `correctStudyCost`-style entry. |
| d | `analyze-li39.mjs` with minutes-to-first-full-pass | 2–3 | From the timeline (`{t, files, fails}` per poll, already recorded): the metric is the first `t` with `fails === 0`, in minutes; no full pass = cap + 1 (worst). Plus the paired sign test and the secondary metrics, on the `analyze-li37.mjs` model. |
| | **Total** | **7–9.5 h** | about 1.5 working days, once the API key exists. |

Order, if approved: a and d first (free, testable offline), then b and c together (the paid path), then a free dry run
of the review path against an existing study's data before any paid review.

Sources for Claude prices: https://platform.claude.com/docs/en/about-claude/pricing ; https://www.finout.io/blog/claude-opus-5.5-pricing-2026-what-anthropics-new-flagship-actually-costs ; https://apidog.com/blog/claude-sonnet-5-5-pricing/
