# D4b exploration in the agent: telling the workers about the trade makes them explore; none of the three variants beat D4

Preregistration `tasks/R3-D4B-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled, as `d4b-told`, `d4b-wide`, `d4b-draw`; 2,160 requests each, all succeeded. Usage estimate [US$ redacted] each. Analysis: `node observatory/batch2/d4b-choice/analyze.mjs` → `summary.json` here. Same 60 collections and starting positions as D4 and R2b.

## Result

Edited condition; all variants were right on 60 of 60 when nothing changed.

| Variant | Correct, edited | Edited parts re-read (of 3) | Choices that leave the neighbourhood | With a changed part in view, went to a fresh neighbour |
|---|---|---|---|---|
| D4 marks (reference) | 35 of 60 (0.58) | 1.52 | 0.4% | 90% |
| told (the trade explained) | 38 of 60 (0.63) | 1.75 | 61% | 80% |
| wide (nine parts in view) | 29 of 60 (0.48) | 1.33 | 0.5% | 94% |
| draw (a concrete part offered) | 30 of 60 (0.50) | 1.43 | 10% | 90% |
| R2b alarm rule in the harness | 42 of 60 (0.70) | 1.83 | | |

| Test | Verdict |
|---|---|
| P1 told beats D4 marks | **not supported**: +0.05, interval −0.13 to 0.23 |
| P2 wide beats D4 marks | **not supported**: −0.10, interval −0.20 to 0.00 |
| P3 draw beats D4 marks | **not supported**: −0.08, interval −0.23 to 0.05 |
| P4 nothing lost in the stable condition | supported |

## Reading

- Two sentences about the trade changed what the workers did: they left their neighbourhood in 61% of choices, against almost never in D4, and kept following alarms when one was in view (80%). Their accuracy rose to 0.63 and is no longer distinguishable from the harness rule (−0.07, interval −0.23 to 0.12). It is not distinguishable from D4 either, so the registered test fails: the behaviour moved clearly, the outcome within noise.
- A wider view did nothing for exploration and lowered accuracy: with nine parts to choose from the workers still stayed, and two workers who stay cover less. An explicit offer of a part elsewhere was taken one time in ten.
- So the exploration half of the rule can be put into the agent by saying why it matters, and not by showing more or by offering. That is one wording on one task; it suggests that what small agents lack for search is the reason, not the option.
- Cost is unchanged from D4: one extra call per re-count, 18% above the harness rule, for a result that at best equals it.

## Limits

One wording per variant, one model, sixty collections whose D4 and R2b results were known. A difference of 0.05 to 0.10 cannot be resolved at this size. The told variant was not combined with the wide view or the offer.
