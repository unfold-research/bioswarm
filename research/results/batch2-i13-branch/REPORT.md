# I13 a conditional instinct is followed in both directions; a statement in the I12 report was wrong

Preregistration `tasks/I13-BRANCH-PREREG.md`. Run 2026-11-11, 288 requests on `claude-haiku-5-5` (`i13-branch`) and 288 on `claude-sonnet-5-5` (`../batch2-i13-branch-sonnet/`), all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Exposed cases: 12 with the unverified record on indicator 0, 20 on another indicator. Quarantined / escalated.

| Arm | Haiku, on 0 | Haiku, not on 0 | Sonnet, on 0 | Sonnet, not on 0 |
|---|---|---|---|---|
| solo (quarantine) | 11 / 0 | 12 / 0 | 12 / 0 | 20 / 0 |
| branchA (escalate on 0, quarantine otherwise) | 0 / 12 | 19 / 0 | 0 / 12 | 20 / 0 |
| branchB (quarantine on 0, escalate otherwise) | 11 / 0 | 0 / 20 | 9 / 0 | 0 / 20 |

No wrong firing on the 64 clean and genuine cases in any arm.

| Test | Haiku | Sonnet |
|---|---|---|
| P1 branchA is followed | **supported** | **supported** |
| P2 branchB is followed | **supported** | **not supported**: quarantined 9 of 12 on indicator 0, solo 12 of 12 (limit 0.15 below) |
| P3 no spill-over | supported | supported |

## Reading

- The small model follows a conditional card in both directions, almost perfectly (62 of 64 branch decisions right). The result of I8 stands.
- **Correction.** The I12 report said that I8 "does not show that a small model follows a conditional card in general" and that Haiku "takes the escalating action when a short, concrete condition names the case". I13 was run to test that and it is false: with the actions exchanged Haiku quarantined on indicator 0 and escalated elsewhere, as written. The I12 report has been amended.
- What then failed in I11 and I12 is narrower. Those merged cards expressed precedence: a first trigger and action, then an "otherwise" clause whose condition overlaps the first. The cards of I8 and I13 state two mutually exclusive conditions side by side. The small model applies explicit disjoint conditions and does not apply an order of precedence between overlapping ones.
- On the cases not about indicator 0, Haiku quarantined more under branchA (19 of 20) than under the plain instinct (12 of 20). A card that spells out both outcomes was followed better than a card with one action and an exception.
- Admission rule, revised: when a newcomer overlaps an installed instinct, rewrite the pair as one card whose conditions partition the cases, each with its own action. Do not rely on ordering, priority numbers, exclusion clauses or "otherwise".

## Limits

One condition, one pair of actions, 32 exposed cases per arm. Escalation coincides with the base rule. Sonnet's shortfall on one branch (9 of 12) is three cases and unexplained.
