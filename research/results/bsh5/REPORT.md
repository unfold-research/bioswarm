# BSH5 · Conditional warehouse returns at scale

24 newly generated synthetic allocation instances, 6–8 orders each, run under both complete and missing source capacities. 48 condition blocks, 144 strategy runs. Same source volumes, tariffs, depot constraints and unexposed optimum within each matched problem. The warehouse map is either source-exact or completely removed. Only the conditional-return arm can query it. All 48 blocks and all 144 assigned outcomes are represented.

| Initial capacity | Strategy | First plan viable | Final viable / 24 | Exact optimum / 24 | Optimal / viable | Full API USD | USD per feasible plan | Median arm seconds |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| absent | Manager | 3 | 8 | 6 | 6/8 | [redacted] | [redacted] | 70.83 |
| absent | Current Unfold | 2 | 9 | 8 | 8/9 | [redacted] | [redacted] | 55.83 |
| absent | Unfold + return | 20 | 23 | 21 | 21/23 | [redacted] | [redacted] | 73.61 |
| present | Manager | 24 | 24 | 22 | 22/24 | [redacted] | [redacted] | 116.07 |
| present | Current Unfold | 22 | 24 | 22 | 22/24 | [redacted] | [redacted] | 60.91 |
| present | Unfold + return | 22 | 24 | 22 | 22/24 | [redacted] | [redacted] | 49.72 |

## Paired marginal economics

| Capacity | Comparator | Endpoint | Gains | Losses | Ties | Net additional cases | Net API USD | USD per net additional case |
|---|---|---|---:|---:|---:|---:|---:|---:|
| absent | Current Unfold | valid | 15 | 1 | 8 | +14 | [redacted] | [redacted] |
| absent | Current Unfold | optimal | 14 | 1 | 9 | +13 | [redacted] | [redacted] |
| absent | Manager | valid | 16 | 1 | 7 | +15 | [redacted] | [redacted] |
| absent | Manager | optimal | 16 | 1 | 7 | +15 | [redacted] | [redacted] |
| present | Current Unfold | valid | 0 | 0 | 24 | +0 | [redacted] | undefined |
| present | Current Unfold | optimal | 1 | 1 | 22 | +0 | [redacted] | undefined |
| present | Manager | valid | 0 | 0 | 24 | +0 | [redacted] | undefined |
| present | Manager | optimal | 1 | 1 | 22 | +0 | [redacted] | undefined |

Absent: 24/24 return calls, 23 source-exact restorations, [US$ redacted] direct spend (mean [US$ redacted] per query). Present: 0/24 calls, [US$ redacted] Total reconciled [US$ redacted] 267 completed turns, 281 HTTP attempts; 243 delivered manager/planner payloads checked after serialization.

## How to use the result

Cost per feasible/optimal result includes spend on unsuccessful attempts. Direct source-call price and marginal cost to obtain an additional outcome answer different questions. Positive incremental cost per additional outcome identifies a break-even value for that measured outcome. Business freight is in BRL and was never treated as API spend. The 50/50 mix was designed; use actual missing-capacity prevalence when estimating production value. Complete-capacity Unfold arms run the same underlying planning policy with independent model draws. Their differences are run variation, not a treatment benefit. Median wall times include retries and concurrent-host conditions. One draw per strategy per instance, one frozen task family and model. These are matched descriptive observations.

## Per-instance outcomes

Cells show realized freight in BRL; a dash means both proposal opportunities ended without a feasible plan.

| Seed | Optimum | Missing: manager | Missing: current | Missing: return | Present: manager | Present: current | Present: return |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 92 | — | — | 92 | 92 | 92 | 92 |
| 2 | 122 | 122 | 122 | 122 | 122 | 122 | 122 |
| 3 | 87 | 87 | 87 | 87 | 87 | 87 | 87 |
| 4 | 84 | — | — | 84 | 84 | 84 | 84 |
| 5 | 101 | 103 | 101 | 101 | 101 | 101 | 101 |
| 6 | 86 | — | 87 | 86 | 86 | 86 | 86 |
| 7 | 96 | — | — | 96 | 96 | 96 | 96 |
| 8 | 101 | — | — | 101 | 103 | 101 | 101 |
| 9 | 93 | — | — | 93 | 93 | 93 | 93 |
| 10 | 103 | — | — | 103 | 103 | 103 | 103 |
| 11 | 117 | 117 | 117 | 117 | 117 | 117 | 117 |
| 12 | 68 | 68 | 68 | 68 | 68 | 68 | 68 |
| 13 | 89 | — | 89 | 89 | 89 | 92 | 89 |
| 14 | 130 | — | — | 130 | 130 | 130 | 130 |
| 15 | 87 | — | — | 87 | 87 | 87 | 87 |
| 16 | 101 | 107 | — | 101 | 101 | 101 | 101 |
| 17 | 99 | — | — | 99 | 99 | 99 | 99 |
| 18 | 83 | 83 | 83 | — | 83 | 83 | 83 |
| 19 | 117 | — | — | 118 | 118 | 118 | 118 |
| 20 | 150 | — | 150 | 150 | 150 | 150 | 150 |
| 21 | 104 | — | — | 109 | 104 | 104 | 109 |
| 22 | 119 | — | — | 119 | 119 | 119 | 119 |
| 23 | 130 | — | — | 130 | 130 | 130 | 130 |
| 24 | 82 | 82 | — | 82 | 82 | 82 | 82 |

## Exploratory split by whether capacity raises the minimum freight

This retrospective split uses information from the oracle and is descriptive. A binding case has an optimum strictly above the sum of the cheapest eligible rate for each order. Only the missing-capacity condition appears below.

| Capacity raises minimum | Strategy | Cases | Viable | Optimal |
|---|---|---:|---:|---:|
| True | Manager | 20 | 4 | 2 |
| True | Current Unfold | 20 | 5 | 4 |
| True | Unfold + return | 20 | 20 | 18 |
| False | Manager | 4 | 4 | 4 |
| False | Current Unfold | 4 | 4 | 4 |
| False | Unfold + return | 4 | 3 | 3 |

## Warehouse reply fidelity

1 of the 24 returned maps differed from the source. s18a.

In s18a the warehouse reply cited the correct three capacities in explanatory text but put zeros in the machine-readable fields. The coordinator marked the pending fields complete and both subsequent proposals were infeasible. Presence-only validation accepted incorrect values.
