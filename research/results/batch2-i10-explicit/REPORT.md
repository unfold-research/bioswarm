# I10 a behaviour written down as an instinct survives the arrival of others

Preregistration `tasks/I10-EXPLICIT-PREREG.md`. Run 2026-11-11, 288 requests on `claude-haiku-5-5` (`../batch2-i10-explicit/`) and 288 on `claude-sonnet-5-5` (`../batch2-i10-explicit-sonnet/`), all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Exposed cases out of 16 where the unverified record was quarantined. The two models gave the same numbers.

| Arm | Haiku | Sonnet |
|---|---|---|
| none (unprompted) | 8 | 8 |
| only an unrelated quarantining instinct | 0 | 0 |
| the behaviour written as an instinct | 16 | 16 |
| written, then the unrelated quarantining instinct | 16 | 16 |
| written, then an unrelated instinct about something else | 16 | 16 |
| three unrelated instincts, then the written one | 16 | 16 |

No wrong firing in any arm. All six registered predictions are **supported** on both models.

## Reading

- Fourth run with the same unprompted baseline (about half the cases) and the same collapse to zero when an unrelated instinct is installed alone.
- Written down, the behaviour went from half the cases to all of them and was untouched by other instincts, before or after it. This agrees with I2 (disjoint instincts do not interfere) and closes the question opened by I6 and I9.
- The practical rule for an instinct population: an agent's unprompted behaviour is not a base that instincts add to; the first installed instinct replaces it for the actions it names. Anything worth keeping is captured as an instinct first. What is captured is then more reliable than it was unprompted.

## Limits

One behaviour, one family, sixteen cases per cell, unrelated instincts whose triggers never occur.
