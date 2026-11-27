# LI1 preregistration: lateral inhibition in parallel repair of a coupled task (2026-11-17)

**Status:** registered 2026-11-17 by the research lead (Claude Opus 5.5) under the owner's standing authorisation to run rounds while the shared ledger is under its cap ([US$ redacted]; [US$ redacted] committed before this study). Nothing paid had run at registration except the disclosed direct-API pilots below. Model: Claude Haiku 5.5 (adaptive thinking, default effort) through the Message Batches API. Instrument: `observatory/batch2/ne/` (`tasks.mjs`, `swarm.mjs`, `run-li.mjs`, config `li1.json`). Results: `results/li1-lateral-inhibition/`. Study cap [US$ redacted]; each wave capped at [US$ redacted] (the per-batch limit).

## Why this study

Every result in this lab so far says one agent with room to reason beats a collective of copies when the task fits it (V2 to V7, M4 to M8, T2). A swarm can only matter where the task does not fit one agent. Free and paid pilots of 2026-11-17 (disclosed, `results/li1-lateral-inhibition/PILOTS.md`) found such a regime: 3-colouring a planted graph of 60 to 240 nodes. One Haiku with adaptive thinking up to 32,000 output tokens solved 4 of 4 at 30 nodes, 2 of 4 at 60 and 1 of 4 at 120; at 240 its first colouring was truncated and eight rounds of central repair left 41 conflicts.

The pilots also showed the failure every parallel repair team has: when both sides of a conflict act at once, the fix on one side undoes the other, and the team **oscillates** (sync arm, 120 nodes: 59, 61, 56, 50, 59, 50, 63 conflicts over seven rounds). Giving each conflict to one side only (the other holds) took the same instance from 66 to 14. In biology this is lateral inhibition (Notch-Delta: of two neighbouring cells, one adopts the fate and inhibits the other) and the stop signal of honeybee scouts (Seeley et al. 2012). It has not been tested as a coordination rule for LLM agents against the obvious alternative explanation: that it helps only because fewer agents move at once.

## Task and members

A case is a random graph with a planted 3-colouring, n in {60, 120, 240}, 2.3n edges, 12 cases per size (seeds 1000 to 1011). Nodes are split into contiguous territories of about 15 nodes by breadth-first growth (4, 8 and 16 territories). A **member** sees only its territory: its internal edges, its boundary edges with the current colour of each foreign end (fixed for it), its own current colours and the conflicts it must resolve, and returns colours for its own nodes. The environment (code) computes conflicts; members never message each other.

**Round 0 is shared**: every territory is coloured once without marks, and every arm except `solo` starts from that same colouring, so arms are paired and differ only in the rule from round 1. Up to 8 repair rounds; an arm stops on a case when it has no conflict.

## Arms

| Arm | Who acts in a round | Signal |
|---|---|---|
| `sync` | every territory with a conflict on one of its nodes | all its conflicts |
| `inhibit` | conflicts inside a territory go to it; a conflict between two territories goes to **one** side, chosen by a hash of territory and round (so the side alternates); a territory acts only if it holds at least one conflict | its conflicts only |
| `random` | each territory that `sync` would wake, independently with probability 0.5 | all its conflicts |
| `patch` | stimulus-centred recruitment: each conflict recruits the conflicting nodes and their neighbours; overlapping groups merge; one member per group (at most 40 nodes), with no fixed territories | the group's conflicts |
| `central` | one agent with the whole graph, the current colouring and every conflict, returns a full colouring | all conflicts |
| `solo` | as `central`, but starting from its own one-shot colouring of the whole graph instead of the shared start | all conflicts |

`random` is the control for the alternative explanation: it wakes about as few members as `inhibit` but at random, so both sides of a conflict still act together a quarter of the time and a conflict goes untouched a quarter of the time.

## Outcomes

Primary: a case is **solved** when the final colouring has no conflict. Secondary: conflicts after each round, output tokens and estimated cost per case (shared start included in every arm that uses it), and a latency proxy, the sum over rounds of the largest output of any call in that round (parallel members run at once).

## Hypotheses and predictions (36 cases per arm, paired)

- **H-LI1 (inhibition beats simultaneous repair).** `inhibit` solves at least 6 more of 36 cases than `sync`, and its median final conflicts are lower. Refuted if `inhibit` solves no more than `sync`. Between, inconclusive.
- **H-LI2 (it is the targeting, not the thinning).** `inhibit` solves at least 4 more cases than `random`. Refuted if `random` solves as many or more. Between, inconclusive. This is the test the claim rests on.
- **H-LI3 (a swarm past the single agent).** At n = 240, the better of `inhibit` and `patch` solves more of 12 cases than `central`, at no more than 1.5 times `central`'s output tokens per case. Refuted if `central` solves as many or more.
- **H-LI4 (recruit to the stimulus).** `patch` solves at least as many cases as `inhibit` at fewer output tokens per case. Refuted if it solves fewer.

All four are tested on these 36 cases only; no hypothesis is pooled with the pilots. A wave that fails or truncates is kept: a failed call changes no colour. Analysis script: `observatory/batch2/ne/analyze-li.mjs`, written before the results are read and committed with them.

## Limits stated in advance

One model, one task family, synthetic graphs with a planted solution. A code heuristic solves these graphs instantly; the task stands for coupled work whose parts constrain each other at their interfaces (modules, sections of a spec, shifts of a rota), not for colouring as an application. Haiku's adaptive thinking decides its own depth, so tokens per call are an outcome, not a control.
