# LI38 gate G1: free token probe at k240 (bench, 2026-11-20)

Free calls only: the token-counting endpoint, which is not billed, and one request with an impossible `max_tokens`, which
the API rejects with a 400 before running it. Run on benchhost from a fresh clone of `main` (`d761ae0`). Calibration data:
LI36's raw files (`results/li36-k120`, restored from R2). Probe script: `/tmp/li38probe/probe.mjs` on benchhost (not in the
repository).

## 0. The instrument cannot build k240 or k200 today (blocks G1 as written)

`makeInstance` (`observatory/batch2/rc/code.mjs`) draws names from fixed pools:

| Size (LI36 density) | Function names needed (2k local + 2 × directed) | Pool | Record names needed (symmetric) | Pool |
|---|---:|---:|---:|---:|
| k120 (LI36) | 720 | 1,248 | 80 | 81 |
| k160 | 960 | 1,248 | 107 | 81 |
| k200 (fallback) | 1,200 | 1,248 | 136 | **81** |
| k240 | **1,440** | **1,248** | **160** | **81** |

- At k240 the name loop never ends: it rejects duplicates forever.
- Above k120 the record pick draws from an empty list, gets `undefined`, and builds `encodeundefined` and
  `decodeundefined` for several edges, so the instance is silently broken. k200 is affected too.
- Fixing this needs larger pools, used only once the current pools run out. That is how LI19 extended them, and it
  leaves every earlier instance unchanged. This is an instrument change for you to approve; the bench has not made it.
- The counts below come from a **probe-only copy** with extended pools (a digit suffix on function names, and a "Two"
  suffix on record names). Names barely change the token counts.

## 1. Token counts (input, measured)

| Request | Input tokens | Note |
|---|---:|---|
| LI36 real first plan, k120, seed 36200, wave 1 | 136,463 | equals the billed input of that request exactly (the probe is calibrated) |
| Same seed, plan with every check failing (synthetic) | 94,815 | real failure texts are longer: ratio real / synthetic = 1.44 |
| **k240, seed 38990, plan, every check failing** | **190,034** | 1,120 checks |
| **k240, projected real first plan** (× 1.44) | **≈ 273,000** | above 100k, so in Haiku 5.5's long-context price band |
| **k240, seed 38990, `solo` wave 0** | **170,143** | later solo waves add the code and the failures: ≈ 300k |

## 2. Output: does the plan fit 96,000? What is the limit?

- **Haiku 5.5 output limit: 128,000 tokens.** API answer: "max_tokens: 10000000 > 128000, which is the maximum allowed
  number of output tokens for claude-haiku-5-5".
- **LI36 plans at k120:**
  - output mean 18,306, p95 67,368, max 75,495 tokens;
  - all 69 ended with `end_turn`;
  - **every plan carries a `thinking` block**. The JSON assignments are only about 2,200 tokens; the rest is the
    model's default thinking.
  - The plan output therefore grows with the problem, not with the 60-word instructions.
- **Projection to k240.** Output scales between ×1.7 (LI34's k80 → k120 growth carried forward) and ×2 (linear in k).

  | Limit | Share of k240 plans over the limit | Same as LI36 plans over |
  |---|---|---|
  | 96,000 | about **13–16%** | 48k–56k (11 of 69 over 48k) |
  | 128,000 | about **1.5–10%** | 64k–75k (7 of 69 over 64k; max 75.5k) |

- **G1 verdict:** the plan **does not fit 96,000**. At the 128,000 limit, 1.5–10% of plans would still be cut, so it
  **does not fit reliably either**. The rule then sends the study to k200, which the instrument cannot build either (§0).
- **`solo`:** 240 complete modules are about 67k tokens of code text alone (LI36 averages about 280 text tokens per
  module reply), plus thinking. Expect most `solo` replies to hit 128,000 and be cut.
- **Option for you, not a bench decision:** turn thinking off (`thinking: disabled`), as CY2 did. Plan output would
  fall to about the 2–5k of JSON, and the fit problem goes away. It changes the LI36 conditions, though.

## 3. G2: expected spend (3 arms, 12 cases, up to 24 lockstep waves)

Batch prices for Haiku 5.5 (from PR #42's `pricing.mjs`, official table of 2026-11-16):

| Band | Input | Output |
|---|---|---|
| Up to 100k prompt tokens | 0.05 / M | 0.25 / M |
| Above 100k prompt tokens | 0.25 / M | 1.25 / M |

LI36's measured spend by component, priced with the band, is scaled ×1.7 to ×2 (`solo` is built from the counts above):

| Component | LI36 k120 (banded) | LI38 k240 |
|---|---:|---:|
| Start wave (shared) | 0.58 | 1.0–1.2 |
| `stigwait` | 1.61 | 2.7–3.2 |
| `manager` members | 1.50 | 2.6–3.0 |
| `manager` plans (all in the long band at k240) | 1.96 | 6.1–6.6 |
| **Two arms** | 5.66 | **12.4–14.0** |
| `solo` (13 calls per case, ≈ 300k in, up to 128k out, long band) | — | **25–37** |
| **Three arms** | — | **37–51** |

- **G2 verdict:** above [US$ redacted] Drop `solo` first, as the rule says. The two arms alone come to about [US$ redacted] so
  they sit on the cap with no margin.
- Raising the plan limit to 128k adds output to the plans.
- Next cut in the rule: 10 cases. That gives about [US$ redacted]

## 4. Spend accounting found on the way: the ledger understates long prompts

`run-rc3.mjs` prices every request at the short band (`PRICE`: 0.05 / 0.25). In LI36, 18 of the 69 plan requests had
more than 100k input tokens.

| | US$ |
|---|---:|
| Recorded in the ledger | [redacted] |
| With the band | [redacted] |
| Not recorded | [redacted] |

Any earlier rc study with prompts above 100k (large manager plans) is understated the same way. Request 4's port
(PR, see the reply) fixes this for new runs. Correcting past entries is for the Research Leader and the owner.
