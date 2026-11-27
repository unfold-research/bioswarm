# D5 decay with power: decay helps, and all of it comes from how counts are combined, none from where workers go

Preregistration `tasks/D5-Q1-PREREG.md`. Run 2026-11-12: `d5-decay-l100`, `d5-decay-l50`, `d5-decay-l0`, 2,700 reads each on `claude-haiku-5-5` with thinking disabled, no invalid reply. Usage estimate [US$ redacted] Analysis: `node observatory/batch2/d5-decay/analyze.mjs` → `summary.json` here.

The R1 setting (six parts, one edited silently) and the R1 avoid-stigmergy rule, at three decay rates λ, on 150 new collections, with the same random stream for the three rates. λ = 1 is no decay; λ = 0.5 is R1's decay; λ = 0 keeps only the latest round.

| λ | Right, edited | Right, stable | Ties, edited | Exact readers, same collections | Exact readers, 3,000 collections |
|---|---|---|---|---|---|
| 1 (no decay) | 62 of 150 (0.41) | 150 (1.00) | 14% | 0.39 | 0.33 |
| 0.5 | 101 (0.67) | 146 (0.97) | 3% | 0.67 | 0.70 |
| 0 (latest only) | 112 (0.75) | 143 (0.95) | 3% | 0.74 | 0.74 |

Reads were exactly right in 0.86 of calls in every arm.

| Test | Result |
|---|---|
| P1 decay helps a stigmergic regime track a change (λ 0.5 against 1, edited) | **supported**: +0.26 (0.17 to 0.35) |
| P2 the same for full forgetting (λ 0 against 1) | **supported**: +0.33 (0.24 to 0.43) |
| P3 forgetting has a cost when nothing changed (λ 0 against 1, stable) | **supported**: −0.05 (−0.09 to −0.01) |
| P4 real readers shrink the simulated effect | supported as registered (0.26 is below 0.37) and nearly empty: exact readers on the same 150 collections give 0.29 |

Not registered as a test: λ 0 against λ 0.5 in the edited condition, +0.07 (0.01 to 0.13). With ties scored at half credit the two main differences are +0.20 (0.13 to 0.28) and +0.28 (0.20 to 0.36).

## Where the effect comes from (secondary, as registered)

Decay acts in two places in this rule: it fades the visit marks, which changes where workers go, and it weights recent counts more when a part has been counted more than once. Re-estimating the reads of one arm with the weights of another separates them:

| Reads made under | Counts combined with | Right, edited |
|---|---|---|
| no decay | no decay | 0.41 |
| no decay | decay (λ 0.5) | 0.69 |
| no decay | latest only | 0.70 |
| decay (λ 0.5) | no decay | 0.39 |
| decay (λ 0.5) | decay | 0.67 |

Weighting alone: +0.28 (0.21 to 0.35). Marks alone: −0.02 (−0.09 to 0.05).

## Reading

- **R1's "decay made no difference" was a sample of 30.** At 150 collections the effect is large and its interval is far from zero. E1 in the paper's ledger moves from "not supported" to "supported in this setting".
- **The effect is not the pheromone.** Fading the visit marks did not change where workers went in any way that mattered: the edited part was re-read about as often, and combining those reads without decay gives 0.39. What matters is that an old count stops weighing as much as a new one. A schedule that uses "the latest count of each part", as every non-stigmergic arm of the pilot does, already has this.
- **So the supported statement is about evidence, not about trails**: when the field can change, counts must be discounted by age. That is a use of decay, and the paper can say so; it is not evidence that evaporating marks direct effort better.
- **Forgetting costs when nothing changed**: with only the latest round kept, 7 of 150 stable collections were lost against none without decay, because a single miscount is no longer averaged out. Between λ 0.5 and λ 0 there is a trade: +0.07 edited for −0.02 stable.
- **Real readers behaved like the simulation**, 0.41, 0.67 and 0.75 against 0.39, 0.67 and 0.74 on the same collections. The ties that exact readers produce without decay (26% in simulation) were 14% with real readers; the half-credit analysis shows the conclusion does not rest on them.
- The regime is still far below a schedule in this setting (30 of 30 in R1): decay repairs part of what undirected coverage loses, not all of it.

## Limits

One rule, one task, one kind of edit, one small model; the horizon is four rounds (the simulation at eight rounds gives 0.40 without decay and 0.96 with). The decomposition is a re-estimation of the same reads, not a separate run. Ties are a property of this task's margins.
