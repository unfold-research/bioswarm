# V7 deep agents on a task they do not saturate: the collective adds nothing; the larger model does

Preregistration `tasks/V7-HARD-PREREG.md`. Run 2026-11-11: 270 + 118 requests on `claude-haiku-5-5` (`v7-hard`) and 90 on `claude-sonnet-5-5` (`../batch2-v7-hard-sonnet/`), all succeeded and valid, none truncated. Usage estimate [US$ redacted] and [US$ redacted] `summary.json` and `combined.json` (from `observatory/batch2/v7-hard/analyze.mjs`).

## Result

Counting by group, 90 tasks.

| Records | deep (1 call) | vote of 3 deep | verified selection among 3 | any of 3 right | escalate to Sonnet | Sonnet with 60 words |
|---|---|---|---|---|---|---|
| 96 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| 144 | 0.60 | 0.57 | 0.67 | 0.70 | 0.87 | 0.87 |
| 168 | 0.33 | 0.33 | 0.33 | 0.47 | 0.73 | 0.83 |
| all | 0.64 | 0.63 | 0.67 | 0.72 | 0.87 | 0.90 |

| Test | Verdict |
|---|---|
| P1 verified selection adds to a deep agent | **not supported**: +0.02, interval −0.03 to 0.08 |
| P2 a vote among deep agents adds to one | **not supported**: −0.01 |
| P3 selection beats the vote | **not supported**: +0.03, interval −0.01 to 0.08 |
| P4 escalating rejected answers to the larger model adds | **supported**: +0.22, interval 0.14 to 0.31 |

Verifier with 150 words of working: accepted 47 of 65 correct answers (0.72), rejected 43 of 53 wrong ones (0.81). The three deep samples differed on 29% of tasks. Cost per call: Haiku deep 0.0004 dollars, Sonnet 0.0078.

## Reading

- This was the test with room: the deep agent alone was at 0.64. More deep agents of the same model did not move it, by vote or by verified selection. When the three samples were all wrong, which was most of the failures (any of three right: 0.72), there was nothing to select.
- The verifier of the same model, which was near perfect on easier sizes (M6, V6), fell to 0.72 and 0.81 here. Checking a count over 144 or 168 records is as hard for it as producing one.
- What helped was the larger model. Sending the 44% of answers the verifier rejected to Sonnet gave 0.87, close to Sonnet on everything (0.90), for about half the Sonnet calls.
- With M8 and V6 this closes a line: on these tasks a collective of copies never beat its member by more than the noise once the member reasons deeply, whether the member was near ceiling (M8) or far from it (V7). The gains came from reasoning per agent and from capability. A verifier is useful as a router to a stronger model, not as a way to choose among equals.

## Limits

One synthetic task, copies of one prompt, 90 tasks. Sonnet has adaptive thinking. Sizes of 144 and 168 were not piloted and turned out steep (0.60, 0.33).
