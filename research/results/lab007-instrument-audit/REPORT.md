# LAB-007 clean-instrument audit

Screen status: **instrument-insufficient**. Config: `068e9d7d7bbe8b77f78145c33a005c5321af8e67b540718101d1db75734dbc24`.

No attack or defence comparison was run. This is an instrument check only.

| Arm | Trajectories | Valid | Truth-correct | Unsure | Wrong | Complete evidence |
|---|---:|---:|---:|---:|---:|---:|
| LOCAL | 24 | 144/144 | 72/144 | 72 | 0 | 0/144 |
| FULL | 24 | 144/144 | 144/144 | 0 | 0 | 129/144 |
| RING | 24 | 144/144 | 115/144 | 29 | 0 | 59/144 |

Paid responses: 432; usage estimate: [US$ redacted]; global committed: [US$ redacted] / [US$ redacted]

## Limits

- Eight truth vectors repeated three times are exhaustive instrumentation checks, not 24 diverse independent tasks.
- No poison, authority attack, defence comparison, held-out set, or production context was used.
- Haiku model alias does not guarantee immutable model weights; cost is a list-price estimate.
- Passing this screen validates only the synthetic evidence/scoring channel; it does not satisfy or rewrite the original poison-efficacy gate.
