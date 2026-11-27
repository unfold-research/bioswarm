# I14 admission as a partition: the gate works; the narrow collision is still not resolved by a written card

Preregistration `tasks/I14-PARTITION-PREREG.md`. Run 2026-11-11 as `i14-partition` (admission by `claude-haiku-5-5`) and `i14-partition-sonnet` (admission by `claude-sonnet-5-5`, in `../batch2-i14-partition-sonnet/`); the executor is Haiku 5.5 in both. 9 + 1,120 requests each, all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Exposed cases out of 16 where the installed instinct's action was taken, on the gate set and on the held-out set. Solo: 12 and 13.

| Newcomer | Haiku admission, three samples (gate / held-out) | Sonnet admission, three samples |
|---|---|---|
| rival | 12/12, 12/12, 13/11 — admitted | refused by the agent; 12/13 three times — admitted |
| broad | 12/13, 12/9, 12/11 — admitted | 13/15, 13/15, 13/15 — admitted |
| narrow | 6/8, 9/9, 8/6 — refused by the gate | 6/5, 8/8, 6/4 — refused by the gate |

Every merged card passed the template check. No wrong firing on clean or genuine cases.

| Test | Haiku admission | Sonnet admission |
|---|---|---|
| P1 at least 7 of 9 sets admitted | **not supported** (6) | **not supported** (6) |
| P2 the narrow newcomer passes | **not supported** (0 of 3) | **not supported** (0 of 3) |
| P3 the gate generalises to held-out cases | **supported** (1 of 6 admitted sets slipped) | **supported** (0 of 6) |
| P4 the newcomer's action is kept outside the collision | **not supported** (12 of 48) | **not supported** (12 of 48) |

## Reading

- **The gate is the part that works.** Decided on one set of cases, it admitted the same six sets on both admission models, refused all six narrow ones, and on held-out cases one of twelve admitted sets fell below the criterion. A regression test in the executor is a usable admission step; with it, a bad merge costs nothing, because the fallback is the installed instinct alone.
- **The narrow collision is not solved by rewriting.** Asked for mutually exclusive conditions, both models wrote the second condition as the negation of the first ("a record about indicator 0 that is not the lone contradicting record"). That is exclusive in logic and the small executor still escalated on indicator 0. The cards of I13 that it followed stated two positive conditions on one attribute. A condition that can only be told apart by negating another is, for this executor, an overlap.
- **The newcomer's own territory is lost.** Outside the collision the newcomer's action was taken in a quarter of the cases. An admitted merge therefore protects the installed instinct and mostly discards the newcomer. In effect the safe outcomes of admission are two: install both when they do not collide, or keep the installed one.
- Across I5, I7, I8, I11, I12, I13 and I14 the rule that survives is short: a small executor holds one action per trigger reliably, and a second action only when the two cases differ on a single stated attribute. Admission should test, and refuse when the test fails.

## Limits

One installed instinct, three hand-written newcomers, sixteen exposed cases per set, one executor model. The template check is a pattern match and passed cards that do not partition in the sense intended.

## The cards installed from the first sample

### Admission by Claude Haiku 5.5

**rival** — merge. Both instincts trigger on the same case (exactly one unverified record contradicting verified records on the same indicator) but prescribe opposite actions: quarantine and decide from verified records versus keep the record and return unsure.

```
INSTINCT quarantine-lone-unverified-merged, version 1
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator, or the verified records disagree with each other on an indicator.
Action, if exactly one record has status "unverified" and it contradicts the verified records on the same indicator: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Action, if the verified records disagree with each other on an indicator: treat it as a real conflict and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

**broad** — merge. The newcomer's trigger matches every case the installed card matches (a lone unverified record contradicting verified ones), and there the installed card says quarantine while the newcomer says escalate, so the actions conflict.

```
INSTINCT quarantine-or-escalate-unverified, version 1
Trigger: any record has status "unverified".
Action, if exactly one record has status "unverified" and it contradicts the verified records on the same indicator: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Action, if the case is not that (any other record with status "unverified"): treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

**narrow** — merge. Both triggers match a case where a lone unverified record on indicator 0 contradicts verified records, and the installed card quarantines it while the newcomer escalates it as a real conflict.

```
INSTINCT quarantine-escalate-unverified, version 1
Trigger: a record with status "unverified" is about indicator 0, or exactly one record has status "unverified" and it contradicts the verified records on the same indicator.
Action, if exactly one record has status "unverified" and it contradicts the verified records on the same indicator: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Action, if a record with status "unverified" is about indicator 0 and it is not the lone contradicting unverified record: treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

### Admission by Claude Sonnet 5.5

**rival** — refuse-newcomer. Both triggers match exactly the same cases (a lone unverified record contradicting verified records on the same indicator) but prescribe opposite actions, and the newcomer adds nothing outside that overlap.

**broad** — merge. Both triggers match any case with exactly one unverified record that contradicts the verified records, and there the installed card quarantines it while the newcomer keeps it and returns unsure.

```
INSTINCT quarantine-lone-unverified, version 2
Trigger: any record has status "unverified".
Action, if exactly one record has status "unverified" and it contradicts the verified records on the same indicator: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Action, if it is not the case that exactly one record has status "unverified" and it contradicts the verified records on the same indicator: treat it as a real conflict. Keep the unverified records in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

**narrow** — merge. A lone unverified record on indicator 0 that contradicts the verified records matches both triggers, and the installed card quarantines it while the newcomer treats it as a real conflict with verdict unsure.

```
INSTINCT quarantine-lone-unverified, version 2
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator, or a record with status "unverified" is about indicator 0.
Action, if exactly one record has status "unverified" and it contradicts the verified records on the same indicator: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Action, if it is not the case that exactly one record has status "unverified" and it contradicts the verified records on the same indicator (a record with status "unverified" about indicator 0 is present): treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```
