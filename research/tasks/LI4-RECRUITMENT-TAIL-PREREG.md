# LI4 preregistration: does stimulus-centred recruitment finish the work? (2026-11-17)

**Status:** registered 2026-11-17 by the research lead after LI1 and LI3 results were read (so this is a follow-up, not a confirmation of a prior prediction) and before any LI4 result. Haiku 5.5, Message Batches API, shared ledger. Config `observatory/batch2/ne/li4.json`, runner `run-gen2.mjs` (run-gen plus `patch2`). Study cap [US$ redacted]

## Why

In LI1 no swarm arm reached zero conflicts in 8 rounds (H-LI1 to H-LI3 refuted on the primary endpoint), while stimulus-centred recruitment (`patch`) ended below the central agent in 12 of 12 cases at 240 nodes (median ratio 0.36) at about 1.2 times its output tokens. The open question is the tail: does recruitment finish the work with more rounds, and does recruiting a wider neighbourhood (radius 2) help with the last conflicts, which are the ones a radius-1 patch cannot move?

## Design

Colouring as LI1, fresh cases: n in {120, 240}, 12 each, seeds 4000 to 4011, shared round 0, **16 repair rounds**. Arms: `patch` (radius 1, as LI1), `patch2` (radius 2, cap 40 nodes), `central` (as LI1).

## Hypotheses (24 cases, paired)

- **H-LI8 (recruitment finishes).** `patch` or `patch2` solves at least 8 of 24 cases within 16 rounds. Refuted if neither solves more than 2.
- **H-LI9 (past one agent, replication).** At n = 240, `patch` ends below `central` in at least 9 of 12 paired cases. Refuted if in 6 or fewer.
- **H-LI10 (wider recruitment for the tail).** `patch2` solves more cases than `patch`. Refuted if it solves fewer or the same.
