# R1 preregistration: replication on Claude Sonnet 5.5

Registered 2026-11-11, before any paid call. Six studies replicate Haiku studies with identical cases, prompts and scoring on `claude-sonnet-5-5`: `b1-endpoints-sonnet`, `m3-verifier-sonnet`, `d1-defence-sonnet`, `i1-transplant-triage-sonnet`, `i1-transplant-research-sonnet`, `i1-transplant-review-sonnet`. Wrapper and request changes: `observatory/batch2/remodel.mjs`.

## Why
Every result so far comes from one small model. A finding that holds on a second, stronger model is a property of the situation more than of the model.

## What differs from the Haiku runs
Sonnet 5.5 does not accept disabled thinking, so adaptive thinking is on, with effort low and 2,048 output tokens. The Haiku runs had no thinking. A difference between the two runs therefore mixes model and thinking; this replication cannot separate them.

## Analysis
The preregistered rules of each original study apply unchanged to its replication (`tasks/B1-ENDPOINTS-PREREG.md`, `tasks/M3-VERIFIER-PREREG.md`, `tasks/D1-DEFENCE-PREREG.md`, `tasks/I1-TRANSPLANT-PREREG.md`; the I1 replication is analysed across its three families the same way). Agreement between models is reported per endpoint, descriptively.

## Prediction
The qualitative pattern of each study repeats: the same calibration labels in B1, the same supported or not-supported status of each prediction in M3, D1 and I1.

## Stopping
More than 10% invalid outputs stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. A refusal counts as an invalid output.

## Budget
Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Owner instruction of 2026-11-11 to submit several batches. Pessimistic reservation about [US$ redacted] in total at Sonnet batch list prices.

## Limits stated in advance
Two models from one provider. The replications were designed before the Haiku results of M3, D1 and I1 were known; B1 on Haiku was known.
