# T2 redundancy preregistration: how many times should a task be done? (2026-11-12)

Registered before any paid call of these studies. Owner instruction of 2026-11-12 ("Sim, redundância"), within the standing authorisation for the shared ledger. Code: `observatory/batch2/t2r/protocol.mjs`, studies `t2r-first` and `t2r-more`, analysis `observatory/batch2/t2r/analyze.mjs`.

## Why
The map (`results/batch2-t2-map/REPORT.md`) found that giving parts of a task to several agents never beat one agent with the whole input. Read after the run, it also showed that two independent attempts of that one agent agree on 113 of 144 instances and are right on 112 of those, and disagree on 30 of 72 instances of the tasks where the agent fails and 1 of 72 where it does not. That was not registered. This study tests it on fresh attempts, and puts the three ways of deciding of `programs/historical/trigger.md` side by side on the question the map left: not how many agents share a task, but how many times it is done.

## Setting
- The 288 instances of the map: I-01 Global Max, I-05 Range Count, I-06 XOR Checksum, III-22 Global Median at 4, 8 and 16 shards, 24 per cell.
- **Five independent attempts** per instance, each the map's single-agent request unchanged (Claude Haiku 5.5, adaptive thinking, effort high, 16,000 output tokens, no tools). A test checks that the requests are identical to the map's. Earlier attempts on these instances are not used.
- **A judge** (the same model, thinking, effort high) reads attempt 1: the task statement, the agent's working and its answer, not the data. It answers accept or repeat. It is told that repeating costs as much as the first attempt and that an accepted wrong answer is a failure.
- Every policy is computed on the five attempts in their fixed order:

| Policy | Kind of trigger | Rule |
|---|---|---|
| one | fixed | attempt 1 |
| three, five | fixed | the most common answer of the first three or five; a tie for first place is no answer |
| **agree** | threshold | two attempts; if they differ, one more at a time, up to five; the first answer two attempts share. No answer if none does |
| **judge** | central | if the judge accepts, attempt 1; if it says repeat, the agree rule |

Cost of a policy on an instance is every billed token of the attempts it used, plus the judge's call for the judge policy.

## Predictions and decision rules
Paired by instance, bootstrap of 4,000 draws; *supported* if the 95% interval is above zero, *refuted* if below, unless stated. Falling tasks are Range Count and XOR Checksum (144 instances); controls are Global Max and Global Median (144).
- **P1, agreement means right**: among instances where attempts 1 and 2 give the same answer, the share right. *Supported* if it is 0.95 or more and the lower end of its interval is 0.90 or more.
- **P2, the stimulus is quiet on the controls**: attempts 1 and 2 differ on at most 0.05 of control instances. *Supported* if the upper end of the interval is below 0.10.
- **P3, the threshold trigger beats one attempt where the agent fails**: agree minus one, on the falling tasks.
- **P4, and matches three fixed attempts for less**: agree minus three, on all 288; *supported* unless the interval is below zero. Mean attempts used are reported; the claim "for less" holds if agree uses fewer than three on average.
- **P5, a central judge is not better than the threshold**: judge minus agree, on all 288; *supported* unless the interval is above zero. Reported with the judge's cost.

P1 and P2 restate an observation already seen once, so they are replications. P3 to P5 are fresh.

## Reported
For every policy, by task, by size and overall: share right, share with no answer, mean attempts, mean tokens, cost per right answer. The judge's verdicts against the truth (how often it accepts a wrong attempt and repeats a right one). How often two wrong attempts give the same wrong answer, which is what would break the agree rule. The share of instances on which any of the five attempts is right, as the ceiling.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study; a cut reply is wrong and not invalid; an invalid verdict of the judge counts as repeat. Any missing, duplicated, failed or unpriced provider result stops that study with its reservation kept. No request is resubmitted. Each study is under the [US$ redacted] cap of `observatory/batch2/run2.mjs`, in the shared ledger (cap [US$ redacted]; [US$ redacted] committed).

## Limits stated in advance
- One model, one wording, one effort level, four algorithmic tasks without tools.
- Attempts are identical requests; nothing is varied between them. Whether varying the wording would lower shared errors further is not tested.
- The attempt order is arbitrary and fixed; policies that stop early use the first attempts. No resampling over orders is registered.
- The judge sees the working and not the data. A judge with the data would be redoing the task; that arm is the second attempt.
- 24 instances per cell: single cells are descriptive.
