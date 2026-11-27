# S3 an instinct injected only when its trigger holds: it protects the cases no card touches, and only those

Preregistration `tasks/C1-S3-PREREG.md`. Run 2026-11-11: 192 requests on `claude-haiku-5-5` (`s3-trigger`) and 192 on `claude-sonnet-5-5` (`../batch2-s3-trigger-sonnet/`), all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Out of 16 cases per cell: the unverified record quarantined unprompted / the stale record quarantined as the card says.

| Case kind | Haiku none | Haiku always | Haiku on-trigger | Sonnet none | Sonnet always | Sonnet on-trigger |
|---|---|---|---|---|---|---|
| exposed (no stale record) | 7 / – | 0 / – | 7 / – | 9 / – | 0 / – | 8 / – |
| exposed and stale | 6 / 2 | 0 / 16 | 0 / 16 | 5 / 0 | 0 / 16 | 0 / 16 |
| stale only | – / 2 | – / 16 | – / 16 | – / 0 | – / 16 | – / 16 |
| clean | 0 | 0 | 0 | 0 | 0 | 0 |

| Test | Haiku | Sonnet |
|---|---|---|
| P1 replication: a card always in context removes unprompted quarantine | **supported** (7 → 0) | **supported** (9 → 0) |
| P2 with the trigger in the harness it is kept on cases the card does not concern | **supported** (7; identical requests) | **supported** (8) |
| P3 the card still works when injected | **supported** (16 of 16) | **supported** (16 of 16) |
| P4 a card that fires does not remove unprompted behaviour in the same case | **not supported** (6 → 0) | **inconclusive** as registered (baseline 5 of 16, below 0.35); 5 → 0 |

## Reading

- Fifth replication of the displacement effect, on both models: an unrelated installed instinct takes unprompted quarantine to zero.
- Evaluating the trigger in code and injecting the card only where it holds gives back the baseline on every case the card does not concern, and the card keeps its full effect where it does. This is true by construction for the first part and it is still the practical result: with triggers in the harness, the cost of an instinct is confined to the cases where it fires.
- On those cases the cost is total. When the card fired, unprompted quarantine of the other record went to zero on both models (6 and 5 of 16 without the card). So harness triggers narrow the displacement; they do not remove it.
- With I10 this gives the working rule for a skill system: evaluate triggers outside the model wherever they can be computed, and write down as instincts the behaviours that must survive on the cases where another instinct fires.

## Limits

One instinct with a trigger a line of code can evaluate; a trigger that needs judgement cannot be moved to the harness. One family, sixteen cases per cell. On Sonnet the mixed-case baseline was just under the registered threshold.
