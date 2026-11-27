# V1 preregistration: error correlation and voting (H-01, H-10, H-15)

Registered 2026-11-11, before any paid call and before the results of B1 and B2 were read. Code: `observatory/batch2/v1-vote/protocol.mjs`. The frozen config hash in `results/batch2-v1-vote/frozen-lock.json` covers this file, the code and the request manifest.

## Question
Are the errors of repeated samples of one agent correlated, and does varying how the task is presented lower that correlation? This is the first measurement on a real model of the parameter that, in our simulations, caps what voting can add. It serves Void (N workers on one task) and Murmur (N searchers on one question).

## Design
- 48 chained modular-arithmetic tasks (seeds 8001–8048) on a difficulty ladder of 2, 3, 4, 5, 6 and 8 operations, 8 tasks per level. The model answers with one integer and has no working space, so errors occur.
- IDENT: 5 samples of the same prompt. DIVERSE: 5 different presentations of the same task (sentence, expression, numbered steps, word problem, JSON). 480 calls, one wave.
- Model `claude-haiku-5-5`, batch API, thinking disabled, JSON schema output.

## Endpoints
Per arm, overall and per level: single-sample accuracy, accuracy of the majority of 5, the majority accuracy expected if samples were independent, and the intraclass correlation of correctness (ANOVA estimator). Difference in correlation between arms with a paired bootstrap over tasks (2,000 resamples, fixed seed).

## Predictions
- **P1 (H-01)**: identical samples are correlated: intraclass correlation of IDENT is at least 0.2.
- **P2 (H-15)**: diversity lowers the correlation: the 95% bootstrap interval of (IDENT − DIVERSE) excludes zero on the positive side, and the DIVERSE majority is at least as accurate as the IDENT majority.
- **P3 (H-10)**: at levels where IDENT single accuracy is below 0.5, the majority of 5 is no better than a single sample.
A prediction is `inconclusive` when its precondition is not met (for example no level below 0.5).

## Stopping
Any wave with more than 10% invalid outputs stops the study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted.

## Budget
Study cap [US$ redacted] reserved wave by wave in the shared cumulative ledger (cap [US$ redacted]). Approved by the owner on 2026-11-11 (request to launch as many independent batches as possible).

## Limits stated in advance
The intraclass correlation mixes task difficulty within a level with sampling noise; that is the quantity the model uses, but it is not a pure measure of shared reasoning errors. Arithmetic without working space is a narrow task. DIVERSE varies presentation, not model or strategy.

## Amendment 1 (2026-11-11, before any V1 call)
The pessimistic reservation for all 480 requests (about [US$ redacted]) is above the [US$ redacted] study cap, so the freeze refused the study. V1 is submitted as two halves, `v1-vote-ident` and `v1-vote-diverse` (240 requests each), each a thin wrapper that sends one arm of the unchanged manifest. Tasks, prompts, scoring, predictions and analysis are unchanged; the combined analysis is `observatory/batch2/v1-vote/analyze.mjs`. Each half has its own frozen hash, which covers its request manifest.
