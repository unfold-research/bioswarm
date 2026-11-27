# R2 partial coverage: the alarm rule beats the fixed schedule; the orchestrator's result is confounded by a flaw in the collection

Preregistration `tasks/R2-PARTIAL-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled, as four studies (`r2-sweep`, `r2-random`, `r2-alarm`, `r2-router`); 6,060 requests, all succeeded. Usage estimate [US$ redacted] Cross-regime analysis: `node observatory/batch2/r2-regimes/analyze.mjs` → `summary.json` here.

## Result

Sixty collections of 12 parts; 6 reads after the edit for 12 parts.

| Regime | Correct, stable | Correct, edited | Edited parts re-read (of 3) | US$ |
|---|---|---|---|---|
| sweep (best fixed schedule) | 60 of 60 | 32 of 60 (0.53) | 1.65 | [redacted] |
| random | 60 of 60 | 25 of 60 (0.42) | 1.22 | [redacted] |
| alarm (recruitment to neighbours) | 60 of 60 | 43 of 60 (0.72) | 1.85 | [redacted] |
| router (orchestrator model) | 60 of 60 | 60 of 60 (1.00) | 2.98 | [redacted] |

Counts were exactly right in 0.99 of reads; no false alarm in the stable condition in any regime.

| Test, edited condition | Verdict |
|---|---|
| P1 (E7) a stigmergic rule with a signal beats the best fixed schedule | **supported**: +0.18, interval 0.03 to 0.33 |
| P2 the signal is what does it (alarm against random) | **supported**: +0.30, interval 0.13 to 0.47 |
| P3 an orchestrator with the same information beats the local rule | **supported as registered, but confounded: see below** (+0.28, interval 0.17 to 0.40) |
| P4 alarms do no harm when nothing changed | **supported** |

## The flaw

The orchestrator was right on every collection and re-read almost all three edited parts with six reads. It could not have done that from alarms alone: before any re-read there is nothing on the board to say where the edit is.

It did not need alarms. In this collection the edit is made by exchanging leader and runner-up in a block, and for the exchange to reverse the answer the generator put the leader's largest counts (3 per part) exactly in the block that would be edited. The first counts therefore show where the edit will be. The orchestrator's first-round working says it probes "the parts with high counts for the leading author", and 88 of its 120 first-round picks fell inside the edited block, where chance gives 30.

Sending the first analysts to the parts the answer depends on most is a sensible policy and worth a test of its own. Here it coincides with the location of the edit by construction, so the 1.00 does not show that a central orchestrator uses alarms better than a local rule. P3 is not established by this run.

P1 and P2 are not affected: the sweep, random and alarm rules do not look at the first counts.

## Reading of what stands

- With a budget that covers half the field and edits that come in neighbouring parts, a local recruitment rule (go where a neighbour raised an alarm) beat the best fixed schedule, 0.72 against 0.53, and the signal accounts for it (0.42 without). The run matched the figures the schedules give with perfect readers (0.70, 0.52, 0.40). This is the first support on real readers for claim E7 of the P1 paper, within the scope below.
- After an alarm the orchestrator sent an analyst to a fresh neighbour in 113 of 116 rounds: given the signal and the prior in words, it does what the rule does.

## Limits

- The advantage of the alarm rule comes from locality that we built into the edit. It says nothing about scattered edits.
- The rule is a seeded choice rule in the harness; the models read and deposit.
- The orchestrator result is confounded as described. A rerun with an edit that cannot be located from the first counts is registered as R2b.
- One task, one model, sixty collections.
