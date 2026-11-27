# M7 preregistration: selection among five candidates by a verifier, against a deeper single agent (H-M03, H-02)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/m7-select/protocol.mjs`. Claude Haiku 5.5, thinking disabled.

## Why
V3: among agents with working space, at least one of five samples was right on 0.92 of tasks, and the best strategy (verify the first answer, fall back on the second) reached 0.82. One agent with 150 words of working reached 0.86 but six outputs hit the 512-token limit. M7 verifies every candidate and lifts the limit for the deep agent.

## Task and calls
Search task with 48, 96 and 144 records, 30 tasks each, seeds 20001 to 20090.
- Wave 0, per task: five searchers with at most 20 words of working (s0 to s4); three searchers with at most 150 words and a 1,536-token output limit (d0 to d2).
- Wave 1: a verifier with at most 40 words of working on every distinct record id among s0 to s4.

## Strategies
single = s0. vote5 = plurality of s0 to s4, ties to the earliest. verify3 = s0 if accepted, otherwise s1. select5 = the first accepted answer in sample order; if none is accepted, the plurality. deep = d0. deepvote3 = plurality of d0 to d2.

## Analysis set
All 90 tasks. V3 placed all three sizes inside the band for the same searcher.

## Predictions and decision rules
Per-task differences, seeded bootstrap over tasks (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **P1 (H-M03), selecting by verifier beats voting on the same five.** select5 minus vote5.
- **P2, more candidates help the verifier.** select5 minus verify3.
- **P3, one deeper agent beats the selected collective.** deep minus select5.
- **P4, a vote among deep agents adds to one.** deepvote3 minus deep.

Reported: verifier calls used by select5, tasks where nothing was accepted, verifier specificity and sensitivity, truncated outputs, output tokens.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap.

## Limits stated in advance
One model, one synthetic task, copies of one prompt. select5 costs five searcher calls and up to five verifier calls against one call for deep; the comparison is of accuracy, with cost reported.
