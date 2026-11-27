# LI39 preregistration: does waiting for the trace converge sooner than a manager with a non-Claude model, in the Colony? (2026-11-21)

**Status:** registered 2026-11-21 before any LI39 data on the registered seeds. Approved by the Research Leader (design, with the
paired-run timing rule) and by the owner (review cap), 2026-11-21. Route B was decided 2026-11-20: Colony with
`openai-codex/gpt-6-luna`, reviewed by a Claude model on an API key, with the review spend on the ledger under its own cap. Written
after the LI33 to LI38 reports and reviews were seen, after LI37's exploratory numbers for the two arms used here, and after the
free pilot on probe seed 39990 (all disclosed below).

**Model.** `openai-codex/gpt-6-luna` through the Colony lab fleet (the fleet's runtimes hold only `openai-codex` credentials).
It is outside the Claude family, which the evidence ladder's L2 needs (`programs/coordination.md`). No other model is needed.

**Runner.** `observatory/batch2/colony/drive.mjs` on the research bench (benchhost), `timeline` on. Analysis: new
`observatory/batch2/colony/analyze-li39.mjs` (per-seed exact sign test, Holm on secondary hypotheses). Spec:
`observatory/batch2/colony/li39-k160.json`, sent to the bench after this page is on `main`.

## Why

LI38 (Haiku 5.5, batch) supported the primary: `stigwait` reached zero failing checks in fewer lockstep waves than a manager
with 12 act rounds at 160 modules (12 to 0, H-LI115). It also used fewer output tokens (H-LI118, 11 to 1). Final and
fresh-input quality did not separate (H-LI116, H-LI117 inconclusive). Under the programme's stop rule, the cell now reads
"faster and cheaper, final quality not separated", and only for the Claude family (Haiku in LI34, LI36 and LI38; Sonnet in LI35,
where `stigwait` won on act rounds, 12 to 0). L2 needs the same effect outside the Claude family. The batch runner speaks only to
the Anthropic API, so the second family runs in the Colony.

## Disclosure: the Colony prior points the other way

LI37 (gpt-6-luna, 80 modules, 12 seeds) ran `nopeer`, the same field and limits as `wait` here, beside `market` as unregistered
contrasts:

| Arm | Solved | Capped | Median wall minutes | Total tokens |
|---|---:|---:|---:|---:|
| `nopeer` | 12 of 12 | 0 | 21.5 | 454.2M |
| `market` | 10 of 12 | 2 | 17 | 296.1M |

Wall time there is the run's end, not the first all-pass. The design below was fixed with these numbers in view.

**The free pilot (gate P1, probe seed 39990, k160, not a registered seed) went the other way.** `wait` reached its first all-pass at
25.5 minutes and ended at 29.8, solved, holdout passing, 754 calls. `market` hit the 180-minute cap with 571 checks failing and
never reached an all-pass, 354 calls. One seed is not evidence; it is disclosed because it was seen before registration. It
changed nothing in the design: the size rule below was fixed before it and holds.

## Confound, stated before data

This is not the LI38 mechanism transplanted alone. The Colony arms differ in more than waiting for the trace:
- **Channel:** `wait` has field traces delivered to the owner; `market` has peer messages (`ant_send`).
- **Ownership:** in `wait` an ant may edit only its own files.
- **Runtime:** agents with tools, a shell and asynchronous turns, not lockstep batch waves.

In **both** arms a parent agent coordinates and writes no module. So `market` is a manager plus chat, and `wait` is a manager
plus a field with the waiting rule. A result here bears on the **combined** policy in this runtime. Mechanism transfer across model
families is claimed only together with LI38's batch result, and only for the direction both show.

## Design

- **Arms.** `wait`: LI37's `nopeer` armSpec (field `wait`, peer messaging off, LI37's instructions and `antLimits`). `market`:
  Colony's default team, with LI37's `antLimits`.
- **Task.** LI38's shape: 160 modules, 2 local, 320 directed and 80 symmetric checks, 16 test inputs per check, 3 shown, 4 ants of
  40 modules each. Strict check for feedback and scoring. Cap 180 minutes.
- **Cases.** 12 new seeds, 39400 to 39411, paired across arms.
- **Timing of the pair, fixed before the run.** The primary is in minutes, so the two arms of a seed share fleet conditions:
  they start at the same time on the fleet. If the bench cannot start them together, they run back to back, with the order
  set by seed parity before any run: an even seed starts with `wait`, an odd seed with `market`. The spec records which mode
  was used. P1 showed the fleet can start both arms of a seed in the same second (4 slots: 2 runtimes, 2 teams each), so
  **simultaneous starts** is the mode; alternation applies only if a start fails. For every run the driver records the fleet's concurrency at its start: Colony runs and other agents active on its
  runtime. This is reported without a verdict.
- **Fallback (fixed before the pilot; not triggered).** If the bench pilot (probe seed 39990) had shown the k160 instance could
  not be built intact, or **both** arms at the cap, the study would run LI36's shape instead (120 modules, cap 150 minutes). The
  instance was intact (720 checks, 1,120 function names, 80 of 80 distinct records, none broken) and `wait` finished before the
  cap, so the study runs at **k160**. `market` reaching the cap was not a criterion.

