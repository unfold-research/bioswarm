# LI2 preregistration: coordinating through the field or through conversation, on a shared project schedule (2026-11-17)

**Status:** registered 2026-11-17 by the research lead (Claude Opus 5.5) before any LI2 result, while LI1 (`tasks/LI1-LATERAL-INHIBITION-PREREG.md`) was running and before any LI1 repair round had returned. Haiku 5.5, Message Batches API, shared ledger. Instrument: `observatory/batch2/ne/sched.mjs`, `run-gen.mjs`, config `li2.json`. Study cap [US$ redacted] [US$ redacted] per wave.

## Why

A prior-art check made on 2026-11-17 (summarised in `results/li1-lateral-inhibition/PRIOR-ART.md`) found that giving each conflict to one side is the classical remedy of distributed constraint satisfaction (distributed breakout, MGM; random activation is DSA), and that LLM agents left alone loop on colouring (LoopBench, arXiv:2512.13713). LI1 asks whether the classical remedy transfers to LLM members. LI2 asks the question the LLM literature has not compared: most multi-agent LLM frameworks coordinate **by conversation**, agents negotiating who changes what. Here the alternative is **the field**: the environment computes violations, a rule decides who acts, and members never talk.

## Task

A project of n work items (n in {96, 192}, 12 cases each, seeds 2000 to 2011) owned by teams of 12 items (8 and 16 teams). Each item has a duration of 1 to 4 weeks; a team works on one item at a time; about 1.6n dependencies (70% across teams) say an item starts after another ends; everything ends by a horizon H (about 44 weeks) taken from a planted feasible schedule plus one week. In free pilots one Haiku planning the whole project solved 3 of 3 at 48 items and 0 of 6 at 96 and 192 (truncated at 32,000 output tokens or gave up). Violations are computed by code. Members own one team's items (the territory is the team, not a partition chosen here).

## Arms

Same as LI1 (`sync`, `inhibit`, `random`, `patch`, `central`, `solo`, shared round 0 for all but `solo`), plus:

| Arm | Who acts | Signal |
|---|---|---|
| `chat` | every team with a violation on one of its items (as `sync`) | its violations, **plus** the messages other planners sent it last round; it may send up to 3 messages of at most 40 words to planners it names (it is told which planner owns each neighbouring item) |

## Hypotheses (24 cases per arm, paired)

- **H-LI5 (the field beats conversation).** `inhibit` solves at least as many cases as `chat` at no more than 0.8 times `chat`'s output tokens per case. Supported if so; refuted if `chat` solves at least 4 more cases than `inhibit`; otherwise inconclusive.
- **H-LI6 (transfer of LI1 to a second domain).** `inhibit` solves at least 4 more cases than `sync` and at least 3 more than `random`. Refuted if it solves no more than either.
- **H-LI7 (past one agent).** The better swarm arm (of `inhibit`, `patch`) solves more of the 24 cases than `central`. Refuted if `central` solves as many or more.

Outcomes, analysis script (`analyze-li.mjs`) and limits as in LI1. Messages sent and how many members acted on a message are reported for `chat`.

## Addendum, same day, before any result: LI3 (the same comparison on colouring)

`li3.json`: colouring as LI1 (n in {120, 240}, 12 cases each, seeds 3000 to 3011), arms `sync`, `inhibit`, `chat` only, results `results/li3-colour-field-vs-chat/`. H-LI5 is tested again there with the same thresholds (H-LI5b); support needs both domains.
