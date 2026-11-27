# V1 error correlation and voting: mostly uninformative (floor effect)

Preregistration `tasks/V1-VOTE-PREREG.md` (with amendment 1). Run 2026-11-11 on `claude-haiku-5-5`, batch API, as two studies of 240 requests (`v1-vote-ident`, `v1-vote-diverse`); all 480 succeeded and were valid. Usage estimate [US$ redacted] Combined analysis: `node observatory/batch2/v1-vote/analyze.mjs` → `summary.json`.

## Result

The task was too hard. Answering chained modular arithmetic with one integer and no working space, the model was right in 8% of identical samples and 10% of diverse ones.

| Operations | IDENT single | IDENT majority of 5 | DIVERSE single | DIVERSE majority of 5 |
|---|---|---|---|---|
| 2 | 0.30 | 0.38 | 0.33 | 0.38 |
| 3 | 0.13 | 0.13 | 0.15 | 0.13 |
| 4 | 0.00 | 0.00 | 0.07 | 0.00 |
| 5 | 0.03 | 0.00 | 0.03 | 0.00 |
| 6 | 0.00 | 0.00 | 0.00 | 0.00 |
| 8 | 0.03 | 0.00 | 0.00 | 0.00 |

Preregistered tests, read with the floor in mind:
- **P1 (H-01), supported, weakly.** Intraclass correlation of correctness 0.74 for identical samples (threshold 0.2). The estimate rests almost entirely on the 16 tasks with 2 or 3 operations, where a task tends to be answered right by all five samples or by none.
- **P2 (H-15), not supported.** Diverse presentations gave 0.69; the bootstrap interval of the difference is −0.25 to 0.36 and includes zero.
- **P3 (H-10), not supported.** At 2 operations the majority (0.38) was better than a single sample (0.30) although accuracy was below 0.5. With errors this correlated, the majority tracks the share of tasks the model can do, not the binomial of independent samples (which would give about 0.16).

## What can be kept

One observation survives the floor: where the model could sometimes answer (2 operations), success was a property of the task, not of the sample. Eight tasks, so this is an indication only.

## What to change (V1b)

A ladder the model can climb: 1 to 3 operations with smaller numbers, or a short working field, aiming at single-sample accuracy between 0.4 and 0.8 on most levels; more tasks per level. Diversity should vary strategy or model, not only the wording of the same question.

## Limits

Six levels of eight tasks, one model, thinking disabled, one answer format. The intraclass correlation mixes task difficulty within a level with shared errors.
