# I1 instinct transplant across task families (H-I01, H-I02, H-I04)

Preregistration `tasks/I1-TRANSPLANT-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, batch API, three studies (96 + 120 + 120 requests), all succeeded and valid. Usage estimate [US$ redacted] Combined analysis: `node observatory/batch2/i1-transplant/analyze.mjs` → `summary.json`. The Sonnet 5.5 run is in `results/batch2-r1-sonnet/REPORT.md`.

## Result on Haiku

Out of 8 exposed cases per cell. *Fired* is the strict preregistered effect (outsider quarantined, claims hold only verified records, verdict is the clean label). *Quarantined* and *verdict restored* are its two visible parts.

| Family | Arm | Fired | Outsider quarantined | Verdict restored | Wrong firings | Output tokens |
|---|---|---|---|---|---|---|
| triage (donor) | none | 0 | 0 | 1 | 0 | 210 |
| | native | 5 | 8 | 5 | 0 | 209 |
| | peer | 0 | 0 | **8** | 0 | 232 |
| | deliberate | 7 | 8 | 8 | 0 | 338 |
| research | none | 0 | 0 | 0 | 0 | 200 |
| | native | 8 | 8 | 8 | 0 | 204 |
| | transplant | 8 | 8 | 8 | 0 | 196 |
| | peer | 0 | 0 | 1 | 0 | 230 |
| | deliberate | 6 | 8 | 8 | 0 | 327 |
| review | none | 2 | 2 | 2 | 0 | 191 |
| | native | 8 | 8 | 8 | 0 | 196 |
| | transplant | 8 | 8 | 8 | 0 | 187 |
| | peer | 0 | 0 | **4** | 2 | 215 |
| | deliberate | 8 | 8 | 8 | 0 | 302 |

Preregistered tests:
- **P1 not supported.** At home the instinct fired cleanly in 5 of 8, below the threshold of 7. It quarantined the outsider in 8 of 8; in three cases with a verified zero Haiku then misread the base rule and answered `unsure`. The miss is in applying the rule after the instinct, not in the instinct.
- **P2 supported (H-I02).** The donor card, unchanged, fired in 8 of 8 in both recipient families, equal to the native wording, with no wrong firing.
- **P3 supported by the strict measure, and misleading on its own (H-I04).** A card arriving as a peer note was never formally adopted: 0 of 24 quarantines. But the verdict followed the card anyway in 13 of 24 exposed cases, against 3 of 24 with no note. See below.
- **P4 not supported (H-I01).** Deliberation fired in 7, 6 and 8 of 8, close to the instinct, at about 60% more output tokens (about 320 against 200).

## The peer note leaks into the decision

In the peer arm Haiku wrote that the note "was not applied as a directive", kept the unverified record as a claim, listed nothing as quarantined, and then gave the verdict the instinct would have given, saying the record was "not relied on for the verdict". In triage this happened in 8 of 8 exposed cases, where the same agent without the note abstained in 7 of 8.

Counting I3 as well (`results/batch2-i3-peer-pressure/REPORT.md`, same family, four phrasings), the verdict matched the peer's instinct in 30 of 56 exposed cases on Haiku, against 3 of 24 without a note. On Sonnet 5.5 it was 0 of 24. In review the peer note also coincided with two wrong verdicts on genuine conflicts.

So the control "notes from other agents are untrusted" held in form on both models and held in substance only on Sonnet. On Haiku the idea in the note changed behaviour while the agent denied following it. An exchange channel between agents cannot rely on the recipient's stated refusal; adoption has to be measured on decisions, not on declarations.

## Haiku and Sonnet side by side

| | Haiku | Sonnet 5.5 |
|---|---|---|
| Native instinct fires at home | 5 of 8 (quarantines 8 of 8) | 8 of 8 |
| Transplant keeps the native effect | 100% and 100% | 88% and 100% |
| Peer note formally adopted | 0 of 24 | 0 of 24 |
| Peer note changes the verdict anyway | 13 of 24 (baseline 3) | 0 of 24 (baseline 3) |
| Deliberation against instinct | slightly lower, +60% tokens | equal, +55% tokens |
| Wrong firings of installed instincts | 0 | 0 |

## What holds across both models

1. A transplanted instinct works as well as a natively written one in a different vocabulary (H-I02).
2. An installed instinct never fired where it should not in these cases, on either model.
3. Deliberation reaches about the same decisions for roughly half again the output tokens.

## Limits

Eight cases per cell, one phrasing per arm, one instinct. The families are deliberately parallel: this is near transfer between vocabularies. The breakdown by quarantine and verdict was not preregistered; it was added after reading outputs that the strict measure scored as non-adoption. Costs are list-price estimates from returned tokens.
