# Post-run interpretation — LAB-007 aggregation audit v1

Frozen config: `8d9007a6cfbf354bb2cb418495a0600661f1d7a0eb43c7e36fbda5842f4465fc`. Batch: `msgbatch_01ERqdXfUM6Yq8wyMqvDdGLA`.

All 48 request IDs were unique, succeeded and carried token usage. Estimated list-price use was [US$ redacted]; the global LAB-007 commitment reconciled to [US$ redacted] / [US$ redacted] The run used 24 case clusters, eight evidence archetypes and three seeds per archetype, with 24 paired calls per model format. The deterministic comparator made no model calls.

## Observed outcomes

- `TEXT`: 24/24 valid; 24/24 exact evidence claims and exact citations; 23/24 evidence-rule decisions correct; 11/24 outputs match hidden truth.
- `STRUCTURED`: 24/24 valid; 24/24 exact evidence claims and exact citations; 24/24 evidence-rule decisions correct; 12/24 match hidden truth.
- `DETERMINISTIC`: 24/24 exact evidence claims, citations and evidence-rule decisions; 12/24 match hidden truth.
- All three produced zero confident decisions in the underdetermined missing/conflict cases.

The only TEXT/STRUCTURED decision difference was one case in the “partial but decisive” archetype (2/3 versus 3/3). That single paired difference is descriptive; the sample is too small to support a superiority or equivalence claim. Both model formats pass the preregistered usability screen. Structured records did not improve exact fact/citation fidelity over text in this instrument; both were perfect on these 24 cases. The screen does show one decision error under text serialization and none under structured serialization, which is a lead for a larger preregistered test, not a treatment effect.

The 12/24 hidden-truth accuracy for STRUCTURED and DETERMINISTIC is not a general accuracy estimate: half the archetypes intentionally contain a conflict or insufficient evidence, where `unsure` is the predeclared correct evidence-based response. Evidence-rule decision, hidden-truth match, fact completeness and citation support are separate endpoints.

## Interpretation limits

The deterministic control groups visible records by exact indicator/value and cites the records that support each group. It does not inspect truth or treat origin as reliability; its perfect score confirms this implementation on its authored cases, not a learned capability. This is a one-step no-attack aggregation screen: it does not measure message propagation, resistance to contamination, authority-boundary protection, defense efficacy, topology effects or production transfer. Cases share eight archetypes, so 24 seeds do not constitute 24 unrelated threat models. The prior LAB-007 gate remains failed and unchanged.
