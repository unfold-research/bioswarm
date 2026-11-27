# I2 interference between installed instincts (H-I07)

Preregistration `tasks/I2-I3-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, batch API, 96 requests, all succeeded and valid. Usage estimate [US$ redacted]

## Result

The target instinct (quarantine a lone unverified contradiction) was installed alone or among other instincts whose triggers never occur in the cases.

| Instincts installed | Effect on exposed cases (of 8) | Wrong firings | Clean and genuine cases preserved |
|---|---|---|---|
| 1 | 6 | 0 | 16 / 16 |
| 3 | 6 | 0 | 16 / 16 |
| 6 | 6 | 0 | 16 / 16 |
| 12 | 5 | 0 | 16 / 16 |

**H-I07 not supported.** The preregistered drop of two cases between 1 and 12 instincts did not occur (one case). No inert instinct fired, and the target never fired where it should not.

## Reading

Up to twelve instincts with disjoint triggers coexist without measurable interference on this model. The limit H-I07 predicts, if it exists, lies beyond twelve or needs instincts that compete for the same situation, which this run did not test.

On Haiku the instinct alone fired cleanly in 6 of 8 exposed cases; in the Sonnet run of I1 it fired in 8 of 8. The two misses are cases where the verdict was right but the output did not meet the strict definition of a clean firing.

## Limits

Eight cases per cell, one model, distractors that are inert by construction. Costs are list-price estimates from returned tokens.
