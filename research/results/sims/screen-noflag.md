---
id: screen-noflag
title: Free simulation screen of the six genome traits without a flag
area: simulation
evidence: local-validation
summary: 1 of 6 traits (FLD-04) clear the preregistered screen; a screen is L0, not a result.
---

# Free simulation screen of the six traits without a flag (v1.0.0)

Level L0 of the evidence ladder in `programs/coordination.md`. An abstract repair task: 40 modules, 8 agents, a fixed number of rounds, one attempt per agent per round. Each trait is turned into the smallest mechanism that expresses it and compared with the strongest generic baseline. The abstraction decides what a trait can do, so a pass means "worth a paid study with real agents", and a fail means "this simulation gives no reason to spend".

**Rule (fixed before the first run).** A trait advances to a paid study only if, in its premise scenario, the mechanism beats the stronger of the plain baseline and the matched audit baseline by at least +0.05 in the final share of modules solved and correct (95% CI of the paired difference above 0), and in its control scenario, where the premise is absent, it does not lose more than 0.05 to the plain baseline (lower 95% bound of the paired difference at or above -0.05).

**Baselines.** plain: every agent fixes a random open module. audit: same, but two agents verify a random solved module each round (the generic "add a checker" baseline, matched in headcount to the checking mechanisms).

| Trait | Mechanism | Premise scenario | Plain | Audit | Mechanism | Diff vs strongest baseline (95% CI) | Control diff vs plain (95% CI) | Screen |
|---|---|---|---|---|---|---|---|---|
| FLD-04 | learn | N=8, M=40, R=14, specialist skills | 0.673 | - | 0.817 | +0.144 (+0.127 to +0.161) | -0.009 (-0.022 to +0.004) | **advance** |
| DOL-02 | poly | N=8, M=40, R=12, uneven difficulty, 25% faulty writers | 0.596 | 0.477 | 0.489 | -0.107 (-0.119 to -0.095) | -0.200 (-0.215 to -0.185) | **stop** |
| DOL-03 | germ | N=8, M=40, R=12, 25% faulty writers | 0.661 | 0.491 | 0.445 | -0.216 (-0.229 to -0.203) | -0.252 (-0.265 to -0.239) | **stop** |
| DOL-04 | leader | N=16, M=24, R=3 | 0.649 | - | 0.562 | -0.088 (-0.105 to -0.071) | -0.068 (-0.077 to -0.059) | **stop** |
| DEF-03 | quarantine | N=8, M=40, R=12, 25% faulty writers | 0.653 | 0.497 | 0.420 | -0.233 (-0.248 to -0.218) | -0.274 (-0.290 to -0.258) | **stop** |
| DEF-05 | sacrifice | N=8, M=40, R=12, 25% faulty writers | 0.667 | 0.498 | 0.560 | -0.107 (-0.122 to -0.092) | -0.002 (-0.018 to +0.014) | **stop** |

## Why

- FLD-04 (learn): advance, beats the strongest baseline where the premise holds and costs little where it does not.
- DOL-02 (poly): stop, does not beat the plain baseline by 0.05 where the premise holds (diff -0.107, CI -0.119 to -0.095).
- DOL-03 (germ): stop, does not beat the plain baseline by 0.05 where the premise holds (diff -0.216, CI -0.229 to -0.203).
- DOL-04 (leader): stop, does not beat the plain baseline by 0.05 where the premise holds (diff -0.088, CI -0.105 to -0.071).
- DEF-03 (quarantine): stop, does not beat the plain baseline by 0.05 where the premise holds (diff -0.233, CI -0.248 to -0.218).
- DEF-05 (sacrifice): stop, does not beat the plain baseline by 0.05 where the premise holds (diff -0.107, CI -0.122 to -0.092).

## Reading

Registered rule: only FLD-04 (individual learning) advances. Specialists that remember what they are good at beat random assignment by a wide margin where skills differ, and cost nothing where they do not. The other five stop under the rule: in this model a check, a scout or a gatekeeper uses an agent that could have fixed a module, and a faulty writer only ruins its own module, so the checking traits cannot pay. That is a property of the model, not of the traits. The exploratory contagion table adds spread (a broken module breaks others); with spread of 0.3 or more, the gate of DOL-03 and the sacrificial guards of DEF-05 start to beat the strongest baseline, and the lead is clearest when checks cost a full round. Quarantine (DEF-03) never does, because inspection false alarms bench healthy members. DOL-02 never does. DOL-04 loses by the cost of its idle leader and stale view (see the sweep), which matches the real-agent result that a manager is a strong but not a cheaper arm. So: FLD-04 is worth a paid study now; DOL-03 and DEF-05 are worth one only on tasks where a bad edit spreads (a bad fix that breaks its callers does); DOL-02, DOL-04 and DEF-03 are not supported by this screen. Run history: the first run used a leader capped at six assignments per round and a three-times longer leader scenario at a ceiling; both were changed after that run (leader uncapped, scenario shortened until the plain baseline was between 0.3 and 0.8), and the contagion and cheap-check tables were added after the first results showed the model could not value defence. The decisions in the first table come from the rule above and were not altered.


