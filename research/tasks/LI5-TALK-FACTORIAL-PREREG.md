# LI5 preregistration: what conversation adds, and whether a typed request on the field carries it (2026-11-17)

**Status:** registered 2026-11-17 by the research lead after reading LI1 and LI3 results and LI2 interim trajectories (round 6 of 8), before any LI5 result. Haiku 5.5, Message Batches API, shared ledger. Config `observatory/batch2/ne/li5.json`, runner `run-gen3.mjs`. Study cap [US$ redacted]

## Why

On colouring (LI3) members that negotiate by messages did barely better than members that do not coordinate (median ratio 0.79) and worse than silent inhibition in 24 of 24 cases. On the shared schedule (LI2, interim) the order reversed: conversation reached the fewest violations of any swarm arm, at about 1.7 times the tokens of inhibition. The working explanation: colouring constraints are symmetric (every request is "you change"), while a schedule request carries a direction and an amount ("end W12 by week 17") that the field does not. Two things are confounded in the `chat` arm: it acts like `sync` (both sides act) and it talks. LI5 separates them, and tests a bio-inspired third option: a **typed request left on the field** (item and wanted change, at most 12 words), seen by the item's owner next round, with inhibition deciding who acts. This is the analogue of a directed recruitment signal (the honeybee vibration signal) rather than a conversation.

## Design

Schedule as LI2, fresh cases: n in {96, 192}, 12 each, seeds 5000 to 5011, shared round 0, 8 rounds. Arms (2 x 2 plus one):

| Arm | Who changes values | Talk |
|---|---|---|
| `sync` | every team touched by a violation | none |
| `inhibit` | one side per cross-team violation | none |
| `chat` | every team touched | free messages (as LI2) |
| `chatinhibit` | one side per cross-team violation; the other side is told to hold | every team touched may message |
| `ask` | one side per cross-team violation | typed requests on foreign items only |

## Outcomes and hypotheses (24 cases, paired)

Primary: final violations (the solved count is reported; LI1 to LI3 showed that zero within 8 rounds is rare). Secondary: output tokens per case.

- **H-LI11 (talk helps on a schedule).** `chat` ends below `sync` in at least 16 of 24 paired cases. Refuted if in 12 or fewer.
- **H-LI12 (talk and inhibition add).** `chatinhibit` ends below both `chat` and `inhibit` in at least 15 of 24 paired cases each. Refuted if it ends below either in 12 or fewer.
- **H-LI13 (a typed request carries what talk carries).** `ask` ends at or below `chat` in at least 12 of 24 paired cases, at no more than 0.75 times `chat`'s output tokens per case. Refuted if `ask` ends below `chat` in 8 or fewer, or costs more than `chat`.
