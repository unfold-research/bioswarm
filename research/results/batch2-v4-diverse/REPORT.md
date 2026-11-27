# V4 different agents: a better member helps, difference by itself does not

Preregistration `tasks/V4-DIVERSE-PREREG.md`. Run 2026-11-11: 540 requests on `claude-haiku-5-5` (`v4-diverse`) and 90 on `claude-sonnet-5-5` (`../batch2-v4-diverse-sonnet/`), all succeeded and valid, none truncated. Usage estimate [US$ redacted] and [US$ redacted] `summary.json` and `combined.json` (from `observatory/batch2/v4-diverse/analyze.mjs`).

## Result

Each agent alone, over 90 tasks: base wording with 20 words of working 0.59, 0.66 and 0.62 (three samples); wording b (text lines) 0.77; wording c (checklist) 0.59; base with 60 words 0.79; Sonnet 5.5 answer-only with adaptive thinking at low effort 0.74.

| Collective of three | Members | Accuracy | Members disagree on |
|---|---|---|---|
| copies3 | base, base, base | 0.69 | 51% of tasks |
| wordings3 | base, b, c | 0.70 | 66% |
| mixed3 | base, b, base with 60 words | 0.79 | 50% |
| models3 | base, b, Sonnet | 0.77 | |

| Test | Verdict |
|---|---|
| P1 (H-15) different wordings beat copies | **not supported**: +0.01, interval −0.07 to 0.09 |
| P2 a mix of wording and budget beats copies | **supported**: +0.10, interval 0.02 to 0.19 |
| P3 replication of V3: copies beat one agent | **supported**: +0.10, interval 0.04 to 0.17 |
| P4 a second model in the collective beats copies | **not supported**: +0.08, interval 0.00 to 0.16 |
| P5 the stronger model alone beats the collective it sits in | **not supported**: −0.02 |

## Reading

- Different wordings made the members disagree more and the vote no better. The collective that did beat copies contained a better member (60 words of working, 0.79 alone) and scored exactly what that member scores alone. H-15 is not supported here: what helped was capability inside the collective, not difference.
- The gain of copies over one agent replicated (+0.10).
- Sonnet 5.5 answering directly at low effort (0.74) was below Haiku with 60 words of working (0.79) and well below Haiku with 150 words in M7 (0.91). On this task the amount of reasoning spent matters more than which of the two models spends it. The Sonnet arm cost about three times the whole Haiku study.

## Limits

One synthetic task, 90 tasks, three hand-written wordings. Sonnet was run answer-only at low effort because that is how it was used as the "second model" in M5 and M6; a Sonnet arm with explicit working or higher effort was not run.