## Hypotheses (12 seeds; the seed is the unit)

- **H-LI119 (primary).** `wait` against `market` on **minutes to first all-pass**: time from the task message to the first
  timeline snapshot with zero failing checks on the strict check. A run that never reaches it scores worst (cap + 1 minute);
  two runs of a seed that both never reach it are a tie. This is LI38's primary
  (`wavesToSolve`) in wall-clock form; the Colony has no lockstep waves.
- **H-LI120.** `wait` against `market` on failing checks at the end of the run.
- **H-LI121.** `wait` against `market` on checks failing on fresh inputs.
- **H-LI122.** `wait` against `market` on total tokens per run.

Rule: supported if the first arm is better in more seeds with p < 0.05; refuted if the second is better in more seeds; otherwise
inconclusive. Holm across H-LI120 to H-LI122.

**Reported without a verdict:** runs solved and capped per arm; wall minutes to the run's end (LI37's measure); field traces
validated against the pair (LI37's definition); regressions; tokens to first all-pass.

## Costs

- **Study.** [US$ redacted] on the ledger: Colony runs use the fleet's subscription. Tokens are reported as telemetry, not spend.
- **Claude review, separate cap, on the ledger.** One review session on a Claude model through an API key, with spend reserved
  and reconciled in `/srv/bench/ledger/global-budget.json`. **Cap approved by the owner on 2026-11-21: up to [US$ redacted] on
  the ledger. The final value is 1.5 times the cost measured in gate P2, never above [US$ redacted]** If P2 prices the review above [US$ redacted]
  the study is not registered until the Research Leader and the owner decide.
  **P2 result:** the largest earlier review (LI38's) would cost [US$ redacted] on Claude Sonnet 5.5 and [US$ redacted] on Opus 5.5 at API
  prices without caching (the bench's basis, since Claude caching is explicit). 1.5 times gives [US$ redacted] for Sonnet and [US$ redacted]
  for Opus, which is above [US$ redacted] So the reviewer is **Claude Sonnet 5.5 with a cap of [US$ redacted]** on the ledger for one review
  session. A second review session is not covered by this cap and needs the Research Leader. The report writer stays gpt-6-luna,
  because the report answers the review and is not the independent check.
- Free in the ledger today: [US$ redacted] of [US$ redacted] (Research Leader, 2026-11-21).

## What the bench has to build (bench estimate: 7 to 9.5 hours, about 1.5 working days, once the API key exists)

1. A per-study reviewer field in the spec (for example `bench.reviewer`), so this study's review runs on Claude and every other
   study keeps gpt-6-luna.
2. An Anthropic credential (API key) on the runtime that runs the review.
3. Reserve and reconcile the review session's spend in the canonical ledger, and stop at the study's review cap.
4. `analyze-li39.mjs`: minutes to first all-pass from the timeline, plus LI37's outputs.
5. In the driver: simultaneous starts for the two arms of a seed (alternating order as fallback), the mode recorded in the spec,
   and the fleet's concurrency logged at each run start.

The API key is provisioned by the owner; it stays on benchhost. Fleet time for the run itself: about 9 to 11 hours if `market` often
reaches the cap (bench, from P1).

## Gates before registration (free, run by the bench 2026-11-21; `results/li39/PROBES.md`)

- **P1, pilot: passed.** k160 instance intact and `wait` finished before the cap, so there is no fallback; both arms started in
  the same second. Numbers above.
- **P2, review cost: passed.** Sonnet 5.5 at [US$ redacted] under the [US$ redacted] owner cap. Numbers above.

## What the result decides

- **H-LI119 supported:** the latency cell has its effect in three models, one outside the Claude family: Haiku (LI38), Sonnet
  (LI35, on act rounds) and gpt-6-luna (LI39, in the Colony, combined policy). It is recorded as L2 for "faster", and L3 work goes
  on. This is also a product signal: the `wait` field becomes the candidate default for the app.
- **H-LI119 refuted** (`market` reaches first all-pass sooner, as LI37's prior suggests): the cell stays "faster, only in the
  Claude batch instrument", which is the stop rule's "cost, not quality", Claude only. No paid study chases latency further. The
  Colony's default stays `market`.
- **Inconclusive:** recorded as such. No rerun unless a different runtime confound can be removed.
- **H-LI120 refuted** (the manager ends with fewer failing checks): recorded as a trade-off, as LI38's decision rule says.

## Limits (known at registration)

- One non-Claude model, in a runtime that differs from the batch instrument (see Confound).
- 12 seeds; synthetic generated tasks.
- Wall-clock outcomes depend on fleet load and provider latency. The pair rule above (simultaneous starts, or alternating order)
  and the recorded concurrency limit this, but cannot remove provider-side variation.
- The review model differs from the one that reviewed the other LI studies.
- Tokens (H-LI122) are confounded with stalls: a run that stalls until the cap may spend fewer tokens than one that solves, as
  `market` did in the pilot (65,141 output tokens against 149,363). H-LI122 is read beside the solved and capped counts, never
  alone as "cheaper".
