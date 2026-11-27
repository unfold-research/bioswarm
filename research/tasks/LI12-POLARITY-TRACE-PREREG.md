# LI12 preregistration: polarity, the trace, and who writes it, under strict feedback (2026-11-17)

**Status:** registered 2026-11-17 by the research lead after LI10 and LI11 and their independent reviews (`docs/reviews/LI10-REVIEW-2026-11-17.md`, `docs/reviews/LI11-REVIEW-2026-11-17.md`), before any LI12 result. Claude **Haiku 5.5** (default adaptive thinking), Message Batches API, shared ledger (cap [US$ redacted]). Domain `observatory/batch2/rc/code.mjs`, runner `run-rc3.mjs`, configs `li12-k40.json` (study cap [US$ redacted]) and `li12-k80.json` ([US$ redacted]), analysis `analyze-rc.mjs` per size and `analyze-li12.mjs` for the verdicts. Instances of LI7 to LI11 verified unchanged.

## What changed after the reviews

1. **One check for feedback, stopping and scoring.** `check(inst, code, { strict: true })` (config `strictFeedback`): a directed check also fails when the helper itself does not meet the caller's requirement. The failure text says so without revealing what the helper must return (only the caller's team has that). Every arm sees the defect it is scored on; a caller that works around a helper does not resolve the check.
2. **No upper-case blind spot.** The helper is judged up to what the specified combination can observe (a helper that already upper-cases, under a caller that upper-cases, passes). Re-scoring LI11 with this check gives pheromone 16, manager 13, routed 7, threshold 1.
3. **The three things LI11's pheromone arm bundled are separated:** polarity (only the helper owner may change code for a directed edge), the trace (the requirement written on the check), and who writes it (the harness, or the caller's agent).

## Arms (one Haiku member per module; symmetric edges: one side by hash, as in `routed`, in every arm except `manager`)

| Arm | Directed failing edge | Requirement reaches the helper owner by |
|---|---|---|
| `routed` (LI7 to LI11) | both sides act | messages from the caller (at most 3, 40 words) |
| `manager` (market: hierarchy) | whom the manager assigns | the manager's instruction (it reads every specification) |
| `polarity` (bio: polarity only) | helper owner only | nothing: only the failing check |
| `oracle` (= LI11 `pheromone`) | helper owner only | a trace the harness writes on the check (the requirement verbatim): the upper reference |
| `stig` (**bio: agent-written stigmergy**) | helper owner acts; the caller is woken in **trace mode** (it may not change code for that check) and writes a trace of at most 40 words on the check | the caller's own trace, persistent on the check, shown to the helper owner from the next wave |

Cases: 8 per size, seeds 12400 to 12407 (k = 40) and 12800 to 12807 (k = 80); k directed and 3k/4 symmetric edges; 8 tests per check; shared round 0; 8 act rounds (the manager alternates plan and act). k = 40 runs before k = 80.

## Hypotheses (16 cases pooled; solved = strict live check passes)

- **H-LI36 (polarity alone).** `polarity` solves at least 4 more cases than `routed` and ends lower in more cases (sign test p < 0.05). Refuted if it solves no more than `routed`.
- **H-LI37 (agent-written stigmergy against hierarchy).** `stig` solves at least as many cases as `manager` and ends lower in more cases (sign test p < 0.05). Refuted if `manager` ends lower in more cases. Otherwise inconclusive.
- **H-LI38 (the trace matters).** `stig` solves at least 3 more cases than `polarity`. Refuted if it solves no more.
- **H-LI39 (agents write good enough traces).** `stig` solves at least `oracle` minus 2.
- **H-LI40 (cost).** `stig` uses fewer output tokens per solved case than `manager`.

Secondary: act rounds to solve (manager plan waves not counted); traces written; failing checks by kind; oscillation; hold-out with `holdout.mjs <dir> <config> --strict`; messages; manager truncations.

## Stopping and disclosure

The runner stops before a wave whose reserve would pass the study cap; no retries of uncertain submissions; an independent review (code and data only) before the report; every deviation written in the report.
