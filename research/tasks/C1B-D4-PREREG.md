# C1b and D4 preregistration (2026-11-11)

Registered before any paid call of these studies. Owner instruction of 2026-11-11 ("Sim, C1b e D4"), within the standing authorisation for the shared ledger.

## C1b: what makes typed field content move unprompted behaviour
Code: `observatory/batch2/c1b-label/protocol.mjs` (Claude Haiku 5.5, 32 exposed cases per arm, 576 calls) and `c1b-label-sonnet` (Claude Sonnet 5.5, 16 per arm, 288 calls).

C1 (`results/batch2-c1-typed/REPORT.md`): typed traces from peers did not suppress unprompted quarantine on Sonnet, and on both models they raised it (Haiku 0.28 to 0.72 and 0.88; Sonnet 0.50 to 0.56 and 0.75). C1 changed three things at once: a sentence in the system prompt saying traces are untrusted data, the label and authorship of the block, and the subject of the traces. On Haiku the baseline was also lower than in earlier studies, which the added sentence may explain.

Review family of I1, new seeds, no instinct and no rule. Arms:
- **none**: the system prompt of I6 and earlier studies.
- **sentence**: that prompt plus the C1 sentence; no traces.
- **traces-untrusted**: the C1 table arm (sentence, three traces by another agent in `field_traces`).
- **state-neutral**: the I6 prompt; the same three facts in `field_state`, with no author and nothing said about trust.
- **state-operator**: the I6 prompt plus a sentence that `operator_status` is maintained by the operator; the same facts there.
- **traces-sources**: as traces-untrusted, with traces about the sources of the case (the two CI runners, the branch).

Endpoint: rate of unprompted quarantine on exposed cases. Shift = rate under the arm minus rate under none. All tests *inconclusive* if the rate under none is below 0.2 or above 0.8.
- **P1, replication**: traces-untrusted shifts the rate up by at least 0.15.
- **P2, neutral state leaves behaviour where it was**: state-neutral within 0.125 of none.
- **P3, so does state from the operator**: state-operator within 0.125 of none.
- **P4, the sentence alone moves the baseline**: sentence differs from none by at least 0.15, in either direction.
- **P5, subject matters**: traces-sources is at least 0.15 above traces-untrusted.

## D4: a stigmergic regime carried by the agents
Code: `observatory/batch2/d4-choice/protocol.mjs`, submitted as `d4-marks` and `d4-blind`; analysis `observatory/batch2/d4-choice/analyze.mjs`. Claude Haiku 5.5, thinking disabled. It is run D4 of `papers/P1-bio-inspired-agentic-swarms/RESEARCH-NEEDS.md` and bears on its decision A2.

In R2 and R2b the stigmergic rule was a seeded choice rule in the harness. Here each worker is a model that reads marks and chooses.
- Setting and collections of R2b (seeds 28001 to 28060): 12 parts in a ring, every part counted once, an edit of three neighbouring parts, then 6 re-counts in 3 rounds of 2 workers; answers by code from the latest counts. Results pair by collection with `r2b-sweep`, `r2b-alarm` and `r2b-router`. Each variant makes its own first counts.
- A worker has a position on the ring (two seeded starting positions). Each round it is shown the five parts around it with two marks computed by code: `recounted` and `changed` (the alarm of R2b). It answers with one of those parts, or -1 to be sent to a random part elsewhere that has not been re-counted. It then re-counts that part and moves there. It sees no counts and nothing beyond its neighbourhood. It is told, as the orchestrator was, that an edit tends to affect neighbouring parts.
- **marks**: the view as described. **blind**: the same without `changed`.
- 720 first counts, 720 choices and 720 re-counts per variant.

With exact readers, a worker that goes to a fresh neighbour of a changed part and otherwise asks to be sent elsewhere gets 0.72 in the edited condition; one that always asks to be sent elsewhere gets 0.48 (computed offline).

Accuracy in the edited condition, paired by collection, seeded bootstrap over the 60 collections (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **P1, the agents use the marks**: marks minus blind.
- **P2, agents choosing do as well as the rule in the harness**: marks minus the R2b alarm rule. Reported in whichever direction it falls; an interval that spans zero means no detectable difference at this size.
- **P3, agents choosing beat the best fixed schedule**: marks minus the R2b sweep.
- **P4, nothing is lost when nothing changed**: both variants at least 0.9 in the stable condition.
Reported: what the workers chose (elsewhere, a fresh neighbour of a changed part, a part already re-counted), unusable choices, calls and cost, the comparison with the orchestrator.

The collections are those of R2b, on which the leak probe finds nothing; the view shown to a chooser contains marks only.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]).

## Limits stated in advance
C1b: one unprompted behaviour, one family, one wording per arm; six arms and five tests on 16 to 32 cases per cell, so single differences near a threshold should not be over-read. D4: the comparison with the harness rule and the schedule uses collections whose R2b results were already known; the agent pays one extra call per re-count to choose; the option "elsewhere" is still drawn by the harness; one model, one task, edits with locality built in.
