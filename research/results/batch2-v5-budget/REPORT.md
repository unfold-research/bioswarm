# V5 working budget against model: both matter, and working is the cheaper of the two

Preregistration `tasks/V5-BUDGET-PREREG.md`. Run 2026-11-11: 180 requests on `claude-haiku-5-5` (`v5-budget`) and 180 on `claude-sonnet-5-5` (`../batch2-v5-budget-sonnet/`), all succeeded and valid, none truncated. Usage estimate [US$ redacted] and [US$ redacted] `combined.json` from `observatory/batch2/v5-budget/analyze.mjs`.

## Result

Sixty tasks of 48, 96 and 144 records. Costs are batch list prices from returned tokens.

| Agent | Accuracy | Output tokens | US$ per call | US$ per correct answer |
|---|---|---|---|---|
| Haiku, direct | 0.10 | 13 | [redacted] | [redacted] |
| Haiku, 60 words of working | 0.83 | 219 | [redacted] | [redacted] |
| Haiku, 150 words | 0.87 | 369 | [redacted] | [redacted] |
| Sonnet, direct | 0.70 | 30 | [redacted] | [redacted] |
| Sonnet, 60 words | 1.00 | 134 | [redacted] | [redacted] |
| Sonnet, 150 words | 1.00 | 219 | [redacted] | [redacted] |

| Test | Verdict |
|---|---|
| P1 explicit working helps the stronger model too | **supported**: +0.30, interval 0.18 to 0.42 |
| P2 a small model that reasons beats a large one that answers directly | **supported**: +0.17, interval 0.02 to 0.32 |
| P3 at equal working the model still matters | **supported**: +0.13, interval 0.05 to 0.22 |

## Reading

- Working space is worth more than the step from Haiku to Sonnet when the larger model answers directly (0.87 against 0.70), and it costs about a twentieth per correct answer.
- With the same working the larger model is better and here perfect (60 of 60 at every size). Reasoning and capability add up; neither replaces the other.
- Sonnet's adaptive thinking at low effort did almost no reasoning by itself on this task (30 output tokens, 0.70). A written working field of 60 words took it to 1.00. Low effort plus a direct answer is a poor way to use the larger model.
- For a design that mixes models: the cheap default is the small model with working ([US$ redacted] per correct answer, 0.83 to 0.87); the large model with working is what closes the remaining gap, at fifteen times the cost.

## Limits

Sixty tasks, one synthetic task. The Sonnet arms keep adaptive thinking on, so its working arms combine hidden and written reasoning.
