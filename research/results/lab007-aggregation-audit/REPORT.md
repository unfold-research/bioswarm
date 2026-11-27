# LAB-007 aggregation audit v1

Config: `8d9007a6cfbf354bb2cb418495a0600661f1d7a0eb43c7e36fbda5842f4465fc`. This is a one-step no-attack representation test; it is not a propagation or defence experiment.

Batch: `msgbatch_01ERqdXfUM6Yq8wyMqvDdGLA` (48 model responses). Estimated usage: [US$ redacted] Reconciled global commitment: [US$ redacted] / [US$ redacted]

| Arm | Outputs | Valid schema | Exact fact set | Supported citations | Evidence-rule decision | Hidden-truth correct | False certainty |
|---|---:|---:|---:|---:|---:|---:|---:|
| TEXT | 24 | 24 | 24 | 24 | 23 | 11 | 0 |
| STRUCTURED | 24 | 24 | 24 | 24 | 24 | 12 | 0 |
| DETERMINISTIC | 24 | 24 | 24 | 24 | 24 | 12 | 0 |

## Interpretation

TEXT and STRUCTURED are paired per case; six aggregate counts do not establish causal superiority. DETERMINISTIC has no model calls and serves as an engineering comparator. Evidence completeness, source support, decision correctness and hidden-truth correctness remain separate metrics. See `summary.json` for archetype-level outcomes and paired rows.

## Limits

- 24 case clusters across eight authored archetypes are an instrument screen, not a powered or diverse benchmark.
- The deterministic aggregator uses only supplied records and does not know hidden truth or source reliability.
- This one-step input-format test does not measure contamination, propagation, defence efficacy, topology, or production transfer.
- List-price estimate from returned token usage; it is not an invoice and the model alias does not freeze provider weights.
