# LI38 preregistration: does waiting for the trace converge in fewer waves than a strong manager at 160 modules? (2026-11-20)

**Status:** registered 2026-11-20 before any LI38 data, after the LI33 to LI37 reports and reviews were seen (disclosed).
Approved by the Research Leader on the owner's decision of 2026-11-20 (coordination agenda of that date), cap [US$ redacted] Haiku 5.5,
Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` on the research bench
(benchhost). Verdicts: `observatory/batch2/rc/verdict.mjs` (per-case exact sign test, Holm on secondary hypotheses). Review:
`docs/reviews/REVIEW-PROMPT.md`. Spec: `observatory/batch2/rc/sweeps/LI38.json` (sent to the bench after this page is on `main`).

**Why.** With 12 act rounds for both arms at 120 modules (LI36) the manager tied `stigwait` on final and fresh-input failures
(12 of 12 each), so the LI34 quality gap (23 against 11 of 24) was a matter of rounds. What LI36 left is speed and cost: mean
failing checks reached 0 by `stigwait`'s fifth wave and only after the manager's twelfth act round, with plan waves in between,
and `stigwait` used fewer output tokens (H-LI110, 11 to 1). The speed difference was never a registered hypothesis (exploratory
in the LI36 report). The programme's stop rule (`programs/coordination.md`) asks whether the manager catches up given more
rounds; at 120 modules it did. LI38 registers the speed difference on fresh seeds and asks whether the manager still catches up
on a larger, denser task: 160 modules at LI36's directed density, which no study has run with 12 act rounds.

**Design.** 160 modules, 320 directed and 80 symmetric edges, 16 test inputs per check. Everything else is LI36: Haiku 5.5 at
default effort (thinking on, as in LI36), 12 act rounds for each arm, `managerSlack` on (plan waves do not consume act rounds),
member output up to 8,000 tokens, strict feedback; the one other change is the plan output limit, **128,000** (the model's
maximum) instead of 96,000, so that manager plans are not cut (see G1).

**Arms.** `stigwait`, `manager`. 12 new cases, seeds 38400 to 38411. Cap [US$ redacted]

## Hypotheses (12 cases; the case is the unit)

- **H-LI115 (primary).** `stigwait` against `manager` on `wavesToSolve` (lockstep waves until zero failing checks on the strict
  check; manager plan waves count, because they are wall-clock steps; an unsolved case is worst).
- **H-LI116.** `stigwait` against `manager` on `final` (failing checks after the last wave).
- **H-LI117.** `stigwait` against `manager` on `holdoutFailing` (fresh inputs).
- **H-LI118.** `stigwait` against `manager` on `tokens` (output tokens per case).

Rule (as `verdict.mjs`): supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more
cases; otherwise inconclusive. Holm across H-LI116 to H-LI118.

**Reported without a verdict:** `actRounds` per arm (the LI35 measure, plan waves excluded); failing checks per wave for each arm
(does the manager reach zero by act round 12 at this size?); truncated plans and member replies per arm; plan output tokens.

## Gates, run before this registration (free)

- **G1, token probe (bench, 2026-11-20, `results/li38/G1-PROBE.md`).** The design drafted for 240 modules
  (and its 200-module fallback) cannot be built: `makeInstance` (`observatory/batch2/rc/code.mjs`) has 1,248 function names and
  81 record names, and LI36's density at k240 needs 1,440 and 160 (at k200, 136 records). Extending the pools would be an
  instrument change; instead the study runs at **k160 with 80 symmetric edges**, which fits the pools (960 function names, 80
  records) and needs no change. At k240 the projected manager plan did not fit 96,000 or reliably 128,000 output tokens. LI36's
  69 plans at k120 had output mean 18,306 and maximum 75,495 tokens (thinking included); scaled by 160/120 none would exceed
  128,000 (about 1 or 2 of 69 would exceed 96,000), hence the 128,000 limit. Haiku 5.5's output limit is 128,000 (API answer).
  Thinking stays on: turning it off would change LI36's manager.
- **G2, cost.** The bench estimated two arms at k240 at [US$ redacted] to 14 with the long-context price band. Scaling by size gives
  roughly [US$ redacted] to 9 at k160 (an estimate, not a count). `solo` (one agent with everything), drafted as a capacity reference, is
  dropped by the G2 rule: at k240 the bench estimated it at [US$ redacted] to 37 alone, and most of its replies would be cut at 128,000.
  The bench checks the study cap before every wave (`cfg.studyCapUsd`); if its token-counted reserve before wave 1 projects more
  than [US$ redacted] the study runs with 10 cases (seeds 38400 to 38409) and this page records it before the run.

## What the result decides

- **H-LI115 supported and H-LI116 inconclusive (manager catches up):** the `stigwait` cell is recorded as "faster and cheaper,
  final quality not separated" (L1 on latency, Haiku). An inconclusive H-LI116 is not evidence of equal quality; it is recorded
  as no difference detected in 12 cases. No further paid study seeks a final-quality gap at these sizes; the next step is the
  second family (LI39, Colony, same primary).
- **H-LI115 supported and H-LI116 refuted (the manager ends with fewer failing checks):** recorded as "`stigwait` faster, the
  manager better at the end", a trade-off rather than a tie; LI39 then registers final failing checks as a secondary as well,
  so the second family tests the end state too.
- **H-LI116 supported (the manager does not reach zero in 12 act rounds and `stigwait` does):** first L3 candidate (a strong
  manager, a size where the baseline does not solve everything); LI39 at this size.
- **H-LI115 refuted or inconclusive:** the LI36 trajectories do not replicate; the cell is recorded as "tokens, not quality or
  speed".

## Limits (known at registration)

One model family; synthetic coupled code tasks; 12 cases; 160 modules is below the size first intended, and symmetric density
(0.5 per module) is lower than LI36's (0.67), because of the name pools; no one-agent reference in this study; the manager's plan
waves make `wavesToSolve` partly a measure of protocol design (a plan wave is a real wall-clock step, which is why it counts, but
`actRounds` is reported beside it); the plan output limit differs from LI36 (128,000 against 96,000).
