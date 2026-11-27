# I6 advice suppression: confirmed, and it is not about peers

Preregistration `tasks/I6-ADVICE-PREREG.md`. Run 2026-11-11: `i6-advice-review` and `i6-advice-triage` on `claude-haiku-5-5`, `i6-advice-review-sonnet` on `claude-sonnet-5-5`, 240 requests each, all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted] Summaries in `../batch2-i6-advice-*/summary.json`.

## Result

Exposed cases out of 16 where the unverified record was quarantined; in brackets, where the verdict was the verified label.

| Arm | Haiku review | Sonnet review | Haiku triage |
|---|---|---|---|
| none | 9 (9) | 11 (11) | 1 (3) |
| peer note with the quarantine instinct | 0 (7) | 0 (0) | 0 (10) |
| peer note with an unrelated instinct | 0 (3) | 0 (0) | 0 (3) |
| peer note with no rule (chatter) | 5 (9) | 4 (4) | 0 (9) |
| unrelated instinct installed by the operator | 0 (0) | 0 (0) | 0 (1) |

| Test | Haiku review | Sonnet review |
|---|---|---|
| P1 advice about the behaviour suppresses it | **supported** (9 → 0) | **supported** (11 → 0) |
| P2 unrelated advice suppresses it too | **supported** (9 → 0) | **supported** (11 → 0) |
| P3 a note with no rule does not | **not supported** (9 → 5) | **not supported** (11 → 4) |
| P4 an unrelated instinct from the operator does not | **not supported** (9 → 0) | **not supported** (11 → 0) |

Triage on Haiku was inconclusive as expected (baseline 1).

## Reading

- The unprompted quarantine seen in I4 recurred on both models at the same rate, and any rule placed in the context removed it completely, whoever placed it. One unrelated instinct installed by the operator was enough. The effect is not a reaction to peers: when the context contains an explicit rule about what to quarantine, the agent stops quarantining for reasons of its own.
- A note with no rule in it also lowered it, by about half on Haiku and more on Sonnet. Extra material in the input is enough to move the behaviour.
- So the baseline against which an instinct is measured is not stable: installing the first instinct of any kind changes what the agent does elsewhere. I2 and I5 measured interference between instincts; this is interference between an instinct and the agent's unprompted judgement, and it is total.
- Covert uptake again: with the quarantine note, Haiku's verdict followed the instinct in 10 of 16 triage cases against 3 without a note, third run in a row in that family. But a note with no rule gave 9 of 16, so in triage the verdict moves with the presence of a note, not with its content. The I4 control (an unrelated instinct, 2 of 16) and this one disagree on that; it is unexplained.

## Limits

One family, sixteen cases per cell, one wording per kind of note. "Unprompted quarantine" depends on a schema that offers a `quarantined` field and a sentence saying to leave it empty unless there is a reason; another interface could behave differently. The Sonnet runs have adaptive thinking.
