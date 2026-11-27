---
id: screen-loss
title: Free simulation screen of three traits against permanent member loss
area: simulation
evidence: local-validation
summary: 0 of 3 traits (ACT-04, DEF-06, REG-05) advance past the free screen against 30% permanent member loss.
---

# Free screen: traits against permanent member loss (v1.0.0)

Level L0 of the evidence ladder (`programs/coordination.md`). An abstract repair task: 40 modules with coupled dependencies and one owner each, 10 agents, a fixed number of rounds, one attempt per acting agent per round. In the premise 30% of the members leave for good in the first third; the control keeps everyone. Each trait is the smallest mechanism that could keep the work going. GN-S1 of `Shared/unfold/genoma/GN-PLAN.md`.

**Rule (fixed before the first run).** A trait advances to a paid study only if, in the loss premise, the mechanism beats the stronger of the plain and manager baselines by at least +0.05 in the final solved-and-correct share (the 95% CI of the paired difference above 0) and, in the control (no loss), does not lose more than 0.05 to the plain baseline (lower 95% CI of the paired difference at or above -0.05). Seeds are paired across arms; 400 runs per cell; the number of agents is equal across arms (reserve and manager count in the total).

**Baselines.** plain: a survivor with no ready owned module takes a random open module, orphaned modules included; orphans wait until someone takes them. manager: one agent never writes and reassigns orphaned modules to idle survivors each round, with a 20% stale view (it may reassign a non-orphan or miss).

## Decision (premise: 30% permanent loss)

| Trait | Mechanism | Plain | Manager | Mechanism | vs strongest (95% CI) | Control vs plain | Advance |
|---|---|---|---|---|---|---|---|
| ACT-04 | reserve | 0.752 | 0.747 | 0.754 | +0.003 (-0.014 to +0.019) | -0.138 | no |
| DEF-06 | twoowner | 0.757 | 0.739 | 0.746 | -0.011 (-0.029 to +0.006) | -0.002 | no |
| REG-05 | recruit | 0.760 | 0.746 | 0.735 | -0.025 (-0.043 to -0.008) | +0.003 | no |

## Why

- ACT-04 (reserve): stop, no gain over the strongest baseline under loss.
- DEF-06 (twoowner): stop, no gain over the strongest baseline under loss.
- REG-05 (recruit): stop, no gain over the strongest baseline under loss.

## Parameter sweep (premise, difference vs plain baseline; exploratory, not part of the rule)

| Trait | Parameter | Value | Diff vs plain (95% CI) |
|---|---|---|---|
| ACT-04 | wakeThr | 1 | +0.003 (-0.014 to +0.019) |
| ACT-04 | wakeThr | 3 | +0.003 (-0.014 to +0.019) |
| ACT-04 | wakeThr | 6 | -0.011 (-0.028 to +0.006) |
| DEF-06 | silentRounds | 1 | -0.011 (-0.029 to +0.006) |
| DEF-06 | silentRounds | 2 | -0.011 (-0.029 to +0.006) |
| DEF-06 | silentRounds | 3 | -0.011 (-0.029 to +0.006) |
| REG-05 | lossShare | 0.2 | -0.024 (-0.040 to -0.007) |
| REG-05 | lossShare | 0.3 | -0.025 (-0.043 to -0.008) |
| REG-05 | lossShare | 0.45 | -0.009 (-0.024 to +0.006) |

Model: a module has a type, a base success chance and at most one coupled dependency (it counts as correct only once its dependency is correct). An attempt succeeds with the base chance times the agent's skill for the type. In the premise, 30% of agents (never the reserve) die at seeded rounds in the first third; their unfinished modules are orphaned. Headcount is equal across arms. Numbers are solved-and-correct share at the final round over 400 paired runs.

