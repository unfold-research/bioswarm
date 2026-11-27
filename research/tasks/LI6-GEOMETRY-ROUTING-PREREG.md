# LI6 preregistration: routing each conflict by its geometry (2026-11-17)

**Status:** registered 2026-11-17 by the research lead after reading LI1 to LI5, before any LI6 result. Haiku 5.5, Message Batches API, shared ledger ([US$ redacted] committed before this study). Config `observatory/batch2/ne/li6.json`, domain `sched2.mjs`, runner `run-gen4.mjs`. Study cap [US$ redacted]

## Why

LI1 to LI5 found no universal coordination protocol for LLM members. On **symmetric** cross-owner constraints (colouring: either side can fix a conflict), simultaneous repair oscillates, messaging does not cure it (silent inhibition below messaging in 24 of 24, LI3), and one-side-acts does (36 of 36, LI1). On **directed** constraints (dependencies: one side should move toward a target), messaging helps (below simultaneous repair in 18 of 24, LI2, and 20 of 24, LI5) and forcing one side to hold destroys that gain (messaging with inhibition worse than messaging in 20 of 24, LI5). The candidate rule for a harness is therefore not a protocol but a **router**: a symmetric conflict goes to one side, silently; a directed conflict goes to both sides, which may talk. A single-author preprint (arXiv:2601.08129) claims field coordination beats conversation in general; the router predicts that neither pure protocol wins when both geometries are present.

## Task

`sched2`: the shared schedule of LI2/LI5 plus **shared machines**: about 40% of items use one of k/2 machines and two items on the same machine may not overlap, whatever their team (a symmetric cross-team constraint; 67 to 169 machine pairs per case). Dependencies (directed) as before. Planted feasible schedule, checked to 0 violations. n in {96, 192}, 12 cases each, seeds 6000 to 6011, shared round 0, 8 rounds.

## Arms

| Arm | Symmetric (machine) conflict between teams | Directed (dependency) conflict between teams | Messages |
|---|---|---|---|
| `sync` | both act | both act | no |
| `inhibit` | one side | one side | no |
| `chat` | both act | both act | yes |
| `routed` | **one side** | **both act** | yes |
| `routedsilent` | one side | both act | no |

## Hypotheses (24 cases, paired final violations, two-sided sign test)

- **H-LI14 (the router beats both pure protocols).** `routed` ends below `chat` in at least 15 of 24 cases and below `inhibit` in at least 15 of 24. Refuted if it ends below either in 12 or fewer. Otherwise inconclusive.
- **H-LI15 (messages carry the directed part).** `routed` ends below `routedsilent` in at least 15 of 24. Refuted if in 12 or fewer.
- **H-LI16 (cost).** `routed` uses no more output tokens per case than `chat`. Refuted if it uses more than 1.1 times.
