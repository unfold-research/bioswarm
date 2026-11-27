# T2 redundancy: a second attempt, and a third only when they differ, beats one attempt, three, five and a judge

Preregistration `tasks/T2R-REDUNDANCY-PREREG.md`. Run 2026-11-12: studies `t2r-first` and `t2r-more`, 1,440 attempts and 288 judge calls, Claude Haiku 5.5 with adaptive thinking at high effort, no invalid reply, [US$ redacted] (shared ledger at [US$ redacted] of 50, nothing open). Analysis: `node observatory/batch2/t2r/analyze.mjs` → `analysis.json` here.

One agent with the whole input answers each of the 288 instances of the map five times, independently. Every policy is computed on those five attempts in their fixed order.

| Policy | Kind | All 288 right | Falling tasks, of 144 | Controls, of 144 | No answer | Attempts used | Tokens | Cost per right answer |
|---|---|---|---|---|---|---|---|---|
| one attempt | fixed | 251 (0.87) | 111 (0.77) | 140 (0.97) | 1 | 1 | 3,968 | [US$ redacted] |
| **agree**: repeat until two attempts share an answer | threshold | **277 (0.96)** | **133 (0.92)** | **144 (1.00)** | 2 | 2.24 | 9,265 | [US$ redacted] |
| most common of three | fixed | 267 (0.93) | 124 (0.86) | 143 (0.99) | 15 | 3 | 11,913 | [US$ redacted] |
| most common of five | fixed | 271 (0.94) | 128 (0.89) | 143 (0.99) | 6 | 5 | 19,837 | [US$ redacted] |
| judge reads attempt 1, then agree if it says repeat | central | 255 (0.89) | 112 (0.78) | 143 (0.99) | 0 | 1.06, plus the judge | 5,424 | [US$ redacted] |

Falling tasks are Range Count and XOR Checksum; controls are Global Max and Global Median. On at least one of the five attempts the answer is right for 284 of 288 instances.

| Prediction | Result |
|---|---|
| P1 agreement means right: when attempts 1 and 2 give the same answer | **supported**: right on 239 of 240, 0.996 (0.988 to 1.00) |
| P2 the stimulus is quiet on the controls | **supported**: attempts 1 and 2 differ on 4 of 144, 0.03 (0.01 to 0.06) |
| P3 the threshold trigger beats one attempt where the agent fails | **supported**: +0.15 (0.09 to 0.22) |
| P4 it matches three fixed attempts for less | **supported**, and more: +0.035 (0.017 to 0.056) with 2.24 attempts against 3 |
| P5 a central judge is not better than the threshold | **supported**: −0.08 (−0.11 to −0.05) |

P1 and P2 replicate, on fresh attempts, what was seen without registration in the map.

## Reading

- **Disagreement between two attempts is the stimulus.** It fired on 48 of 288 instances: 44 of 144 on the tasks where the agent fails and 4 of 144 on the controls. When the first attempt was wrong it fired in 36 of 37 cases. No part of the prompt, the harness or a second model produced this signal; it is the agent compared with itself.
- **The threshold trigger is ahead of every fixed size.** It is right on 277 where three attempts are right on 267 and five on 271, and it uses 2.24 attempts on average: 240 instances stop at two, 33 at three, 10 at four, 3 at five. Part of the fixed policies' deficit is the registered rule that a tie is no answer (15 ties among three). The trigger spends its extra attempts only on those instances.
- **The central judge is close to useless, as the earlier verifier results said.** It accepted 31 of the 37 wrong first attempts and asked to repeat 5 right ones. It reads the working and not the data, and a confident wrong count reads like a right one. It costs about a third of an attempt and buys 4 more right answers of 288.
- **Agreement reached late is weaker.** When the first two attempts agree the answer is right on 239 of 240. When they differ and a later pair agrees, it is right on 38 of 46. Of the 9 wrong answers the trigger accepts, 8 are of that second kind. All 11 of its misses (9 wrong, 2 with no answer) are on Range Count and XOR Checksum: 2 at 4 shards, 3 at 8 and 6 at 16. Wrong attempts are not independent: of 131 pairs of wrong attempts on the same instance, 53 give the same wrong answer. The rule works because first-pair agreement on a wrong answer is rare, not because errors never coincide.
- **By size the gain grows with the difficulty.** At 4 shards the trigger adds 2 right answers to 92 of 96; at 8, 9 to 84; at 16, 15 to 75. On XOR Checksum at 16 shards one attempt is right on 13 of 24 and the trigger on 22, using 2.9 attempts.
- **The price of the signal is one attempt.** The trigger always pays for two. On the controls that second attempt costs as much as the first and turns 140 right into 144. Nothing tested here says in advance, for free, that an instance needs it: the judge was the attempt at that and failed.

## What it means for the question of T2

Question P-4 of the plan asked how the trigger should decide: a fixed size, a central decision, or recruitment on a threshold. On this benchmark and model, with all three compared on the same attempts:

| Way of deciding | Best case here | Right | Cost in attempts |
|---|---|---|---|
| Fixed | five attempts | 0.94 | [redacted] |
| Central | a judge of the first reply | 0.89 | about 1.4 |
| Threshold | repeat until two agree | 0.96 | [redacted] |

The threshold is the most accurate and cheaper than any fixed size above one. Together with the map this gives the shape of the answer: **what unfolds is the number of attempts, not the number of parts.** Splitting the work lost everywhere; repeating it and comparing won, and the comparison is also the signal that says when to repeat.

It also restates "a swarm of size one by default". With this agent the default that works is two, because the only reliable signal found needs a second attempt to exist.

## Limits

- One model, one wording, one effort level; four algorithmic tasks with exact integer answers and no tools. An exact answer is what makes "the same answer" a sharp test; tasks with free-form answers need a different comparison, and nothing here says the signal survives that.
- Attempts are identical requests. Whether varied wording lowers the 53 of 131 shared wrong answers was not tested.
- The attempt order is arbitrary and fixed; no resampling over orders was registered, so the 2.24 and the counts are for this order.
- The judge saw the working and not the data. A judge with the data is a second attempt.
- 24 instances per cell: single cells are descriptive.
- The stopping rule of the trigger (two that agree) was fixed in advance and is the only one tested. Requiring a third confirmation after a disagreement would address the weaker late agreement, at more cost; that is the next rule to try.
