# M7 selection among five: the verifier beats the vote, and one deeper agent is level with both at a fraction of the cost

Preregistration `tasks/M7-SELECT-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled: 720 + 153 requests, all succeeded and valid, none truncated. Usage estimate [US$ redacted] `summary.json` in this folder.

## Result

| Records | single | vote5 | verify3 | select5 | deep (1 call) | deepvote3 | any of 5 right |
|---|---|---|---|---|---|---|---|
| 48 | 0.83 | 0.93 | 0.93 | 0.97 | 0.90 | 0.97 | 0.97 |
| 96 | 0.67 | 0.73 | 0.73 | 0.87 | 0.93 | 0.90 | 0.90 |
| 144 | 0.57 | 0.70 | 0.67 | 0.77 | 0.90 | 0.97 | 0.87 |
| all | 0.69 | 0.79 | 0.78 | 0.87 | 0.91 | 0.94 | 0.91 |

| Test | Verdict |
|---|---|
| P1 (H-M03) selecting by verifier beats voting on the same five | **supported**: +0.08, interval 0.01 to 0.14 |
| P2 more candidates help the verifier | **supported**: +0.09 over verify3, interval 0.03 to 0.16 |
| P3 one deeper agent beats the selected collective | **not supported**: +0.04, interval −0.04 to 0.13 |
| P4 a vote among deep agents adds to one | **not supported**: +0.03, interval −0.02 to 0.09 |

Verifier: accepted 81 of 82 correct answers, rejected 60 of 71 wrong ones. select5 used 1.7 verifier calls per task on average; on 5 tasks nothing was accepted.

## Reading

- H-M03 holds a second time among reasoning agents: with the same five candidates, a verifier that picks recovers most of what a vote leaves (0.87 against 0.79, with 0.91 as the ceiling of "some candidate is right").
- With the output limit lifted, one agent writing up to 150 words reached 0.91 in a single call and no longer fell at 144 records (0.63 in V3, 0.90 here). The collective of five short-working agents plus a verifier (about seven calls) did not beat it.
- So far the ranking on this task is: one deep agent ≥ verified selection among shallow agents > vote among shallow agents > one shallow agent. Each step up the list in V3 and M7 came from more reasoning per decision, placed either in the agent or in the verifier.

## Limits

One model, one synthetic task, copies of one prompt, 90 tasks. The deep agent is not token-matched to the collectives; it is cheaper. The differences between deep, deepvote3 and select5 are inside the noise of 90 tasks.
