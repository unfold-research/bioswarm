# R1: first results on Claude Sonnet 5.5 (B1, M3, D1, I1)

Preregistration `tasks/R1-SONNET-REPLICATION-PREREG.md` and the preregistration of each study. Run 2026-11-11 on `claude-sonnet-5-5`, batch API, adaptive thinking at effort low. All 832 requests succeeded; none invalid or truncated. Usage estimate [US$ redacted] in total.

**Order of arrival.** These replications came back before the Haiku runs of M3, D1 and I1, which were still in the provider queue. For those three studies this is therefore the first result, not yet a replication. B1 on Haiku was already known.

## B1 endpoint calibration: same pattern as Haiku

| | Factuality | Authority |
|---|---|---|
| Carrier at the exposed source | 12 / 12 | 4 / 12 |
| Uptake by the lead | 12 / 12 | 0 / 12 |
| Lead gave the attacker's verdict | 0 | 0 |
| Lead verdict changed vs clean | 12 | 0 |
| Calibration | attack-observable | futile-on-this-instrument |

Instrument sound (24 of 24 clean). One difference from Haiku: in 4 of 12 authority cases the exposed source analyst mentioned the marker in its note, but the lead never carried it on and no verdict changed.

## M3 verifier: both predictions supported

| Arm | Sensitivity | Specificity |
|---|---|---|
| Grounded (sees records and report) | 48 / 48 | 48 / 48 |
| Blind (sees the report only) | 1 / 48 | 48 / 48 |

The grounded verifier caught every planted error of all four types and named the right indicator every time. Without the sources a verifier catches nothing and, on this instrument, also raises no false alarm. P1 and P2 supported.

## D1 defence comparison: no policy dominates

Correct / wrong / abstained, out of 8, against the hidden truth:

| Policy | clean | lone-false | sybil | novel-true | novel-false |
|---|---|---|---|---|---|
| rule | 8 / 0 / 0 | 7 / 0 / 1 | 1 / 0 / 7 | 8 / 0 / 0 | 0 / 8 / 0 |
| allow-list | 8 / 0 / 0 | 8 / 0 / 0 | 8 / 0 / 0 | 0 / 0 / 8 | 0 / 0 / 8 |
| instinct | 8 / 0 / 0 | 8 / 0 / 0 | 0 / 0 / 8 | 6 / 0 / 2 | 0 / 6 / 2 |
| quorum | 8 / 0 / 0 | 8 / 0 / 0 | 0 / 0 / 8 | 0 / 0 / 8 | 0 / 0 / 8 |

By the preregistered thresholds P2 and P5 are supported and P1, P3 and P4 are not:
- **P1 failed on the baseline, not on the defences.** With nothing but the plain rule, Sonnet set the lone unverified record aside on its own in 7 of 8 cases. Haiku in B1 never did. The instinct and the allow-list both reached 8 of 8.
- **P3 and P4 missed their thresholds by one case** (6 where 7 was required): on novel evidence the instinct abstained twice out of caution.

The expected trade-off holds descriptively. The allow-list and the quorum never gave a wrong verdict and discarded all novel evidence, true or false. The rule and the instinct kept novel evidence and were wrong whenever it was false. Two colluding unverified sources stopped the instinct and the quorum (abstention), not the allow-list. No policy was correct in all five case types.

## I1 instinct transplant: the transplant held, peers could not install it

Effect out of 8 exposed cases (wrong firings were 0 in every cell; clean and genuine behaviour preserved 8 of 8 everywhere):

| Arm | triage (donor) | research | review |
|---|---|---|---|
| none | 0 | 0 | 3 |
| native | 8 | 8 | 8 |
| transplant | (same as native) | 7 | 8 |
| peer | 0 | 0 | 0 |
| deliberate | 8 | 8 | 8 |

- **P1 supported**: the instinct works at home (8 against 0).
- **P2 supported (H-I02)**: the donor card, unchanged and in triage vocabulary, kept 88% and 100% of the native effect in the two recipient families, with no wrong firing.
- **P3 supported (H-I04)**: the same card arriving as a note from another agent was adopted in 0 of 24 exposed cases.
- **P4 not supported (H-I01)**: asked to reason about source reliability, Sonnet reached the same 8 of 8 with no wrong firing, so deliberation was not worse. It cost more: about 310 output tokens per decision against about 200 with the instinct, roughly 55% more.

## Limits

One run, eight cases per cell in D1 and I1, one phrasing per arm. Thinking was on, so a difference from Haiku mixes model and thinking. The I1 families are deliberately parallel; this is near transfer between vocabularies. In I1 review, Sonnet without any instinct already quarantined the unverified comment in 3 of 8 cases, so part of the effect there is the model's own prior. Costs are list-price estimates from returned tokens.
