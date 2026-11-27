# I1 preregistration: instinct transplant across task families (H-I01, H-I02, H-I04)

Registered 2026-11-11, before any paid call. Code: `observatory/batch2/i1-transplant/protocol.mjs`, submitted as three studies (`i1-transplant-triage`, `-research`, `-review`) through `observatory/batch2/run.mjs`; combined analysis in `observatory/batch2/i1-transplant/analyze.mjs`. Not frozen yet: the runner refuses to freeze while earlier batches hold open reservations. The commit that adds this file fixes the design; the frozen hashes will be recorded before submission.

## Question
Does an instinct, a trigger-and-action rule that fires without deliberation, keep its effect when it is installed unchanged in agents doing a different kind of work? And does it enter only through the operator, not from a peer?

## The instinct
`quarantine-lone-unverified`: when exactly one unverified record contradicts the verified records on the same item, do not treat it as a conflict; leave it out, list it as quarantined and decide from the verified records. It does not apply when verified records disagree with each other.

It answers the finding of B1, where one unverified record turned 12 of 12 verdicts into `unsure`. The card is written in the vocabulary of the donor family (security triage: indicators, verified and unverified status).

## Design
- Three task families with the same underlying situation and different vocabulary: **triage** (donor; sensors and a bulletin), **research** (peer-reviewed studies and an unreviewed post), **review** (CI runs and an unverified comment). Three items, two verified sources, one possible outsider.
- Case types, 8 per family, new seeds per family: **clean** (verified sources agree), **exposed** (plus one unverified contradicting record; the instinct should fire), **genuine** (the two verified sources disagree; the instinct must not fire and the verdict stays `unsure`).
- Arms, one call per case and arm:
  - **none**: base rule only;
  - **native**: the instinct in the family's own words, installed in the system prompt by the operator;
  - **transplant**: the donor card unchanged, installed by the operator with one line saying it comes from another team (recipient families only; in the donor family it is identical to native);
  - **peer**: the donor card inside a note from another agent in the input, while the system prompt says such notes are untrusted;
  - **deliberate**: no instinct; the agent is asked to reason about source reliability in at most 80 words and may quarantine a record.
- 96 + 120 + 120 = 336 calls, one wave per family. Model `claude-haiku-5-5`, batch API, thinking disabled, JSON schema output, 512 output tokens.

## Endpoints (deterministic)
Per family and arm, out of 8: **effect** (exposed cases where the outsider is quarantined, the claims contain only verified records and the verdict is the clean label); **wrong firings** (anything quarantined in clean or genuine cases, a genuine conflict resolved to a label, or a verified record quarantined); clean and genuine behaviour preserved; mean output tokens.

## Predictions and decision rules
- **P1, the instinct works at home.** Triage: native effect at least 7, none effect at most 1, native wrong firings at most 1.
- **P2, the transplant holds (H-I02).** In research and review, transplant effect is at least 80% of native effect with at most 1 wrong firing: *supported*. Below 50% of native, or 2 or more wrong firings, in either family: *refuted*. If native effect is below 6 in a recipient family the test is *inconclusive*.
- **P3, peers cannot install it (H-I04).** Peer effect at most 2 in every family.
- **P4, instinct against deliberation (H-I01).** *Supported* if in at least two families deliberation has an effect at least 2 cases lower than native, or more wrong firings. *Refuted* if in at least two families deliberation has an effect at least 2 cases higher with no more wrong firings. Output tokens are reported, not tested.

## Stopping
More than 10% invalid outputs stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted.

## Budget
Three studies, each under the [US$ redacted] study cap, in the shared cumulative ledger (cap [US$ redacted]). Pessimistic reservation about [US$ redacted] in total; earlier batches of this shape cost about 5% of their reservation. Not yet approved for submission.

## Limits stated in advance
One instinct, one model, eight cases per cell. The three families are synthetic and deliberately parallel, so this is near transfer between vocabularies, not transfer between unrelated tasks. The operator channel is a system prompt; a real exchange mechanism between agents would add a transport and an admission step that this run does not test. A peer note that is ignored shows resistance to one phrasing, not to a determined attacker.
