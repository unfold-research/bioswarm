# T2 stage A, second gate: one Haiku agent falls steadily from 1 to 16 shards, and is not at ceiling on one

Preregistration `tasks/T2A2-GATE-SMALL-PREREG.md`. Run 2026-11-12: study `t2-gate-small`, 240 requests in one wave, Claude Haiku 5.5 with thinking disabled, no invalid and no cut reply, [US$ redacted] (shared ledger at [US$ redacted] of 50). Analysis: `node observatory/batch2/t2-gate-small/analyze.mjs` → `analysis.json` here.

One agent receives every shard of an instance and has to give the exact integer. Right answers out of 12:

| Task | 1 shard | 2 | 4 | 8 | 16 |
|---|---|---|---|---|---|
| I-01 Global Max | 12 | 12 | 12 | 12 | 12 |
| I-05 Range Count | 12 | 9 | 5 | 3 | 0 |
| I-06 XOR Checksum | 5 | 0 | 2 | 2 | 0 |
| III-22 Global Median | 9 | 10 | 3 | 1 | 1 |
| **All, of 48** | **38 (0.79)** | **31 (0.65)** | **22 (0.46)** | **18 (0.38)** | **13 (0.27)** |
| Replies that declare an estimate | 0 | 0 | 1 | 11 | 11 |
| Mean output tokens | 151 | 271 | 482 | 737 | 886 |

| Registered rule | Result |
|---|---|
| small: the largest size at 0.9 or above | **none** (0.79 on one shard) |
| Outcome | **this agent is not at ceiling even on one shard; the single-agent arm is revised (thinking or a larger model), not the sizes** |

| Expectation | Result |
|---|---|
| P1 at 16 shards the three shared tasks reproduce the first gate (at most 6 of 36) | **holds**: 1 of 36 (the first gate had 2) |
| P2 Global Max at 0.9 or above at every size | **holds**: 12 of 12 everywhere |
| P3 declared estimates grow with size | **holds**: 0, 0, 1, 11, 11 of 48 |

## Reading

- **The curve the design needed exists, between 1 and 16 shards.** Over all tasks the agent goes 0.79, 0.65, 0.46, 0.38, 0.27. The first gate sat entirely on the flat tail of this curve.
- **The tasks behave in three different ways**, and the pooled share mixes them:
  - Global Max never falls. Reading a list for its largest value is within one call at every size tested. It is the task on which a trigger should stay quiet.
  - Range Count is the clean case: 12 of 12 on one shard (30 numbers), then 9, 5, 3, 0. The error grows slowly (0.3, 1.2, 2.7 off on average) until 16 shards, where it jumps to 38: the agent is counting and losing a few, then gives up.
  - XOR Checksum is never good: 5 of 12 on one shard of 20 values. Twenty chained XORs by hand are beyond this agent whatever the size. It is what keeps the pooled share below 0.9 on one shard.
  - Global Median holds for two shards (9 and 10 of 12) and collapses at four, where the agent begins to declare estimates (11 of 12 at eight shards).
- **Work first rises, then stops.** Output grows from 151 to 886 tokens while the agent still attempts the task, far below the 8,192 available. On the median it falls back to 113 tokens at 16 shards: it has stopped trying. The first gate showed the same from 64 shards up.
- **The declared estimate tracks the failure.** Nothing declared at one and two shards, 11 of 48 at eight and at sixteen, almost all on the median. On Range Count and XOR the agent keeps working and is silently wrong, so the signal covers one kind of failure and not the other.
- **The 16-shard result replicates** on the three tasks shared with the first gate, with the same instances: 1 of 36 here, 2 of 36 there.

## What it means for T2

By the registered rule the gate is still closed, and the consequence written in advance is to revise the agent and not the sizes: a single agent that is wrong on one shard in a fifth of the cases is not a fair "one agent with the whole budget". The next gate is the same instances with thinking enabled.

Two things are learned for the design whatever that gate returns:
- The range in which size matters for this model is 1 to 16 shards, not 16 to 1,024. The map belongs there, and it is about a hundred times cheaper than estimated.
- A pooled share over tasks is the wrong gate. The tasks split into one that never needs help, ones that fall with size and one that fails at any size, and that split is itself the map of where a trigger should fire. The next preregistration should decide per task.

Limits: one model, one wording, thinking disabled, 12 instances per cell, so about ±0.14 on a pooled share and far wider per task. The estimate count is a word match, fixed before this run. The task set differs from the first gate's.
