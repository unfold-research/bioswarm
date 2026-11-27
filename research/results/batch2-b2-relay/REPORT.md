# B2 relay format across hops (Murmur, H-M01)

Frozen config `262f40a8a9e036eb…`, preregistration `tasks/B2-RELAY-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, batch API, four dependent waves (96 + 48 + 48 + 48 responses, all succeeded, none truncated or invalid). Usage estimate [US$ redacted]

## Result

| Hop | STRUCT exact | PROSE exact |
|---|---|---|
| 0 (source extraction, 48 per arm) | 48 / 48 | 48 / 48 |
| 1 (merge of two reports) | 24 / 24 | 24 / 24 |
| 2 (relay) | 24 / 24 | 24 / 24 |
| 3 (relay) | 24 / 24 | 24 / 24 |

No unsupported claim, missing pair or missing evidence id in either arm at any hop. 95% Wilson interval for 24 of 24: 0.86 to 1.

**Preregistered verdict: H-M01 refuted on this instrument.** The prediction was that prose would fall to 16 of 24 or fewer by hop 2. A prose briefing of at most 90 words, written under an explicit instruction to state every finding and cite its evidence ids, carried all findings and ids through three hops as well as the structured array did.

## Reading

- The provenance loss seen in the LAB-007 ring audit (38 of 144 outputs fully cited) is not explained by prose as a format. That instrument differed in other ways: agents inferred missing values, forwarded partial views and were not told that only their note would be forwarded. The loss is more likely a matter of what the agent is asked to preserve than of the container.
- Both arms are at the ceiling, so this run cannot rank them. It shows that at this load (up to six records, three indicators, two sources) the format does not matter. B5 repeats the comparison with more evidence per case.
- For Murmur this moves the design question from "structured or prose" to "is every agent told what must survive the hop, and is that checked". M3 measures the checking side.

## Limits

Synthetic facts, 24 cases, one model, one prompt per role. PROSE agents also wrote `claims`, which were scored; only the briefing was forwarded. A ceiling result bounds the failure rate (below about 14% with 95% confidence) rather than proving it is zero. Costs are list-price estimates from returned tokens, not an invoice.
