# I9 installed instincts remove unprompted quarantine, and a sentence does not keep it

Preregistration `tasks/I9-RULES-PREREG.md`. Run 2026-11-11, 240 requests on `claude-haiku-5-5` (`i9-rules`) and 240 on `claude-sonnet-5-5` (`../batch2-i9-rules-sonnet/`), all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Exposed cases out of 16 where the unverified record was quarantined with no instinct asking for it.

| Operator text | Haiku | Sonnet |
|---|---|---|
| none | 10 | 9 |
| unrelated instinct about quarantining | 0 | 0 |
| unrelated instinct about something else | 7 | 0 |
| one sentence about style | 8 | 15 |
| the quarantining instinct plus a sentence preserving judgement | 0 | 0 |

No wrong firing on clean or genuine cases in any arm.

| Test | Haiku | Sonnet |
|---|---|---|
| P1 replication of I6 | **supported** | **supported** |
| P2 an instinct about something else does not remove it | **not supported** (10 → 7) | **not supported** (9 → 0) |
| P3 a plain operator sentence does not remove it | **supported** | **supported** |
| P4 a preserving sentence keeps it | **not supported** (0) | **not supported** (0) |

## Reading

- Third run with the same baseline (8, 9, 10 of 16 on Haiku; 10, 11, 9 on Sonnet) and the same collapse to zero when an unrelated quarantining instinct is installed.
- It is the instinct form, not operator text as such: a sentence about style left the behaviour in place on both models. On Sonnet any installed instinct removed it, including one about note wording; on Haiku an instinct about something else lowered it a little and one about quarantining removed it.
- The sentence saying that instincts add to judgement and are not a complete list changed nothing: 0 of 16 on both models. Agents treat an installed set of instincts as the whole policy for the actions those instincts name, and saying otherwise in prose does not undo it.
- Consequence for the instinct programme: behaviour that an operator wants kept has to be written as an instinct itself before any other is installed. Unprompted good behaviour is not a stable base to add to.

## Limits

One unprompted behaviour, one family, sixteen cases per cell, one wording per arm. The Sonnet runs have adaptive thinking. The rise under the style sentence on Sonnet (9 to 15) was not predicted and is unexplained.
