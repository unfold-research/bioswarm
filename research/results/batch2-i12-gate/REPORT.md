# I12 admission with a template and a gate: inconclusive as registered; the template fixes one failure and exposes another

Preregistration `tasks/I12-GATE-PREREG.md`. Run 2026-11-11 as `i12-gate` (admission by `claude-haiku-5-5`) and `i12-gate-sonnet` (admission by `claude-sonnet-5-5`, in `../batch2-i12-gate-sonnet/`); the executor is Haiku 5.5 in both. 9 + 560 requests each, all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Registered outcome

**All three predictions are inconclusive on both admission models.** The rule required the installed instinct alone to fire on at least 12 of 16 exposed cases; it fired on 11 in both runs. By the registered rule no set was admitted. Everything below is descriptive.

## What the runs show

Exposed cases out of 16 where the installed instinct's action was taken, per admitted set (three samples each); solo was 11.

| Newcomer | Haiku admission | Sonnet admission |
|---|---|---|
| rival | 11, 11, 11 (merge that drops the rival) | 11, 11, 11 (refuses the rival) |
| broad | 12, 13, 13 | 13, 14, 13 |
| narrow | 8, 8, 10 | 8, 8, 13 |

Every merged card followed the template. No wrong firing on clean or genuine cases.

- **The template repaired the broad case.** In I11 Sonnet's free-form merge of the broad newcomer left 1 of 16; with the template its three cards gave 13, 14 and 13, at or above solo. Haiku's stayed good.
- **The narrow case still fails**, in five of six sets, although the cards are correct by the policy: the installed trigger and action come first and the newcomer's clause is explicitly limited to cases the first trigger does not match. The executor escalated 4 to 6 of the 6 exposed cases about indicator 0 anyway.
- **The newcomer's action outside the collision is mostly lost.** On agree cases matched only by the broad newcomer, the executor escalated in 1 or 2 of 8; on those matched only by the narrow one, in 0 or 1 of 3.

## Reading

- **Amended after I13** (`../batch2-i13-branch/REPORT.md`). This paragraph first said that the small executor does not follow a card with two actions and that the branch result of I8 was therefore in doubt. I13 tested that directly and it is wrong: Haiku follows a card with two mutually exclusive conditions in both directions. What fails here is narrower: these merged cards express precedence (a first trigger, then an "otherwise" clause whose condition overlaps it), and the small executor does not apply an order of precedence between overlapping conditions.
- A regression gate would have done its job on these sets: under a threshold relative to solo it refuses the narrow cards and admits the others. But the gate as registered depends on a baseline that moved between 11 and 13 across runs of sixteen cases; a gate needs more cases than this.
- For the exchange design: a merge that removes an action (drop or refuse) is safe. A merge that keeps two actions has to state conditions that partition the cases; ordering them with "otherwise" is not reliable in a small executor, and here the newcomer's residual behaviour was not preserved that way.

## Limits

Inconclusive by the registered rule. The gate cases are the same sixteen that measure the effect. Template and gate were introduced together. One installed instinct, three newcomers, one executor model.

## The cards installed from the first sample

### Admission by Claude Haiku 5.5

**rival** — merge. Both instincts have the same trigger (a lone unverified record contradicting verified records on the same indicator) but prescribe opposite actions: quarantine and exclude it versus keep it as a real conflict and return unsure.

```
INSTINCT quarantine-lone-unverified, version 1
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.
Action: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

**broad** — merge. Both instincts trigger on a case with one unverified record that contradicts verified records, and the installed instinct quarantines it while the newcomer treats it as a real conflict with verdict unsure.

```
INSTINCT quarantine-lone-unverified-merged, version 1
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.
Action: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Otherwise, trigger: any record has status "unverified" in cases other than exactly one unverified record contradicting the verified records on the same indicator.
Otherwise, action: treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

**narrow** — merge. Both instincts match a case where an unverified record concerns indicator 0 and contradicts verified records, and they prescribe opposite actions (quarantine and decide from verified records versus keep in claims and return unsure).

```
INSTINCT quarantine-lone-unverified-merged, version 1
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.
Action: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Otherwise, trigger: a record with status "unverified" is about indicator 0 and does not meet the first trigger.
Otherwise, action: treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

### Admission by Claude Sonnet 5.5

**rival** — refuse-newcomer. Both triggers match exactly the same cases (a lone unverified record contradicting verified records on the same indicator) but prescribe opposite actions, and the newcomer matches nothing outside the installed trigger.

**broad** — merge. Both triggers match any case with exactly one unverified record that contradicts the verified records, and there the installed card quarantines it while the newcomer keeps it and returns unsure.

```
INSTINCT quarantine-lone-unverified, version 2
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.
Action: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Otherwise, trigger: any record has status "unverified" and the first trigger does not match.
Otherwise, action: treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```

**narrow** — merge. A lone unverified record on indicator 0 that contradicts the verified records matches both triggers, and the installed card quarantines it while the newcomer keeps it in claims and returns unsure.

```
INSTINCT quarantine-lone-unverified, version 2
Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.
Action: do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.
Otherwise, trigger: a record with status "unverified" is about indicator 0, and the first trigger does not match.
Otherwise, action: treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.
Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.
```
