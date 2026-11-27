# V6 a second task: working space and verification carry over; the vote and the small-model advantage do not

Preregistration `tasks/V6-SECOND-PREREG.md`. Run 2026-11-11: 540 + 90 requests on `claude-haiku-5-5` (`v6-second`) and 180 on `claude-sonnet-5-5` (`../batch2-v6-second-sonnet/`), all succeeded and valid, none truncated. Usage estimate [US$ redacted] and [US$ redacted] `summary.json` and `combined.json` (from `observatory/batch2/v6-second/analyze.mjs`).

## Result

Counting by group, 90 tasks.

| Records | Haiku direct | single (20 words) | vote3 | verify3 | 60 words | 150 words | Sonnet direct | Sonnet 60 words |
|---|---|---|---|---|---|---|---|---|
| 24 | 0.77 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| 48 | 0.47 | 0.70 | 0.70 | 0.77 | 1.00 | 1.00 | 1.00 | 1.00 |
| 96 | 0.33 | 0.37 | 0.23 | 0.33 | 0.40 | 0.83 | 0.90 | 1.00 |
| all | 0.52 | 0.69 | 0.64 | 0.70 | 0.80 | 0.94 | 0.97 | 1.00 |

| Test (the result it replicates) | Verdict |
|---|---|
| P1 (V2) working beats answering directly | **supported**: +0.28, interval 0.17 to 0.39 |
| P2 (V3) a vote helps agents that reason | **not supported**: −0.04, interval −0.11 to 0.01 |
| P3 (V3, M7) verifying beats voting | **supported**: +0.06, interval 0.01 to 0.11 |
| P4 (V5) a small model that reasons beats a large one that answers directly | **not supported**: −0.02 |
| P5 (V5) explicit working helps the stronger model | **not supported**: +0.03, interval 0.00 to 0.08 (ceiling) |

Verifier: accepted 58 of 62 correct answers, rejected 27 of 28 wrong ones. The three short-working samples differed on 23% of tasks.

## Reading

What carried over from the search task:
- Working space is the largest gain for the small model, and more working keeps helping: 0.52, 0.69, 0.80, 0.94 for none, 20, 60 and 150 words.
- A verifier beats a vote at the same number of calls, and is accurate (0.94 and 0.96).
- One deep agent (0.94 in one call) is above every collective of shallow agents.

What did not:
- **The vote.** Three samples were no better than one and at 96 records worse (0.23 against 0.37): when most samples are wrong, the plurality is a wrong answer. The gain of a vote in V3 and V4 (+0.09, +0.10) is a property of that task's error pattern, not a general one.
- **The small model's advantage over a large model answering directly.** On this task Sonnet at low effort is right 0.97 of the time without a working field (it wrote more hidden reasoning here than on the search task), and Haiku with 150 words reaches 0.94. V5's ordering does not generalise; what generalises is that working space helps whichever model lacks it.

Cost per call: Haiku 0.00014 to 0.00023 dollars, Sonnet 0.0033 to 0.0038. Haiku with 150 words gets 0.94 for about a fourteenth of Sonnet direct at 0.97.

## Limits

Two synthetic tasks now, sharing a record format. The 96-record size is near the floor for short working, which is where the vote hurt. Sonnet's arms are at or near ceiling, so P5 cannot show anything.
