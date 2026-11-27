# LI42 report: waiting for the trace against a manager at 160 modules (2026-11-24)

Preregistration: `tasks/LI42-SECOND-FAMILY-PREREG.md`; Code: `observatory/batch2/rc/sweeps/LI42.json`; Data: `results/li42-k160/`; Analysis: `results/li42/verdicts.json`; Review: `docs/reviews/LI42-REVIEW-CLAUDE-2026-11-24.md`. LI42 is LI41 with the model changed to gpt-6-luna (OpenAI via LiteLLM, reasoning_effort medium): same instrument, size, density, rounds and limits; seeds 42400–42411. H-LI127–H-LI130 are LI41's H-LI123–H-LI126 with the model changed. It compares `stigwait` and `manager` on 12 synthetic coupled-code cases, using strict feedback. LI38, LI41 and LI42 are descriptive side-by-side only: compare effect directions, never absolute waves, checks, tokens, cost or reasoning tokens, and do not pool families.

Planned transport was batch, flex plan B. Amendment 1 moved pilot wave 1 onward and the study to synchronous flex for speed (batch took about two hours per wave), not failure; model, prompts, limits, effort and price were unchanged. Amendment 2 composed pilot wave 0 of completed batch replies plus its unfinished remainder on flex; the batch was cancelled. Amendment 3 treated 15 OpenAI HTTP 500 batch errors as transport failures and resent those requests on flex; the first pilot wave 1 (108/140 sent, 86 returned) was discarded, unread and unapplied, but its [US$ redacted] cost counted against the cap. No wave advanced without every member receiving an API response; delivered model output remained data for the unchanged instrument. After eight public HTTP 524s on the pilot redo plan call (Cloudflare's ~100-second cutoff), the bench switched before study wave 1 to the same LiteLLM/model configuration over internal WireGuard; only that plan request was resent. Whether those eight cut calls were billed upstream is unknown; [US$ redacted] was conservatively charged. The route was fixed for the study, without fallback. Pilot seed 42390, including its mixed transports, is excluded from all verdicts.

Amendment 4 reallocated the [US$ redacted] total cap to pilot [US$ redacted] study [US$ redacted] and review [US$ redacted] Projection (A), with incidents, was [US$ redacted]; applied-waves-only projection (B), used by the gate, was [US$ redacted] Both projections are below [US$ redacted]; B was below the [US$ redacted] threshold, so the continue branch applied. Pilot incidents used [US$ redacted] of the original [US$ redacted] cap. For requests above 272,000 tokens, since the gateway table has no batch price, the runner assumes flex pricing ([US$ redacted] input / [US$ redacted] output per million tokens); no study request crossed 272k (`run.log`, longBand 0).

| Arm | Solved | Fresh-input holdout clean | Mean output tokens | Mean cost |
|---|---:|---:|---:|---:|
| `stigwait` | 11/12 | 8/12 | 423,436 | [US$ redacted] |
| `manager` | 12/12 | 5/12 | 723,810 | [US$ redacted] |

Distinct returned model strings: `gpt-6-luna` (10,124 requests); effort `medium` (10,124); transport flex (10,124). No multiple model strings, so the registered preliminary-status condition is not triggered.

## Verdicts

| Hypothesis | Verdict (registered) | Paired result |
|---|---|---|
| H-LI127 (primary): `stigwait` reaches zero failing checks in fewer waves | supported | 11–1, p = 0.00634765625 |
| H-LI128: fewer final failing checks | refuted | 0–1, p = 1; 11 ties |
| H-LI129: fewer holdout failures | inconclusive | 3–1, p = 0.625; Holm p = 1 |
| H-LI130: fewer output tokens | supported | 12–0, p = 0.00048828125; Holm p = 0.00146484375 |

## What it shows

1. Re-derived from the 12 per-seed wave trajectories: `stigwait` reached zero first in 11 cases and `manager` in one (42401); the exact two-sided sign test is p=0.00634765625. With 12 cases, support requires 10–2 or better; 9–3 (p=0.146) would be inconclusive, not partial transfer. Plan waves count as registered, so this is fewer total waves, not necessarily fewer repair rounds. Post hoc, excluding plan waves, `stigwait` led 9–2 with one tie (p≈0.065); this does not change the registered verdict.
2. `stigwait` used fewer output tokens in all 12 paired cases. Its unsolved case 42401 ended with one failing check; `manager` solved it at wave 8. Thus final quality is not separated by this evidence, despite H-LI128's mechanically registered “refuted” label based on that single case (p=1). Fresh-input clean counts were 8/11 solved for `stigwait` and 5/12 for `manager`; paired evidence is inconclusive, not clean parity.
3. Direction-only comparison: the faster/less-token direction seen in LI38 and LI41 is also observed here, while quality remains unresolved; this is not a pooled or absolute cross-family comparison.

## Limits

Twelve cases, two families with one model each (the gpt-6-luna snapshot is undated), synthetic coupled-code tasks only; no broader transfer claim follows. One `stigwait` case remained stuck at one failing check through the cap, a tail-risk. The review noted plan waves are structural and act-round-only comparison weaker (9–2–1, p≈0.065); H-LI128 is a one-case artefact; holdout case data was unavailable, and several request/configuration and ledger checks were not independently verified. Run exports confirm all 10,124 study requests used the same model string, medium effort and flex transport; route was fixed before study wave 1. The reproduction matched the registered JSON verdicts exactly and re-derived primary, final and token results; it could not independently rederive holdout values, flagged the one-case H-LI128 interpretation and the `tokensPerSolved` divisor (all tokens divided by solved cases). It also noted manager's alternating plan/act waves and non-reproducibility of model outputs; neither alters registered verdicts. A cap stop would make a run incomplete: no verdicts, no cases cut, and resumption only with owner's approval through the Research Leader. Pilot floor rule: if neither arm solved seed 42390 within 12 rounds, no study before Research Leader review; the study proceeded under that gate. The pilot is excluded from all verdicts.

## Economy

Computed by `bench/economy.mjs` from the raw data (batch study, claude-haiku-5-5).

| Arm | Requests | Input | Output | Thinking | Cost | Solved | Cost/solved | >[redacted]k (extra) | Truncated (wasted) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| start | 1,920 | 1,402,204 | 2,207,151 | 1,397,203 | [US$ redacted] | n/d | n/d | 0 ([US$ redacted]) | 0 ([US$ redacted]) |
| stigwait | 4,052 | 8,550,043 | 2,874,082 | 1,019,598 | [US$ redacted] | 11 | [US$ redacted] | 0 ([US$ redacted]) | 0 ([US$ redacted]) |
| manager | 4,152 | 14,627,851 | 6,478,563 | 3,695,104 | [US$ redacted] | 12 | [US$ redacted] | 0 ([US$ redacted]) | 15 ([US$ redacted]) |
| **total** | 10,124 | 24,580,098 | 11,559,796 | 6,111,905 | [US$ redacted] | | | 0 | 15 ([US$ redacted]) |

n/d: shared start wave, not an arm.

Returned model strings: `gpt-6-luna` (10124); reasoning_effort sent: medium (10124); transport: flex (10124).

Thinking is 53% of output tokens. Reserved [US$ redacted] actual [US$ redacted]