## Cost parameter sweep (premise scenario, diff vs plain baseline)

| Trait | Parameter | Value | Diff vs plain (95% CI) |
|---|---|---|---|
| FLD-04 | eps | 0.1 | +0.163 (+0.145 to +0.180) |
| FLD-04 | eps | 0.25 | +0.144 (+0.127 to +0.161) |
| FLD-04 | eps | 0.5 | +0.111 (+0.094 to +0.127) |
| DOL-02 | E | 1 | -0.075 (-0.088 to -0.063) |
| DOL-02 | E | 2 | -0.107 (-0.119 to -0.095) |
| DOL-02 | E | 3 | -0.135 (-0.145 to -0.124) |
| DOL-03 | K | 1 | -0.409 (-0.420 to -0.398) |
| DOL-03 | K | 2 | -0.216 (-0.229 to -0.203) |
| DOL-03 | K | 3 | -0.255 (-0.269 to -0.241) |
| DOL-04 | L | 4 | -0.489 (-0.504 to -0.475) |
| DOL-04 | L | 8 | -0.343 (-0.359 to -0.327) |
| DOL-04 | L | 15 | -0.088 (-0.105 to -0.071) |
| DEF-03 | S | 1 | -0.320 (-0.336 to -0.304) |
| DEF-03 | S | 2 | -0.233 (-0.248 to -0.218) |
| DEF-03 | S | 3 | -0.212 (-0.227 to -0.198) |
| DEF-05 | G | 1 | -0.070 (-0.085 to -0.055) |
| DEF-05 | G | 2 | -0.107 (-0.122 to -0.092) |
| DEF-05 | G | 3 | -0.142 (-0.158 to -0.126) |

## Where the faulty-writer premise starts to pay, and what a cheap check does (exploratory, not part of the rule)

| Trait | Checks per round | Faulty writers | Plain | Audit | Mechanism | Diff vs strongest baseline (95% CI) |
|---|---|---|---|---|---|---|
| DOL-02 | 1 | 12.5% | 0.652 | 0.517 | 0.530 | -0.122 (-0.134 to -0.110) |
| DOL-02 | 1 | 25% | 0.594 | 0.472 | 0.489 | -0.105 (-0.117 to -0.093) |
| DOL-02 | 1 | 50% | 0.490 | 0.388 | 0.404 | -0.087 (-0.097 to -0.076) |
| DOL-02 | 1 | 75% | 0.381 | 0.312 | 0.322 | -0.059 (-0.071 to -0.048) |
| DOL-02 | 4 | 12.5% | 0.642 | 0.500 | 0.535 | -0.108 (-0.119 to -0.096) |
| DOL-02 | 4 | 25% | 0.594 | 0.472 | 0.500 | -0.094 (-0.105 to -0.083) |
| DOL-02 | 4 | 50% | 0.481 | 0.401 | 0.426 | -0.055 (-0.066 to -0.044) |
| DOL-02 | 4 | 75% | 0.381 | 0.328 | 0.330 | -0.051 (-0.060 to -0.041) |
| DOL-03 | 1 | 12.5% | 0.722 | 0.540 | 0.488 | -0.234 (-0.247 to -0.221) |
| DOL-03 | 1 | 25% | 0.665 | 0.502 | 0.454 | -0.211 (-0.224 to -0.198) |
| DOL-03 | 1 | 50% | 0.542 | 0.410 | 0.369 | -0.173 (-0.185 to -0.160) |
| DOL-03 | 1 | 75% | 0.417 | 0.317 | 0.290 | -0.127 (-0.138 to -0.116) |
| DOL-03 | 4 | 12.5% | 0.723 | 0.533 | 0.541 | -0.182 (-0.196 to -0.168) |
| DOL-03 | 4 | 25% | 0.659 | 0.497 | 0.504 | -0.155 (-0.169 to -0.141) |
| DOL-03 | 4 | 50% | 0.544 | 0.408 | 0.414 | -0.130 (-0.144 to -0.116) |
| DOL-03 | 4 | 75% | 0.430 | 0.320 | 0.317 | -0.113 (-0.124 to -0.101) |
| DEF-03 | 1 | 12.5% | 0.723 | 0.539 | 0.465 | -0.258 (-0.274 to -0.242) |
| DEF-03 | 1 | 25% | 0.671 | 0.502 | 0.427 | -0.244 (-0.259 to -0.229) |
| DEF-03 | 1 | 50% | 0.552 | 0.406 | 0.334 | -0.218 (-0.233 to -0.204) |
| DEF-03 | 1 | 75% | 0.425 | 0.317 | 0.240 | -0.185 (-0.198 to -0.173) |
| DEF-03 | 4 | 12.5% | 0.706 | 0.546 | 0.258 | -0.449 (-0.466 to -0.431) |
| DEF-03 | 4 | 25% | 0.667 | 0.493 | 0.215 | -0.452 (-0.468 to -0.437) |
| DEF-03 | 4 | 50% | 0.544 | 0.406 | 0.154 | -0.390 (-0.403 to -0.376) |
| DEF-03 | 4 | 75% | 0.432 | 0.318 | 0.089 | -0.343 (-0.355 to -0.331) |
| DEF-05 | 1 | 12.5% | 0.720 | 0.538 | 0.641 | -0.080 (-0.095 to -0.064) |
| DEF-05 | 1 | 25% | 0.661 | 0.498 | 0.567 | -0.094 (-0.109 to -0.079) |
| DEF-05 | 1 | 50% | 0.552 | 0.403 | 0.444 | -0.108 (-0.121 to -0.095) |
| DEF-05 | 1 | 75% | 0.432 | 0.325 | 0.338 | -0.094 (-0.106 to -0.082) |

