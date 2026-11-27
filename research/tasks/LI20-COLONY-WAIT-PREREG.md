# LI20 preregistration: waiting for the trace inside the Colony, on the runtime fleet, with a second model family (2026-11-18)

**Status:** registered 2026-11-18 before any LI20 data. Real Colony agents (Pi engine, tools, shell, files) on generated repositories (`observatory/batch2/colony/materialize.mjs`, as LI15), model **gpt-6-luna** (OpenAI, ChatGPT subscription; the first study of the line outside the Claude family), run on the headless lab runtimes on benchhost (Colony `d0c8830`, `colony/docs/lab-fleet.md`), 2 runtimes with 2 teams each, in parallel with sweep 2 (rule 9).

## Why

LI16 found, with Haiku in the batch runner, that agent-written traces match a manager agent on fresh inputs when the owner of a helper acts only once the trace arrives (signal, not symptom), with fewer tokens. LI15 tried the field inside the Colony, but its review found the comparison confounded: market teams stalled when their message budget between ants ran out and the parent asked the person a question; the field had an extra uncapped channel; two pairs got their task wrong. LI20 fixes all three and uses the LI16 rule.

## Design

- **Arms:** `market` (Colony default: parent delegates to 4 ants who talk by `ant_send`) and `fieldwait` (the field, mode `wait`: each ant owns its files, asks for what it needs with `field_trace`, and does not change a function of its own that others use from the failing examples, only once the trace arrives).
- **Equal conditions:** the same message budget between ants for both arms (`antLimits` 200 per request, 60 per pair: well above what LI15's teams used), and the same instruction to both: an automatic study, nobody answers questions, decide and finish. Task delivery by the bench fix for concurrent `say` (Colony `ae25657`).
- **Cases:** 8 per size, k = 24 (seeds 20000 to 20007) and k = 40 (seeds 20400 to 20407); 8 test inputs per check; 45 minutes cap per team; done after 3 minutes without a running chat.
- **Configs:** `observatory/batch2/colony/li20-k24.json`, `li20-k40.json`. Scoring: `evaluate.mjs` (strict check and 40 fresh inputs per check). Verdicts: `analyze-li20.mjs`. Review: `docs/reviews/REVIEW-PROMPT.md`.

## Hypotheses (16 paired cases; the case is the unit)

- **H-LI68 (primary).** `fieldwait` leaves fewer checks failing on fresh inputs than `market` in more cases (sign test p < 0.05). Refuted if `market` is lower in more cases.
- **H-LI69 (secondary).** `fieldwait` finishes sooner (wall-clock) in more cases.
- **H-LI70 (secondary).** `fieldwait` uses fewer tokens, cached input included, in more cases.

Holm on the secondary hypotheses. Also reported: stalls, solved, hold-out passes, traces, blocked edits, capped runs.
