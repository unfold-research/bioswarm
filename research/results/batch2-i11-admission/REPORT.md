# I11 admission by an agent: collisions are detected, and the hard case is resolved wrongly or unreadably

Preregistration `tasks/I11-ADMISSION-PREREG.md`. Run 2026-11-11 as `i11-admission` (admission by `claude-haiku-5-5`) and `i11-admission-sonnet` (admission by `claude-sonnet-5-5`, in `../batch2-i11-admission-sonnet/`); the executor is Haiku 5.5 in both. 12 + 240 requests each, all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Admission, three samples per newcomer:

| Newcomer | Haiku says collides | Haiku resolution | Sonnet says collides | Sonnet resolution |
|---|---|---|---|---|
| rival (same trigger) | 3 of 3 | merge | 3 of 3 | refuse the newcomer |
| broad | 3 of 3 | merge | 3 of 3 | merge |
| narrow | 3 of 3 | merge | 3 of 3 | merge |
| control (no overlap intended) | 0 of 3 | install both | 3 of 3 | merge |

Execution on the small model, exposed cases out of 16 where the installed instinct's action was taken:

| Arm | Admitted by Haiku | Admitted by Sonnet |
|---|---|---|
| solo | 13 | 12 |
| rival | 13 | 12 |
| broad | 12 | 1 |
| narrow | 8 | 8 |
| control | 13 | 12 |

No wrong firing in any arm.

| Test | Haiku admission | Sonnet admission |
|---|---|---|
| P1 the agent detects collisions | **supported** | **not supported** (flags the control) |
| P2 its resolution works in a small executor | **not supported** (narrow) | **not supported** (broad, narrow) |
| P3 a non-colliding newcomer costs nothing | supported | supported |
| P4 no spill-over | supported | supported |

## Reading

- Detection is not the problem. Both models found every real collision in every sample. Sonnet also flagged the control, with a reason that is arguable and not wrong: a case can hold both a lone unverified record and a stale record. Our label "no overlap" was true of the test cases, not of the triggers. The merged card it wrote for the control worked.
- The identical-trigger rival was handled by both (a merge that drops the rival's action, or a refusal).
- The narrow newcomer failed for two different reasons. Haiku's merged card kept the newcomer's action for indicator 0 inside the collision, against the stated policy: the card is wrong. Sonnet's card is right by the policy and the executor still escalated on 7 of 16: the card leads its trigger with the newcomer's condition and puts the installed action in a nested clause, and the small model did not follow it.
- Sonnet's merge of the broad newcomer is also correct on paper and failed almost completely in execution (1 of 16), while Haiku's plainer merge of the same pair worked (12 of 16). A card written by the stronger model for precision was less usable by the small model than a card written by the small model.
- So admission by an agent needs a second gate. A written resolution has to be tested in the executor that will hold it before it is installed; reading the card is not enough, for us or for the admission agent.

## Limits

Execution tested the first admission sample only. One installed instinct, four hand-written newcomers. No case in the suite is matched by the newcomer alone, so the half of the policy that keeps the newcomer's action was not tested.

## The decisions that were installed

### Admission by Claude Haiku 5.5 (first sample, the one installed)

**rival** — merge. Both instincts trigger on the same case (one unverified record contradicting verified records on the same indicator) but prescribe opposite actions: quarantining it and deciding from verified records versus keeping it as a real conflict with verdict unsure.

```
INSTINCT quarantine-lone-unverified, version 1
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.
Action: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

**broad** — merge. Both triggers match a case with one unverified record contradicting verified records, where the installed card quarantines it and decides from verified records while the newcomer keeps it in claims and returns unsure.

```
INSTINCT triage-unverified-records, version 1
Trigger: any record has status "unverified".
Action: if exactly one record has status "unverified" and it contradicts the verified records on the same indicator, do not treat it as a conflict; leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Action: if the unverified record does not contradict the verified records, keep it in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other, that is a real conflict and the verdict is unsure.
```

**narrow** — merge. Both instincts match a case where a lone unverified record on indicator 0 contradicts verified records, and the installed card quarantines it while the newcomer keeps it in claims and returns unsure, so their actions conflict.

```
INSTINCT quarantine-lone-unverified, version 1
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.
Action: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Action (when the unverified record is about indicator 0): treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

**control** — install-both. The installed instinct triggers on unverified records contradicting verified ones, while the newcomer triggers on records with age_days above 30; a case can match both, but the actions (quarantine and exclude from claims, decide verdict from verified records) are consistent with each other, so there is no conflicting action on any shared case.

### Admission by Claude Sonnet 5.5 (first sample, the one installed)

**rival** — refuse-newcomer. Both triggers match the same case (exactly one unverified record contradicting verified records on the same indicator) but the installed card quarantines it and decides from verified records while the newcomer keeps it in claims and returns unsure, and the newcomer's trigger has no cases outside the installed trigger's scope.

**broad** — merge. Both triggers match whenever exactly one unverified record contradicts the verified records on an indicator (and verified records agree), but the installed card quarantines it and decides from verified records while the newcomer keeps it in claims and returns unsure.

```
INSTINCT quarantine-lone-unverified-else-escalate, version 2
Trigger: any record has status "unverified".
Action: if exactly one record has status "unverified" and it contradicts the verified records on the same indicator (and the verified records do not disagree with each other), do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Action (all other cases where any record is unverified, including when verified records disagree with each other): treat it as a real conflict. Keep the unverified record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when no record has status "unverified".
```

**narrow** — merge. Both triggers match when exactly one unverified record on indicator 0 contradicts the verified records, and there the installed card quarantines it while the newcomer keeps it in claims and returns unsure.

```
INSTINCT quarantine-lone-unverified, version 2
Trigger: a record has status "unverified" and is about indicator 0, or exactly one record has status "unverified" and it contradicts the verified records on the same indicator.
Action: if exactly one record has status "unverified" and it contradicts the verified records on the same indicator, do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Action: otherwise, when an unverified record is about indicator 0, treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

**control** — merge. A case with exactly one unverified record that contradicts verified records and also has age_days above 30 (on that record or another) matches both triggers, and the actions differ: the installed card quarantines and decides from verified records alone, while the newcomer quarantines and ignores a record, which may be a different (verified) record that the installed card would use for the verdict.

```
INSTINCT quarantine-lone-unverified-and-stale, version 2
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator, or a record has a field `age_days` above 30.
Action: if exactly one record has status "unverified" and it contradicts the verified records on the same indicator, do not treat it as a conflict; leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone (including any verified record with `age_days` above 30, which is not quarantined or ignored in this case).
Action (otherwise, when a record has `age_days` above 30 and the case above does not hold): list that record in `quarantined` and ignore it.
Does not apply: to the lone-unverified handling when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```
