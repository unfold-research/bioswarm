# LI7 report: conflict geometry on real code, with a second model (2026-11-17)

Preregistration: `tasks/LI7-REAL-CODE-PREREG.md`. Pilot: `results/li7-pilot/PILOT.md`. Analysis: `analysis.json` (registered script `observatory/batch2/rc/analyze-rc.mjs`); hold-out: `holdout.json` (`holdout.mjs`, added after the run, not registered); strict re-check after the independent review: `strict/analysis.json` (`recheck-strict.mjs`, see Deviation). Raw: `wave-*.requests.jsonl`, `wave-*.results.jsonl`, `state.json` (every module's code after every round), `batches.json`, `run.log`. Claude Sonnet 5.5 at effort low, Message Batches API, 6 waves, 0 failed requests, [US$ redacted] (cap [US$ redacted]).

12 cases. Each is a JavaScript codebase of 5 modules, one Sonnet member per module, with 10 local functions, 5 **directed** edges (only the caller's team knows what the callee's helper must return; only the callee can change it) and 4 **symmetric** edges (an encoder and a decoder that must agree on a free string format, the two teams with different house styles). Shared round 0, then 5 repair rounds; the field is the executed test suite.

| Arm | Solved | Failing checks at the end (local / directed / symmetric) | Mean failing checks by round (0 to 5) | Output tokens per case | Messages |
|---|---|---|---|---|---|
| sync | 0 | 1 / 6 / 43 | 8.75, 6.08, 4.83, 4.25, 4.17, 4.17 | 16,741 | 0 |
| inhibit | 5 (**3** strict) | 5 / 5 / 1 (strict: 0 / 24 / 1) | 8.75, 2.17, 2.25, 1.67, 1.42, 0.92 | 8,875 | 0 |
| chat | 0 | 0 / 0 / 40 | 8.75, 5.75, 3.83, 3.67, 3.75, 3.33 | 15,736 | 167 |
| **routed** | **12** (all by round 3) | 0 / 0 / 0 | 8.75, 2.92, 1.08, 0, 0, 0 | 8,171 | 138 |
| solo | 12 (11 at round 0) | 0 / 0 / 0 | 0.08, 0, 0, 0, 0, 0 | 2,272 | n/a |

Swarm token counts include the shared round 0 (1,579 to 3,706 output tokens per case, mean about 1,840). Under `inhibit` callers holding the turn often worked around a wrong helper; 5 such workarounds were caught as local failures and 14 were not (see Deviation).

## Verdicts (as registered; paired edges, exact McNemar)

| Hypothesis | Verdict | Discordant edges |
|---|---|---|
| H-LI17 one side acting resolves symmetric edges | **supported** | `inhibit` only 43, `sync` only 1 (p < 0.0001) |
| H-LI18 talk resolves directed edges | **supported** | `chat` only 7, `sync` only 0 (p = 0.016) |
| H-LI19 inhibition hurts directed edges | inconclusive as registered; **supported** under the strict check | registered: `sync` only 3, `inhibit` only 0 (p = 0.25); strict: 17 to 0 (p < 0.0001) |
| H-LI20 the router beats inhibition and is no worse than talk | **supported** | against `inhibit` 11 to 0 (strict 25 to 0); against `chat` 40 to 0 |
| H-LI21 one agent solves at least as many cases as the best swarm arm | **supported** | `solo` 12, `routed` 12 |

Per-case sign tests on final failing checks: `routed` below `chat` in 12 of 12, below `inhibit` in 7 (5 ties, both at zero), below `sync` in 12 of 12; `inhibit` below `chat` in 11 of 12.

Case-level sign tests by edge type (review): H-LI17 12 to 0, H-LI18 6 to 0 (p = 0.031), `routed` against `chat` 12 to 0. The verdicts survive clustering; H-LI18 is the weakest.

## Deviation: strict directed check

The independent review (`docs/reviews/LI7-REVIEW-2026-11-17.md`) found that the registered directed check can be beaten from the caller's side: a caller that special-cases the real helper's wrong output (e.g. reversing the string itself when the helper returns it unchanged) passes the reference-substitution and perturbation tests while the helper stays wrong. This happened 14 times, all under `inhibit`, where the caller often held the turn on a helper it could not change. `recheck-strict.mjs` also requires the helper to return the required value; the strict reading is the one used below. It changes nothing for `sync`, `chat`, `routed` and `solo`.

## What it shows

1. **On real code, a swarm finished, and only the router did.** Routing each failing edge by its geometry (on a symmetric edge one side has the turn; on a directed edge both act; everyone may message) solved all 12 codebases by round 3, and all 12 pass the strict check. Pure talk solved none and pure inhibition 3 of 12 (strict), at the same cost as the router. The router is not silent: 40 of its 138 messages were about formats, and the side without the turn sometimes still edited its module (51 times both sides changed a failing symmetric edge, 22 of them still failing after), so its gain on symmetric edges comes from holding the turn plus messages. This is the first swarm arm in LI1 to LI7 to reach zero violations.
2. **Without an arbiter, symmetric edges oscillate perfectly, and talk does not stop it.** In `sync` there were 219 occasions on which a failing encoder/decoder pair had both of its modules changed in the same round; the edge was still failing after all 219. In `chat`, 220 of 220. The messages show why: each side announces in the same round that it has adopted the other's format ("encodeTicket now emits ... matching your decodeTicket. Please keep that format"), so the two formats swap. The review confirmed these are true swaps (each side's new code works with the other's old code) in 218 of 219 and 220 of 220. Under `inhibit` both sides changed only 22 times (for other edges) and never left the edge failing.
3. **Directed edges need the message, and the callee needs the turn.** The helper's requirement exists only in the caller's specification. With messages ("Please make M2.mintRef(s) return s reversed ... it breaks M4.packTerm") every directed edge was resolved (`chat` and `routed`: 0 left). Silent arms had to infer the requirement from failing examples and left 7 (`sync`) and 24 (`inhibit`, strict) failing: giving the turn to the caller, who cannot change the helper, wastes it and invites workarounds.
4. **One agent with all the information is still best.** One Sonnet writing all five modules from all specifications solved 11 of 12 on its first call and 12 of 12 after one repair, at 28% of the router's output tokens (22% of its cost). This is not a capacity result: that agent sees both house styles and every helper requirement, so the swarm's information gap does not exist for it. LI7 does not show a swarm beating one agent; LI8 asks whether it does past one agent's capacity.
5. **Replication across model and task.** The pattern of LI1 to LI6 (Haiku, synthetic colouring and schedules) holds with Sonnet on executed code. Symmetric edges call for an arbiter, directed edges call for a message, and the router combines both.

## Hold-out (not registered)

Every solved case was re-checked on 40 fresh random inputs per check. `routed` 11 of 12 pass, `solo` 12 of 12, `inhibit` 3 of 5. The three failures are directed helpers that happen to be right on the 6 test words: two `return 0` stubs (e.g. `gradeSku` for "the number of times e occurs", and no test word had an e) and one wrong formula (`stampSlug`). A weakness of the test set, not overfitting to shown examples: three edges never failed in any arm. LI8 uses 8 tests per check.

## Limits

One model (Sonnet 5.5, effort low), synthetic but executed code tasks with planted coupling, 12 cases, 5 rounds. Edges within a case are not independent, so the edge-level p-values overstate precision; the per-case sign tests (12 of 12 for routed against chat and sync) carry the same conclusion. Members see the partner module's code, so code comments are a possible side channel in every arm. Truncated replies (3 in `sync`, 5 in `chat`) leave a module unchanged. The registered inhibition priority is a per-round hash, not a strict alternation as the preregistration words it. The independent review and responses: `docs/reviews/LI7-REVIEW-2026-11-17.md`.