## With contagion (exploratory, 25% faulty writers; each broken module breaks another solved module with chance kappa per round)

| Trait | Checks per round | kappa | Plain | Audit | Mechanism | Diff vs strongest baseline (95% CI) |
|---|---|---|---|---|---|---|
| DOL-03 | 1 | 0.1 | 0.582 | 0.467 | 0.439 | -0.143 (-0.157 to -0.128) |
| DOL-03 | 1 | 0.3 | 0.371 | 0.367 | 0.394 | +0.024 (+0.005 to +0.042) |
| DOL-03 | 1 | 0.6 | 0.153 | 0.202 | 0.326 | +0.124 (+0.103 to +0.145) |
| DOL-03 | 4 | 0.1 | 0.584 | 0.484 | 0.482 | -0.102 (-0.117 to -0.086) |
| DOL-03 | 4 | 0.3 | 0.361 | 0.442 | 0.431 | -0.010 (-0.025 to +0.005) |
| DOL-03 | 4 | 0.6 | 0.134 | 0.357 | 0.351 | -0.006 (-0.029 to +0.017) |
| DEF-03 | 1 | 0.1 | 0.585 | 0.457 | 0.396 | -0.189 (-0.204 to -0.174) |
| DEF-03 | 1 | 0.3 | 0.362 | 0.371 | 0.326 | -0.045 (-0.063 to -0.027) |
| DEF-03 | 1 | 0.6 | 0.146 | 0.219 | 0.170 | -0.049 (-0.070 to -0.028) |
| DEF-03 | 4 | 0.1 | 0.584 | 0.485 | 0.209 | -0.374 (-0.390 to -0.359) |
| DEF-03 | 4 | 0.3 | 0.365 | 0.437 | 0.192 | -0.245 (-0.261 to -0.229) |
| DEF-03 | 4 | 0.6 | 0.136 | 0.350 | 0.151 | -0.199 (-0.217 to -0.181) |
| DEF-05 | 1 | 0.1 | 0.579 | 0.463 | 0.515 | -0.064 (-0.080 to -0.048) |
| DEF-05 | 1 | 0.3 | 0.369 | 0.361 | 0.426 | +0.057 (+0.035 to +0.078) |
| DEF-05 | 1 | 0.6 | 0.146 | 0.225 | 0.286 | +0.061 (+0.035 to +0.087) |
| DEF-05 | 4 | 0.1 | 0.589 | 0.487 | 0.532 | -0.057 (-0.074 to -0.040) |
| DEF-05 | 4 | 0.3 | 0.365 | 0.443 | 0.419 | -0.023 (-0.042 to -0.004) |
| DEF-05 | 4 | 0.6 | 0.132 | 0.359 | 0.280 | -0.079 (-0.103 to -0.054) |

Model: modules have a type and a base success chance; an attempt succeeds with base chance times the agent's skill; a faulty writer's success is silently broken with chance 0.6 and does not count at the end; a check finds a broken module with chance 0.8. `learn` remembers success per type (FLD-04); `poly` scouts, then fixes easy first, then verifies (DOL-02); `germ` lets only 2 agents commit after checking candidates (DOL-03); `leader` has one non-working agent assigning distinct modules with 20% stale view (DOL-04); `quarantine` has agents inspect each other, strike authors and bench them at two strikes (DEF-03); `sacrifice` has two guards that each block one bad write and are then lost (DEF-05). Seeds are paired across arms; 400 runs per cell. Reproduce with `node sims/screen-noflag.mjs`.

