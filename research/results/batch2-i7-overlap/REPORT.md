# I7 partial overlap: interference stays inside the overlap; the admission clause works on Sonnet only

Preregistration `tasks/I7-OVERLAP-PREREG.md`. Run 2026-11-11, 192 requests on `claude-haiku-5-5` (`i7-overlap`) and 192 on `claude-sonnet-5-5` (`../batch2-i7-overlap-sonnet/`), all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Exposed cases where the target instinct fired, out of 16; split into the 6 cases where the unverified record is about indicator 0 and the 10 where it is not.

| Arm | Haiku total | on 0 | off 0 | Sonnet total | on 0 | off 0 |
|---|---|---|---|---|---|---|
| solo | 13 | 6 | 7 | 16 | 6 | 10 |
| broad (escalate on any unverified record) | 0 | 0 | 0 | 16 | 6 | 10 |
| narrow (escalate when it is about indicator 0) | 6 | 0 | 6 | 9 | 0 | 9 |
| disjoint (broad, with an exclusion clause) | 4 | 1 | 3 | 16 | 6 | 10 |

No wrong firing in any arm.

| Test | Haiku | Sonnet |
|---|---|---|
| P1 a broader instinct overrides the specific one | **supported** (13 → 0) | **refuted** (16 → 16) |
| P2 interference stays inside the overlap | **supported** | **supported** |
| P3 an exclusion clause written at admission restores the target | **not supported** (4) | **supported** (16) |
| P4 no spill-over | supported | supported |

## Reading

- Interference is local on both models: the narrow instinct removed the target on the cases it covers (6 to 0) and left the others alone. A collision check at admission can therefore be computed on triggers, case by case.
- The models resolve an overlap in opposite directions. Sonnet lets the more specific trigger win: the broad instinct changed nothing, the narrower one won inside its range. Haiku lets the escalating instinct win whenever it matches, as in I5.
- Writing the exclusion into the newcomer repaired nothing on Haiku (4 of 16). With I5, where a numeric priority also failed on Haiku, two different textual arbitration devices now fail on the small model and work on the large one. For a population that includes small models, colliding instincts have to be merged or one of them refused; they cannot be installed side by side with a tie-break.

## Limits

One target, three hand-written second instincts, sixteen cases per cell. The admission step was simulated by us writing the clause. The second instinct's action coincides with the base rule, as in I5.
