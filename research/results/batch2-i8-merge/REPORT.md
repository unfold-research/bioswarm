# I8 merging colliding instincts: one card works on both models, including a card with a branch

Preregistration `tasks/I8-MERGE-PREREG.md`. Run 2026-11-11, 240 requests on `claude-haiku-5-5` (`i8-merge`) and 240 on `claude-sonnet-5-5` (`../batch2-i8-merge-sonnet/`), all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted]

## Result

Exposed cases out of 16 where the quarantine action was taken; for the branch arm, cases that followed the right branch.

| Arm | Haiku | Sonnet |
|---|---|---|
| solo | 12 | 16 |
| rival (two cards, same trigger) | 6 | 2 |
| merged (one card, rival's action dropped) | 11 | 16 |
| refused (target, rival named as refused) | 12 | 16 |
| branch (one card, two actions by condition) | 14 of 16 right | 16 of 16 right |

No wrong firing in any arm. All five registered predictions are **supported** on both models.

## Reading

- The collision of I5 replicated (12 to 6, 16 to 2) and disappeared when the two instincts were resolved into one card before installation. Naming the refused rival did no harm.
- A single card carried a conditional action correctly on Haiku (6 of 6 escalated on indicator 0, 8 of 10 quarantined otherwise), where two cards with a numeric priority (I5) or an exclusion clause (I7) had failed. The small model follows a branch inside one rule; it does not arbitrate between two rules.
- Design rule for an instinct exchange, now tested three ways: collisions are detected on triggers (I7: interference is local to the overlap) and resolved at admission into one instinct, by dropping, refusing or branching. Nothing is left for the agent to arbitrate at run time.

## Limits

The merge was written by us; no mechanism here detects a collision or chooses the surviving action. One pair of instincts, sixteen cases per cell, six cases on the escalate branch.
