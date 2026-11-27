# B5 relay format across hops under higher load (Murmur, H-M01)

Preregistration `tasks/B5-LOAD-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, batch API, four dependent waves (144 + 48 + 48 + 48), all succeeded, none truncated or invalid. Usage estimate [US$ redacted]

## Result

Cases with four indicators and three sources, 6 to 9 records each, opaque ids.

| Hop | STRUCT exact | PROSE exact |
|---|---|---|
| 0 (three source agents per case) | 72 / 72 | 72 / 72 |
| 1 (merge of three reports) | 24 / 24 | 24 / 24 |
| 2 (relay) | 24 / 24 | 24 / 24 |
| 3 (relay) | 24 / 24 | 24 / 24 |

No unsupported claim, missing pair or missing id anywhere. **Preregistered verdict: H-M01 refuted again**, now at about one and a half times the evidence of B2 and with three sources to merge.

## Reading

Across B2 and B5, 96 prose relays and 96 structured relays over three hops lost nothing. With an explicit instruction about what must survive, a 90-word briefing carries up to nine cited findings as reliably as a typed array. The format is not where provenance is lost on this instrument. The earlier loss in the LAB-007 ring audit points to missing instruction and partial views, not to prose.

The instrument is at its ceiling for both arms, so it cannot say which format degrades first. Finding that point needs much larger evidence sets (tens of records, beyond what a 90-word note can hold), longer chains, or agents that are not told what to preserve.

## Limits

Synthetic facts, 24 cases, one model, one prompt per role. A ceiling result bounds the failure rate below about 14% per arm and hop with 95% confidence. Costs are list-price estimates from returned tokens.
