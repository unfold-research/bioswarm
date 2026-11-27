# V5 preregistration: working budget against model on the search task (H-01)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/v5-budget/protocol.mjs` (Claude Haiku 5.5, thinking disabled, 1,536 output tokens) and `v5-budget-sonnet` (Claude Sonnet 5.5, adaptive thinking, effort low, 2,048 output tokens). Combined analysis: `observatory/batch2/v5-budget/analyze.mjs`.

## Why
V4: Sonnet answering directly at low effort scored 0.74, below Haiku with 60 words of working (0.79); M7: Haiku with 150 words scored 0.91. Those came from different task sets and Sonnet never had a working field. V5 gives both models the same budgets on the same tasks.

## Design
Search task with 48, 96 and 144 records, 20 tasks each, seeds 22001 to 22060. Arms per model: **direct** (answer only), **w60**, **w150**. 180 calls per model.

## Predictions and decision rules
Per-task differences over the 60 tasks, seeded bootstrap (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **P1, explicit working helps the stronger model too.** Sonnet w60 minus Sonnet direct.
- **P2, a small model that reasons beats a large one that answers directly.** Haiku w150 minus Sonnet direct.
- **P3, at equal working the model still matters.** Sonnet w150 minus Haiku w150.

Reported: accuracy, mean cost per call from returned tokens, cost per correct answer and output tokens for the six agents.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap.

## Limits stated in advance
Sixty tasks. Sonnet's adaptive thinking at low effort is not disabled, so its "direct" arm may include hidden reasoning and its working arms add to that; Haiku's arms have none. Costs are batch list prices from returned tokens.
