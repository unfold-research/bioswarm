# I5 rival instincts: a collision breaks the instinct, and only Sonnet obeys a priority

Preregistration `tasks/I5-RIVALS-PREREG.md`. Run 2026-11-11, 240 requests on `claude-haiku-5-5` (`i5-rivals`) and 240 on `claude-sonnet-5-5` (`i5-rivals-sonnet`, in `../batch2-i5-rivals-sonnet/`); all succeeded and were valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Exposed cases out of 16: the target instinct fired / the rival's answer was given / neither.

| Arm | Haiku | Sonnet |
|---|---|---|
| solo | 12 / 0 / 4 | 16 / 0 / 0 |
| rival (target listed first) | 3 / 9 / 4 | 4 / 11 / 1 |
| rival-first | 0 / 15 / 1 | 4 / 12 / 0 |
| priority (target wins) | 6 / 1 / 9 | 16 / 0 / 0 |
| priority-rev (rival wins) | 5 / 3 / 8 | 3 / 13 / 0 |

No wrong firing on clean or genuine cases in any arm on either model.

| Test | Haiku | Sonnet |
|---|---|---|
| P1 colliding instincts interfere (H-I07) | **supported**: 12 → 3 and 0 | **supported**: 16 → 4 and 4 |
| P2 order decides | not supported (3 against 0) | not supported (4 against 4) |
| P3 an explicit priority resolves it | **not supported**: 6 and 5 | **not supported** by one case: 16 and 3 (limit 2) |
| P4 no spill-over | supported | supported |

## Reading

- H-I07 was not supported with disjoint triggers (I2) and is supported when triggers collide. The number of instincts is not what hurts; overlap is. A population of exchanged instincts needs a collision check at admission.
- Without a priority, the rival wins on both models, whatever the order. Its action is the same as the base rule, so the more conservative of two colliding instincts prevailed. Whether that is conservatism or agreement with the base rule cannot be told apart here.
- Sonnet follows a numeric priority almost exactly. Haiku does not: with priorities it produced neither answer in about half the cases (9 and 8 of 16). On a small model an explicit arbitration rule made things worse than no rule.

## Limits

One pair of instincts with identical trigger sentences. Sixteen cases per cell. Haiku's solo effect was 12 of 16, at the registered minimum for P1. The "neither" answers were not classified; the three read by hand are internally inconsistent (a note that says `unsure` next to a verdict that names a label, or a quarantined record next to a wrong verdict).
