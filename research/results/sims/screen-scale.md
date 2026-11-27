---
id: screen-scale
title: Free simulation screen of two traits at scale (context limit)
area: simulation
evidence: local-validation
summary: 1 of 2 traits (SIG-06, ACT-06) advance past the free screen at M = 400 with a context limit of C = 8.
---

# Free screen: traits at scale with a context limit (v1.0.0)

Level L0 of the evidence ladder (`programs/coordination.md`). An abstract repair task on a ring of M modules in connected components of 4 to 24, with dependencies at distance up to 3; N = M/4 agents, 16 rounds, one attempt per agent per round, and each agent may read at most C = 8 modules per round. GN-S2 of `Shared/unfold/genoma/GN-PLAN.md`, parameters fixed there before any code.

**Rule (fixed before the first run).** A trait advances to a paid study only if, at M = 400, the mechanism beats the strongest baseline by at least +0.05 in the final solved-and-correct share (95% CI of the paired difference above 0); at M = 1000 the mean paired difference against the strongest baseline does not change sign (stays above 0); and in the control (M = 40) it does not lose more than 0.05 to the strongest baseline (lower 95% CI of the paired difference at or above -0.05). The strongest baseline is the arm with the highest mean share in that cell. For SIG-06 the baselines are the global board and the manager; for ACT-06 they also include spreading agents evenly and one agent per component. Seeds paired across arms; 400 runs per cell. M = 160 and every other table are exploratory.

## Decision

| Trait | Mechanism | M = 400 vs strongest (95% CI) | Strongest | M = 1000 vs strongest | M = 40 vs strongest (95% CI) | Advance |
|---|---|---|---|---|---|---|
| SIG-06 | local | +0.218 (+0.215 to +0.222) | manager | +0.238 (vs manager) | +0.068 (+0.055 to +0.081) | yes |
| ACT-06 | teams | +0.043 (+0.039 to +0.048) | spread | +0.039 (vs spread) | +0.038 (+0.024 to +0.053) | no |

## Why

- SIG-06 (local): advance, beats the strongest baseline at M = 400, keeps the sign at M = 1000 and costs little at M = 40. Exploratory M = 160: +0.179 vs manager.
- ACT-06 (teams): stop, no gain of +0.05 over the strongest baseline at M = 400. Exploratory M = 160: +0.040 vs spread.

## All arms (exploratory tables; the decision uses only the cells above)

| M | Arm | Share (95% CI) | Rounds to zero | Modules read per agent per round |
|---|---|---|---|---|
| 40 | board | 0.254 (0.245 to 0.263) | 17.0 | 40.0 |
| 40 | manager | 0.283 (0.274 to 0.293) | 17.0 | 7.3 |
| 40 | local | 0.351 (0.339 to 0.364) | 17.0 | 7.0 |
| 40 | teams | 0.380 (0.366 to 0.393) | 17.0 | 4.0 |
| 40 | spread | 0.342 (0.329 to 0.354) | 17.0 | 5.4 |
| 40 | percomp | 0.291 (0.281 to 0.301) | 17.0 | 2.3 |
| 160 | board | 0.148 (0.145 to 0.151) | 17.0 | 160.0 |
| 160 | manager | 0.160 (0.157 to 0.163) | 17.0 | 7.8 |
| 160 | local | 0.339 (0.333 to 0.345) | 17.0 | 7.0 |
| 160 | teams | 0.355 (0.349 to 0.361) | 17.0 | 4.0 |
| 160 | spread | 0.315 (0.309 to 0.320) | 17.0 | 5.4 |
| 160 | percomp | 0.276 (0.271 to 0.281) | 17.0 | 2.2 |
| 400 | board | 0.109 (0.108 to 0.110) | 17.0 | 400.0 |
| 400 | manager | 0.116 (0.114 to 0.117) | 17.0 | 7.9 |
| 400 | local | 0.334 (0.330 to 0.338) | 17.0 | 7.0 |
| 400 | teams | 0.353 (0.350 to 0.357) | 17.0 | 4.0 |
| 400 | spread | 0.310 (0.306 to 0.314) | 17.0 | 5.5 |
| 400 | percomp | 0.273 (0.270 to 0.276) | 17.0 | 2.1 |
| 1000 | board | 0.087 (0.087 to 0.088) | 17.0 | 1000.0 |
| 1000 | manager | 0.091 (0.090 to 0.091) | 17.0 | 8.0 |
| 1000 | local | 0.329 (0.327 to 0.331) | 17.0 | 7.0 |
| 1000 | teams | 0.345 (0.343 to 0.347) | 17.0 | 4.0 |
| 1000 | spread | 0.306 (0.303 to 0.308) | 17.0 | 5.5 |
| 1000 | percomp | 0.269 (0.267 to 0.271) | 17.0 | 2.1 |

## How the parameters became code (fixed before the first run)

- World: the ring is cut into contiguous components with sizes drawn uniformly from 4 to 24 (a last piece under 4 joins the previous component). Inside a component every module except the first depends on one earlier module of the same component at ring distance 1 to 3 (so the component is connected), and with probability 0.5 on a second distinct one; dependencies never cross components. A module counts as correct only once it is solved and all its dependencies are correct (as in S1).
- Knowledge: an agent may attempt a module only if it read the module and all its dependencies in this round or the previous one, and it saw the dependencies solved. Reads are made at the start of the round, before any attempt. A read costs one module; the read limit is C = 8 per agent per round.
- Global board: each agent reads C modules drawn at random among the M; the read-cost secondary counts M per agent per round, as the plan says.
- Manager: one agent (counted in N) reads a window of C consecutive modules per round, sweeping the ring from module 0, and hands each ready module it found to an idle worker (at most C per round); a handed module counts as read by that worker. Workers without a hand-off behave as on the global board.
- SIG-06: agents start evenly spread on the ring; each round an agent reads its current module and the 6 neighbours at ring distance 1 to 3 (7 reads), attempts its current module if ready, else a ready module among those read (nearest first), and moves its current module there; with nothing ready and its current module solved, it moves 7 modules clockwise.
- ACT-06: components are taken in ring order; a component of size s gets a team of ceil(s/C) free agents and is worked only once that whole team is formed. A team shares its reads: each member reads up to C modules of its component (the team covers it whole), and each member attempts a different ready module. When a component is correct its team is released to the next unteamed component. Agents that cannot complete a team wait.
- Spread evenly (ACT-06 baseline): each agent owns a contiguous slice of M/N = 4 modules and reads the modules of its slice that are not yet correct, each preceded by its dependencies, up to C reads; when its slice is correct it takes the next slice clockwise that is not correct.
- One agent per component (ACT-06 baseline): components in ring order get one agent each while agents last; the agent reads the modules of its component that are not yet correct in ring order, each preceded by its dependencies, up to C reads, and attempts one ready module; when the component is correct it takes the next unassigned component. Spare agents wait.
- Success: an attempt succeeds with min(1, pBase * skill), skill 1.0 on the agent type (agent index mod T) and 0.35 otherwise, as in S1. Rounds to zero is the first round with every module correct, R + 1 if never.

