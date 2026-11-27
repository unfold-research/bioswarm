# BSH3 · Missing warehouse capacities

Four new seven-order cases in Brazilian Portuguese. Each case reused identical commercial and warehouse records for all three arms. Two deliberately removed capacities; two used the unmodified warehouse record. The primary endpoints were exact source restoration and feasible final allocation in the controlled cases. Final freight is in BRL, while model cost is in USD.

| Case | Fault | Optimum | Manager | Current Unfold | Unfold + return |
|---|---|---:|---:|---:|---:|
| agreste | C | 94 | failed | failed | failed |
| sertao | all | 81 | failed | failed | failed |
| mata | unmodified | 77 | failed | failed | failed |
| litoral | unmodified | 71 | failed | failed | failed |

## Source repair

| Case | Missing numeric fields | Exact restoration | Return USD | Return seconds | Full arm USD | Delta vs current Unfold USD |
|---|---|---|---:|---:|---:|---:|
| agreste | C | yes | [redacted] | 19.66 | [redacted] | [redacted] |
| sertao | N, C, S | yes | [redacted] | 15.90 | [redacted] | [redacted] |
| mata | N, C, S | yes | [redacted] | 17.66 | [redacted] | [redacted] |
| litoral | N, C, S | yes | [redacted] | 20.89 | [redacted] | [redacted] |

## All arms

| Arm | First proposals feasible | Final plans feasible | Optimal final plans | Four-case full cost USD |
|---|---:|---:|---:|---:|
| Manager | 0/4 | 0/4 | 0/4 | [redacted] |
| Current Unfold | 0/4 | 0/4 | 0/4 | [redacted] |
| Unfold + warehouse return | 0/4 | 0/4 | 0/4 | [redacted] |

## Per-case endpoints

| Case | Arm | Proposals | First freight BRL | Final gap BRL | Post-record wall time (s) | Full cost USD |
|---|---|---:|---:|---:|---:|---:|
| agreste | Unfold + warehouse return | 2 | failed | failed | 52.684 | [redacted] |
| agreste | Current Unfold | 2 | failed | failed | 35.562 | [redacted] |
| agreste | Manager | 2 | failed | failed | 68.033 | [redacted] |
| sertao | Manager | 2 | failed | failed | 63.139 | [redacted] |
| sertao | Unfold + warehouse return | 2 | failed | failed | 55.578 | [redacted] |
| sertao | Current Unfold | 2 | failed | failed | 41.608 | [redacted] |
| mata | Current Unfold | 2 | failed | failed | 32.443 | [redacted] |
| mata | Manager | 2 | failed | failed | 57.667 | [redacted] |
| mata | Unfold + warehouse return | 2 | failed | failed | 62.450 | [redacted] |
| litoral | Manager | 2 | failed | failed | 57.515 | [redacted] |
| litoral | Current Unfold | 2 | failed | failed | 32.704 | [redacted] |
| litoral | Unfold + warehouse return | 2 | failed | failed | 62.565 | [redacted] |

## Accounting and interpretation

Actual spend across the entire experiment was [US$ redacted] for 40 logical turns and 40 upstream attempts. Role costs were joined to gateway spend records. Summing the full three-arm costs counts shared preparation three times; the actual charge includes it once. Latency is measured after the common records arrive; return-call timing includes harness startup and any backoff. The independent checker enumerated routes and re-scored every candidate. The private R2 manifest covers requests, responses, journals, scoring, transport and accounting.

The intervention checks for missing or malformed fields. It does not validate the truth of every existing integer. The manager could advise from the same partial record but had no extra source call. Different model draws can yield different plans even when no return is triggered. This is a four-case mechanism pilot, not an estimated field-wide success rate.

## Why a repaired capacity can still fail

In the two injected-fault cases, the shared commercial reply contained an error object and supplied none of the seven order IDs or numeric volumes. This omission affected all three arms. In both cases the new arm’s transport replies requested volume information rather than supplying an allocation. The warehouse intervention only addresses capacities. These observations test recovery in the presence of another missing input; they cannot identify the isolated effect of a missing capacity on final success when the order-volume map is complete.

Across all four cases the commercial source returned an error without numeric volumes. All four returns restored the exact source map; no final plan in any of the twelve cells was feasible. All four cases needed a return, so this run cannot estimate unnecessary-call frequency on complete messages. Direct return calls totaled [US$ redacted] ([US$ redacted] per call); the full observed cost difference against current Unfold summed to [US$ redacted] The latter includes differing independent planning replies.
