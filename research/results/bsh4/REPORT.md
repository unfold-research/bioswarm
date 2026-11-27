# BSH4 · Warehouse source return with intact commercial data

Three new six-order instances, identical inputs inside each pair. Fixed commercial records and tariffs were checked against the original source in all 18 actual gateway requests to the manager and transport planner. The initial warehouse record was empty in every arm; only augmented Unfold could request the three capacities. All arms ran on Hermes with gpt-6-luna. No model calls were needed to transmit the frozen initial records.

The extra warehouse turn restored all three source capacities exactly in 3/3 cases. Compared with current Unfold, 3 cases converted from failure to feasible and 0 changed in the reverse direction. A feasible guessed plan by an unassisted arm counts in its favor. Feasibility and optimality are different endpoints. The independent checker enumerated all legal assignments and re-scored every proposed allocation.

| Case | Optimum BRL | Manager | Current Unfold | Unfold + return | Return USD | Net USD vs current |
|---|---:|---:|---:|---:|---:|---:|
| capibaribe | 71 | failed | failed | 71 | [redacted] | [redacted] |
| pajeu | 65 | 65 | failed | 65 | [redacted] | [redacted] |
| araripe | 73 | failed | failed | 80 | [redacted] | [redacted] |

## First proposal, quality and cost

| Case | Arm | Proposals | First freight (BRL) | Final gap to optimum (BRL) | Wall time (s) | Total API USD |
|---|---|---:|---:|---:|---:|---:|
| capibaribe | Manager | 2 | failed | failed | 63.124 | [redacted] |
| capibaribe | Current Unfold | 2 | failed | failed | 32.865 | [redacted] |
| capibaribe | Unfold + return | 1 | 71 | 0 | 64.766 | [redacted] |
| pajeu | Manager | 2 | failed | 0 | 88.377 | [redacted] |
| pajeu | Current Unfold | 2 | failed | failed | 52.156 | [redacted] |
| pajeu | Unfold + return | 1 | 65 | 0 | 64.581 | [redacted] |
| araripe | Manager | 2 | failed | failed | 66.228 | [redacted] |
| araripe | Current Unfold | 2 | failed | failed | 69.682 | [redacted] |
| araripe | Unfold + return | 1 | 80 | 7 | 94.177 | [redacted] |

## Marginal price and limitations

The three warehouse calls together cost [US$ redacted] (mean [US$ redacted]). Their wall times, in case order, were 22.321 s, 21.058 s, 19.991 s. The full observed cost difference between augmented and current Unfold summed to USD +0.00087350, including the independent planner responses and any repairs. Entire experiment: [US$ redacted] 21 completed calls across 24 HTTP attempts. Spend reconciled to gateway receipts. The private manifest covers raw evidence and measurement scripts.

One draw per strategy per instance. All capacity omissions were controlled and total; there was no unmodified-capacity arm. The experiment measures recovery from this specific loss, not its natural frequency or a general success rate.
