# BSH6 · Hermes manager and Unfold with equal warehouse access

Twelve new allocation problems with 6–8 orders each were run with the full capacity map and again with all capacities withheld. Complete volumes and tariffs checked in every delivered coordinator/planner payload. The same warehouse worker, planning model, correction opportunity, model tier, per-arm token and dollar ceilings were available. Every proposal independently rescored and every optimum enumerated. One model draw per arm per problem/condition.

| Initial capacity | Coordinator | Queries | Exact source returns | Feasible | Optimal | API USD | Warehouse USD | Model calls | Median seconds |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Missing | manager | 12 | 12 | 11 | 11 | [redacted] | [redacted] | 37 | 106.5 |
| Missing | unfold | 12 | 12 | 12 | 11 | [redacted] | [redacted] | 25 | 83.5 |
| Present | manager | 0 | 0 | 12 | 12 | [redacted] | [redacted] | 24 | 100.6 |
| Present | unfold | 0 | 0 | 12 | 12 | [redacted] | [redacted] | 13 | 66.9 |

## Paired differences

Counts are Unfold wins / manager wins / ties, comparing identical instances.
- Missing · valid · 1 / 0 / 11
- Missing · optimal · 1 / 1 / 10
- Present · valid · 0 / 0 / 12
- Present · optimal · 0 / 0 / 12

Gateway-reconciled total [US$ redacted] for 99 model calls and 105 HTTP attempts.

The manager requested a lookup with a boolean in its paid advice turn. Unfold used its existing deterministic missing-field rule and stigwait traces. Both received the same warehouse prompt if they queried. The comparison measures these two implemented policies including their coordination overhead. Source responses and planner draws were independent. Lookup correctness concerns initial information completeness. The 50% missingness is an experimental choice. Small differences in optimum counts do not establish a general ranking.

## Individual results

| Case | Arm | Query | Exact return | Freight | Optimum | API USD |
|---|---|---|---|---:|---:|---:|
| s101a | manager | True | True | 107 | 107 | [redacted] |
| s101a | unfold | True | True | 107 | 107 | [redacted] |
| s101p | manager | False | None | 107 | 107 | [redacted] |
| s101p | unfold | False | None | 107 | 107 | [redacted] |
| s102a | manager | True | True | 80 | 80 | [redacted] |
| s102a | unfold | True | True | 80 | 80 | [redacted] |
| s102p | manager | False | None | 80 | 80 | [redacted] |
| s102p | unfold | False | None | 80 | 80 | [redacted] |
| s103a | manager | True | True | 119 | 119 | [redacted] |
| s103a | unfold | True | True | 119 | 119 | [redacted] |
| s103p | manager | False | None | 119 | 119 | [redacted] |
| s103p | unfold | False | None | 119 | 119 | [redacted] |
| s104a | manager | True | True | None | 114 | [redacted] |
| s104a | unfold | True | True | 114 | 114 | [redacted] |
| s104p | manager | False | None | 114 | 114 | [redacted] |
| s104p | unfold | False | None | 114 | 114 | [redacted] |
| s105a | manager | True | True | 78 | 78 | [redacted] |
| s105a | unfold | True | True | 81 | 78 | [redacted] |
| s105p | manager | False | None | 78 | 78 | [redacted] |
| s105p | unfold | False | None | 78 | 78 | [redacted] |
| s106a | manager | True | True | 111 | 111 | [redacted] |
| s106a | unfold | True | True | 111 | 111 | [redacted] |
| s106p | manager | False | None | 111 | 111 | [redacted] |
| s106p | unfold | False | None | 111 | 111 | [redacted] |
| s107a | manager | True | True | 111 | 111 | [redacted] |
| s107a | unfold | True | True | 111 | 111 | [redacted] |
| s107p | manager | False | None | 111 | 111 | [redacted] |
| s107p | unfold | False | None | 111 | 111 | [redacted] |
| s108a | manager | True | True | 102 | 102 | [redacted] |
| s108a | unfold | True | True | 102 | 102 | [redacted] |
| s108p | manager | False | None | 102 | 102 | [redacted] |
| s108p | unfold | False | None | 102 | 102 | [redacted] |
| s109a | manager | True | True | 97 | 97 | [redacted] |
| s109a | unfold | True | True | 97 | 97 | [redacted] |
| s109p | manager | False | None | 97 | 97 | [redacted] |
| s109p | unfold | False | None | 97 | 97 | [redacted] |
| s110a | manager | True | True | 123 | 123 | [redacted] |
| s110a | unfold | True | True | 123 | 123 | [redacted] |
| s110p | manager | False | None | 123 | 123 | [redacted] |
| s110p | unfold | False | None | 123 | 123 | [redacted] |
| s111a | manager | True | True | 80 | 80 | [redacted] |
| s111a | unfold | True | True | 80 | 80 | [redacted] |
| s111p | manager | False | None | 80 | 80 | [redacted] |
| s111p | unfold | False | None | 80 | 80 | [redacted] |
| s112a | manager | True | True | 113 | 113 | [redacted] |
| s112a | unfold | True | True | 113 | 113 | [redacted] |
| s112p | manager | False | None | 113 | 113 | [redacted] |
| s112p | unfold | False | None | 113 | 113 | [redacted] |
