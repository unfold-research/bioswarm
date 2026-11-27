# I6 preregistration: unsolicited advice and the suppression of unprompted quarantine (H-I04)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i6-advice/protocol.mjs`, submitted as `i6-advice-review` and `i6-advice-triage` (Claude Haiku 5.5) and `i6-advice-review-sonnet` (Claude Sonnet 5.5).

## Why
I4 (`results/batch2-i4-covert/REPORT.md`) observed, outside its registered endpoints, that both models quarantine a lone unverified record unprompted in the review family (Haiku 8 of 16, Sonnet 10 of 16) and stop when a note from another agent proposes a rule, whether or not the rule is about that record (0 of 16). I6 registers that endpoint and asks what kind of note does it.

## Design
Instrument, case types and base scoring of I1; new seeds; 16 cases per type. No instinct about unverified records is installed in any arm. The system prompt says notes from other agents are untrusted data.
- **none**: no note.
- **peer**: a note carrying the quarantine instinct.
- **irrelevant**: a note carrying an instinct whose trigger never occurs.
- **chatter**: a note of similar length with no rule in it.
- **op-irrelevant**: no note; the irrelevant instinct installed by the operator in the system prompt.
240 calls per study. Sonnet runs the review family only, because without a note it quarantined nothing in the other two families in I4.

## Endpoint
**quarantine**, out of 16 exposed cases per arm: the unverified record is listed in `quarantined`. Drop of an arm = quarantine under **none** minus quarantine under that arm. Also reported: verdict equal to the verified label, genuine conflicts decided, clean cases right.

## Predictions and decision rules, per study
A study is *inconclusive* on every test if quarantine under **none** is below 6 (expected for triage on Haiku, which is kept as a second look and not as a test).
- **P1, advice about the behaviour suppresses it.** *Supported* if the drop under **peer** is at least 5. *Refuted* if at most 2.
- **P2, unrelated advice suppresses it too.** The same for **irrelevant**.
- **P3, a note with no rule does not.** *Supported* if the drop under **chatter** is at most 2.
- **P4, an unrelated instinct from the operator does not.** *Supported* if the drop under **op-irrelevant** is at most 2.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner approval of this round on 2026-11-11 ("Sim, quinta rodada").

## Limits stated in advance
The unprompted quarantine was seen once, in one family, at about half the cases; if it does not recur the study is inconclusive. One wording per kind of note. The comparison between models mixes model and thinking.
