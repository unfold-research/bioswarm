# R4 and RD (D2) preregistration (2026-11-11)

Owner instruction of 2026-11-11 ("Sim, R4 e D2"), within the standing authorisation for the shared ledger.

## R4, done without models
The question of R4 was whether a rule that does not bet only on locality stays above the fixed schedule under both local and scattered change. The rule regimes do not depend on the model in this setting, so it was answered by simulation on 2,000 collections per scenario before this file was written: `results/ring-rules/REPORT.md`. Neither a hedging rule nor an adaptive one does. Nothing in R4 is a paid run.

## RD: orchestrator model and locality prior
Registered before any paid call of these studies. Code: `observatory/batch2/ring/engine.mjs` and seven studies `rd-<scenario>-<model>-<prior>`; analysis `observatory/batch2/ring/analyze-routers.mjs`.

What depends on the model is the orchestrator. So far it was Claude Haiku 5.5, always told that an edit tends to affect neighbouring parts. With that prior it matched the alarm rule under local change (0.75), fell below the fixed schedule under scattered change (0.20 against 0.47) and was misled by a false count (0.27). Two questions: does a stronger model in the coordinator's seat adapt where the small one did not (run D2 of the P1 paper's needs), and does removing the prior help or hurt.

Design: the orchestrator regime of R2b and R3 on the same collections, readers always Haiku, in a 2 × 2 of orchestrator model (Haiku, Sonnet 5.5 with adaptive thinking at low effort and 1,024 output tokens) by prior (given, not given).

| Scenario (collections) | Haiku, prior | Haiku, no prior | Sonnet, prior | Sonnet, no prior |
|---|---|---|---|---|
| local (28001 to 28060) | `r2b-router`, done | new | new | new |
| scatter (29001 to 29060) | `r3-scatter-router`, done | new | new | new |
| poison (30001 to 30060) | `r3-poison-router`, done | — | new | — |

Each new study: 720 first counts, 360 assignments, 720 re-counts. The fixed schedule and the alarm rule were run on the same collections and pair by collection.

Accuracy in the edited condition, paired bootstrap over 60 collections (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below, unless stated.
- **P1, a stronger orchestrator copes with scattered edits better than the small one**, both given the prior: Sonnet minus Haiku, scatter.
- **P2, and with a false count**: Sonnet minus Haiku, poison.
- **P3, removing the prior helps the small orchestrator when edits are scattered**: Haiku no prior minus Haiku prior, scatter.
- **P4, and the large one**: Sonnet no prior minus Sonnet prior, scatter.
- **P5, an orchestrator without the prior is safe in both worlds**: Sonnet no prior is above the fixed schedule under local change and not below it under scattered change (interval not entirely below zero). P5haiku is the same for Haiku.
- **P6**: every arm at least 0.9 in the stable condition.
Reported: edited parts re-read, re-counts spent beside the false count, unusable assignments, cost per arm.

The collections are those of R2b and R3, on which the leak probe finds nothing.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). The five Sonnet studies carry most of the cost; pessimistic reservation about [US$ redacted] each.

## Limits stated in advance
The comparison arms with Haiku and the prior were run earlier, on the same collections, with a protocol whose first-round assignment was shared between conditions; the new studies ask for an assignment per condition in every round. Sonnet runs with adaptive thinking, Haiku with none. One wording of the instructions with and without the prior. Three rounds give an orchestrator little time to learn from the board. Sixty collections: an interval of about ±0.15.
