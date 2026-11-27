# LI42 preregistration: does the LI38/LI41 result hold in a second model family? Waiting for the trace against a manager at 160 modules, gpt-6-luna (2026-11-23)

> Approved by the Research Leader 2026-11-23 with the pilot floor rule added; caps approved by the owner the same day. Goes to
> `main` as `tasks/LI42-SECOND-FAMILY-PREREG.md` with the spec `observatory/batch2/rc/sweeps/LI42.json`, before the pilot. Model,
> prices, batch access, effort parameter and adapter date are from the bench (2026-11-23, gateway `/model/info`, read only);
> the ledger balance and the LI38 prompt sizes were checked by Coordination on benchhost the same day.

**Status:** registered 2026-11-23, before the adapter, the dry run and the pilot; after LI38, LI39 and LI41 reports and reviews were seen (disclosed). Owner chose OpenAI as
the second family (2026-11-23, via the Research Leader). Model **gpt-6-luna** through the LiteLLM gateway, OpenAI batch API
(`/v1/batches`, `/v1/files`), strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` on the
research bench (benchhost) with a new provider adapter. Verdicts: `observatory/batch2/rc/verdict.mjs`. Review and reproduction
check: Claude Sonnet 5.5 (outside the tested family).

**Why.** `docs/CONVENTIONS.md` rule 5: no claim of transfer across models without a second model family. LI38 (12 of 12,
p = 0.0005) and its replication LI41 on fresh seeds (12 of 12, p = 0.00049; tokens 11 to 1) show, on Haiku 5.5 in the batch
instrument, that `stigwait` reaches zero failing checks in fewer waves than a manager and spends fewer output tokens, with
final quality not separated. That closes the replication half. LI42 is the second-family half: the same instrument and
protocol with a model outside the Claude family. LI39 used gpt-6-luna in the Colony and was inconclusive (7 to 3), but the
Colony mixes the mechanism with its environment; it is not this test.

**Design.** Identical to LI41 (`tasks/LI41-REPLICATION-PREREG.md`, `sweeps/LI41.json`) except model, effort, seeds, cap and
reviewer: 160 modules, 320 directed and 80 symmetric edges, 16 test inputs per check; 12 act rounds per arm, `managerSlack`
on, member output up to 8,000 tokens, plan output up to 128,000, strict feedback.

**Controlled deviations (declared, not tested):**
- **Model:** gpt-6-luna. The gateway exposes no dated snapshot. The runner logs the `model` string returned by every
  request. If more than one string appears in the run, the report says so first, verdicts are still computed, and the cell
  cannot move beyond `preliminary-*` on this run.
- **Effort:** `reasoning_effort: "medium"`, fixed for every request of both arms. Haiku ran at its default (thinking on);
  the two effort scales are not the same, so reasoning tokens are not compared across families.
- **Tokens metric:** H-LI130 counts output tokens including reasoning tokens, as the provider reports them. Only the
  within-family comparison (`stigwait` against `manager`, same model) is tested.
- **Recorded in the export:** every request's returned `model` string and the `reasoning_effort` sent, per request, in the
  run's export, so the version and effort can be checked from the data.
- **Transport, plan B:** OpenAI batch through the gateway (`/v1/batches`, `/v1/files`). The GETs answer 200 but no batch has
  been created yet; the first real test is the adapter's dry run. If batch fails there or in the pilot, the run uses
  synchronous calls on the flex tier at the same price, with the same prompts, limits, effort and waves (each wave still waits
  for all its replies). The transport is fixed before the study's first wave and recorded in the report; it does not change
  mid-run. A switch after the study started counts as a failure of the run, not as plan B.
  **Amended 2026-11-23 (Amendment 1 below): the pilot from its wave 1 and the whole study use flex, for speed.**
  **Amended 2026-11-23 (Amendment 2 below): pilot wave 0 = requests completed on batch + the remainder on flex.**
  **Amended 2026-11-23 (Amendment 3 below): transport-class errors inside a batch count as batch failure per request; pilot wave 1 redone.**

**Comparison with Haiku (LI38, LI41): direction only.** The cross-family question is whether the sign of each effect is the
same. Absolute values (waves, failing checks, tokens, cost) are not compared between families and no test pools them.

**Arms.** `stigwait`, `manager`. 12 new cases, seeds **42400 to 42411** (no other sweep uses 424xx).

## Hypotheses (12 cases; the case is the unit)

- **H-LI127 (primary).** `stigwait` against `manager` on `wavesToSolve` (manager plan waves count; an unsolved case is worst).
- **H-LI128.** `stigwait` against `manager` on `final`.
- **H-LI129.** `stigwait` against `manager` on `holdoutFailing`.
- **H-LI130.** `stigwait` against `manager` on `tokens` (output tokens per case, reasoning included).

Rule (as `verdict.mjs`): supported if the first arm is better in more cases with p < 0.05 (exact sign test; with 12 cases that
means at least 10 to 2; 9 to 3 gives p = 0.146 and is inconclusive, not a partial transfer); refuted if the second arm is better
in more cases; otherwise inconclusive. Holm across H-LI128 to H-LI130. These are LI41's hypotheses with the model changed.

**Reported without a verdict:** `actRounds` per arm; failing checks per wave; truncated plans and member replies; plan output
tokens; reasoning tokens per arm; LI38, LI41 and LI42 side by side (descriptive, no pooled test across families).

## Pilot (before the study; data excluded from all verdicts)

Fake-model dry run first (free), then a paid pilot on seed **42390**, both arms, full 12 rounds. It checks: the batch path
through the gateway end to end, the returned `model` string, that `reasoning_effort` is applied, that the 128,000 plan output
limit is accepted, structured output parsing, and the cost per case. Stop rules, decided now:
- Projected study cost (start wave + 12 × pilot cost per case for both arms) above the study cap: no study; the bench reports
  the number to the Research Leader, and a study needs a new owner decision.
  **Clarified 2026-11-23 (Clarification of rule (a) below): the projection uses only the pilot waves actually applied.**
- Any limit the model refuses (output limit, effort value, batch path): no study; any change goes back to this preregistration
  as an amendment before the study, reviewed by the Leader.
- Floor (added at the Research Leader's approval, 2026-11-23): if neither arm solves the pilot case (seed 42390) within the
  12 rounds, no study before the Research Leader reviews the pilot. The risk is a floor effect: 12 ties and nothing measured.
- The pilot outcome (who won, when at least one arm solves) does not change the design or the number of cases.

## Gates (free, run before this draft)

- **G1, cost.** Bench (2026-11-23): batch price [US$ redacted] in / 0.25 out per Mtok, the same as Haiku 5.5 batch (source: the
  gateway's model table, not an invoice). LI38 volume (38.7 M in, 13.1 M out) gives [US$ redacted]; with 1.5–2× for another
  tokenizer and more reasoning, **[US$ redacted]**. Long-context band on gpt-6-luna starts above 272,000 tokens; the largest
  LI38 prompt was 167,788 tokens (manager plan, seed 38409; 68 prompts above 100,000, none above 200,000; checked from LI38 raw
  data on benchhost), so the band would need a tokenizer about 1.6× larger to apply. LI38/LI41's [US$ redacted] Haiku long-context extra
  is not expected here. Pilot: [US$ redacted]
- **G2, budget.** Shared ledger on benchhost, 2026-11-23: [US$ redacted] of [US$ redacted] committed, **[US$ redacted] free**, no open commitments.
  Other programmes draw on the same balance.
- **G3, existing data.** No raw data answers the question: no batch study has run a non-Claude model.
- **Reviewer family.** Tested model is OpenAI, so review and reproduction check go to Claude Sonnet 5.5.

**Caps (approved by the owner, 2026-11-23, via the Research Leader):** pilot **[US$ redacted]**, study **[US$ redacted]**, review and
reproduction check **[US$ redacted]** (Claude Sonnet 5.5, estimated ≤ [US$ redacted]; LI39's review cost 0.52). Total ceiling **[US$ redacted]**. Pilot
and study caps are separate because the study's upper estimate alone is 10.4 and the runner's cap check reserves 1.5× the
wave's ratio ahead (LI41 peaked at 8.23 against 10).
**Amended 2026-11-23 (Amendment 4 below, owner): pilot [US$ redacted] study [US$ redacted] review [US$ redacted]; total still [US$ redacted]**
- **Cap stop.** As LI41: if the runner's cap check stops a wave, the run is incomplete, no verdicts, no cases cut; a resume
  with a higher cap needs the owner's approval through the Research Leader.

## Economy (FRENTES rule 6)

- **Effort:** `medium`, explicit (see deviations). Not lowered to save money: a lower effort would change both arms and make the
  test about effort, which belongs to Autonomy (AU).
- **Cost per probe (LI38/LI41 on Haiku, for reference):** start wave [US$ redacted]; `stigwait` about [US$ redacted] and `manager` about
  [US$ redacted] per solved case. LI42's own numbers come from the pilot.
- **Prompts above 100,000 tokens:** manager plan prompts at this size (whole 160-module state); unavoidable for the manager arm.

## What the result decides

- **H-LI127 supported:** the latency result holds in a second family in the batch instrument. With LI38 and LI41 this meets
  both halves of rule 5 for the cell "`stigwait` faster and cheaper than a manager at 160 modules, final quality not separated",
  which can move beyond `preliminary-*` (Haiku 5.5 and gpt-6-luna, batch instrument, synthetic coupled code tasks only).
- **H-LI127 inconclusive:** no transfer shown; the cell stays Haiku-only and preliminary on transfer. No rerun is sought on the
  same family without a new reason.
- **H-LI127 refuted (manager faster):** the result is family-dependent; recorded as such in FINDINGS beside LI38/LI41.
- **H-LI128 refuted:** recorded as a trade-off in this family (`stigwait` faster, manager better at the end). Inconclusive is
  not equal quality.
- **H-LI130:** supported extends the token result to this family; refuted is reported as a contradiction of LI38/LI41.

## Scope and limits (known now)

Two families only (Claude Haiku 5.5 and OpenAI gpt-6-luna), one model each; effort scales differ; undated model snapshot;
synthetic coupled code tasks; 12 cases; the limits of LI38 (density, no one-agent reference, plan waves inside
`wavesToSolve`). LI38 and LI41 outcomes are known; the hypotheses are theirs, unchanged, and nothing in the design was chosen
from their per-case data.

## Amendment 1 (2026-11-23, transport; approved by the Research Leader at the owner's request)

Registered during the pilot, before the study's first wave, with no study data seen.

- **Change:** the pilot's wave 0 finishes on batch. From the pilot's wave 1 onward, and for the whole study, the transport is
  synchronous flex (`/v1/chat/completions`, `service_tier: flex`) through the same LiteLLM gateway: same model, same
  `reasoning_effort: "medium"`, same prompts, limits, waves (each wave still waits for all its replies) and price per Mtok.
- **Reason:** speed, not a batch failure. Batch worked but took about 2 h per wave (pilot wave 0 at 135 of 160 requests after
  2 h), which would push the study into the next week; the owner wants LI42 run now. The decision used no pilot outcome
  and no study data.
- **Unchanged:** the transport is fixed in the study's transport plan before its wave 1 and never switched mid-run (a switch
  counts as a failure of the run); returned `model` string and `reasoning_effort` recorded per request; caps 1 + 11 + 2;
  seeds; hypotheses and rules; the pilot floor rule and the other stop rules.
- **Flex failing:** if flex fails persistently in the pilot, the bench goes back to the Research Leader before the study;
  the study does not fall back to batch on its own.
- **Report:** states this amendment, and that the pilot mixed the two transports (wave 0 batch, later waves flex). The pilot
  is excluded from all verdicts, so the mix does not touch them.

## Amendment 2 (2026-11-23, pilot wave 0 transport; approved by the Research Leader under the owner's standing urgency)

Registered during the pilot's wave 0, before the pilot's wave 1 and the study's first wave, with no study data seen.

- **Change:** the pilot's wave 0 (160 requests, submitted on batch at 12:49 UTC; 145 completed and 0 failed at 17:15 UTC) is
  made of the requests that completed on batch, whose results are kept, plus the requests that did not complete, sent on
  synchronous flex as part of the same wave 0 with the same request bodies: prompts, seeds, model,
  `reasoning_effort: "medium"`, limits and price per Mtok. The wave still waits for all its replies before wave 1. The
  transport (batch or flex) is recorded per request, and the flex remainder has its own ledger entry. No request of wave 0
  moves to wave 1 without a reply; a missing result is never recorded as a member error.
- **Path:** the bench first tests, on a throwaway batch, whether a cancel through the gateway returns the partial output file.
  If it does, the wave 0 batch is cancelled and the remainder goes on flex at once. If it does not, the batch is left to end on
  its own (OpenAI's 24 h window, about 12:49 UTC on 24/11), and the remainder of the completed or expired batch goes on flex
  the same way. Either path gives the same wave 0 composition rule.
- **Reason:** speed. The batch sat at 145 of 160 for hours, and the owner wants LI42 run now. The decision used progress
  counts only: no response content, no pilot outcome and no study data.
- **Stop rules:** a cancellation or an expiry with results returned is not a refusal or failure of the batch path, so it does
  not trigger the pilot's limit rule. The cost projection uses the wave's real cost (batch results plus the flex remainder,
  same price per Mtok). If the completed batch results cannot be retrieved, the bench does not resend the whole wave on its
  own; it goes back to the Research Leader first, because a full resend adds cost against the pilot cap.
- **Unchanged:** pilot cap [US$ redacted] and caps 1 + 11 + 2; returned `model` string and `reasoning_effort` recorded per request;
  seeds; hypotheses and rules; the pilot floor rule and the other stop rules; Amendment 1 (pilot wave 1 onward and the whole
  study on flex, fixed before the study's wave 1, no switch within the study).
- **Report:** states this amendment, the path taken (cancel or expiry), and that the pilot's wave 0 mixed both transports
  (per request). The pilot is excluded from all verdicts, so the mix does not touch them.

## Amendment 3 (2026-11-23, transport errors and pilot wave 1; approved by the Research Leader)

Registered after the pilot stopped at 18:47 UTC, before any resend, with no response content read and no study data seen.

- **What happened:** the wave 0 batch was cancelled at 18:33 UTC under Amendment 2 with 145 requests completed. The 15 others
  came back in the batch error file as OpenAI HTTP 500 errors ("The server had an error while processing your request"),
  although the batch `request_counts` showed 0 failed. The runner treated them as replies with an error, closed wave 0 with 15
  member errors and started the pilot's wave 1 on flex. The bench stopped it at 108 of 140 requests sent and 86 returned;
  none was applied to the run's state and no content was read. Pilot spend at the stop: about [US$ redacted] of the [US$ redacted] cap.
- **Transport errors:** a per-request error of transport class inside a batch (HTTP 5xx, 429, timeout) counts as a batch
  failure for that request. That request is resent on synchronous flex with the same body, and its transport is recorded per
  request (the plan B of the transport section, applied per request). Other per-request errors (other 4xx, refusals) are not
  retried and follow the pilot's stop rules.
- **Pilot wave 1:** discarded and redone from the complete wave 0 state. Its 86 replies stay on disk as a recorded deviation;
  they never enter the run and their content is never read. Their cost counts against the pilot cap.
- **Invariant (pilot and study):** no wave advances unless every member has a valid reply; otherwise the run stops hard. A
  valid reply is a response delivered by the API (not a transport error). The model's own output inside a delivered response
  (for example a plan that fails parsing or checks) is data, handled by the same instrument as in LI41 (unchanged), not as a missing reply.
- **Unchanged:** pilot cap [US$ redacted] and caps 1 + 11 + 2; the study entirely on flex (Amendment 1), with no transport switch
  within it; Amendment 2's wave 0 composition; returned `model` string and `reasoning_effort` recorded per request; seeds;
  hypotheses and rules; the pilot floor rule and the other stop rules.
- **Report:** states this amendment, the 15 HTTP 500 errors and their flex resend, the discarded pilot wave 1 (requests sent,
  replies kept unread, cost), and the invariant. The pilot is excluded from all verdicts, so none of this touches them.

## Clarification of stop rule (a) (2026-11-23, pilot cost accounting; decided by the Research Leader)

Registered during the pilot, before its resume after the HTTP 524 stop, from cost accounting only, with no response content seen.

- **Pilot cap ([US$ redacted]):** counts every pilot cost: the waves applied, the discarded first wave 1 (ledger `li42-pilot-wave-1-p0`,
  [US$ redacted]) and the conservative charge for the 8 plan calls cut at HTTP 524 (ledger `li42-pilot-wave-1-p0-r2-cut524`,
  [US$ redacted] at full reserve; upstream billing unknown).
- **Rule (a) projection:** "pilot cost per case" means the cost of the pilot waves actually applied (start wave + both arms).
  The two entries above are pilot incidents, not the cost of a case, and are left out of the projection. They are the only
  entries left out, named now; nothing is added to this list later.
- **Reason:** rule (a) estimates a normal study case. The 524 cuts came from the public endpoint, which the study does not use
  (internal route, fixed before its wave 1), and the discarded wave came from a runner defect fixed under Amendment 3.
  Multiplying them by 12 would add about [US$ redacted] to the projection and could trigger a false stop above [US$ redacted]
- **Bound:** the study's own [US$ redacted] cap and its cap stop (incomplete, no verdicts) still bound any underestimate at runtime.
- **Report:** the run logs both projections (applied waves only, used by the gate; and with the incidents) and the pilot cap
  total, and the report shows all three. If the projection with incidents is above [US$ redacted] while the gate's is below, the
  report says so plainly.

## Amendment 4 (2026-11-23, caps; approved by the owner, via the Research Leader)

Registered during the pilot, before its restart after the HTTP 524 stop and before any gate outcome, from cost accounting only,
with no response content seen.

- **Change:** reallocation within the approved [US$ redacted] total. Pilot cap [US$ redacted] → **[US$ redacted]**; study cap [US$ redacted] → **[US$ redacted]**;
  review and reproduction check **[US$ redacted]**, unchanged. The spec's `pilot.cap` and the study `cap` change with this file.
- **Rule (a):** its threshold is the study cap, now [US$ redacted] The margin check (projection (B), applied waves only, used by
  the gate; projection (A), with the two named incident entries) also uses [US$ redacted]
- **Margin decision, pre-committed by the Research Leader before any gate outcome:** if (B) ≤ [US$ redacted] the study proceeds
  even when (A) > [US$ redacted] because the excess of (A) over (B) comes only from the two named incidents. If (B) > [US$ redacted] and
  (A) > [US$ redacted] final stop before the study's first wave, and the bench goes back to the Research Leader. If (B) > [US$ redacted]
  rule (a) stops the study as written.
- **Reason:** the pilot incidents (discarded wave 1, [US$ redacted]; 8 HTTP 524 cut calls at full reserve, [US$ redacted]) already use
  [US$ redacted] of the [US$ redacted] pilot cap; the bench's proof on a copy with costs calibrated to the real waves stopped the pilot on its
  cap at wave 6 of 12, with no gate. The proof's (B) projection (about [US$ redacted]) leaves room under [US$ redacted]
- **Unchanged:** total ceiling [US$ redacted]; the pilot cap counts every pilot cost (clarification of rule (a)); cap stop as before
  (incomplete, no verdicts, no cases cut); Amendments 1–3, seeds, hypotheses, the pilot floor rule and the other stop rules.
  Earlier mentions of "1 + 11 + 2" and of [US$ redacted] in this file read as 1.5 + 10.5 + 2 and [US$ redacted] from now on.
- **Report:** states this amendment, both projections, the pilot cap total and which branch of the margin decision applied.

Spec: `observatory/batch2/rc/sweeps/LI42.json`, registered with this file. The `provider` and `pilot` field names follow the
bench's adapter, which may rename them in its own PR without changing any value; any change of value is an amendment.
