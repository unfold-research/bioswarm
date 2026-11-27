# CB2 a shared field against messaging on CooperBench: the shared remote recovers part of the loss, messaging does not, and one agent is still ahead

Preregistration `tasks/CB2-PREREG.md`. Run 2026-11-12 on the lab's build server, Docker backend. CooperBench at commit `63b9d44`, unmodified code, agent `mini_swe_agent`, Claude Haiku 5.5, the maintainers' `flash` subset: 50 feature pairs, 20 tasks, 11 repositories. One run per pair per arm. Per-pair data: `pairs.json` (written by `observatory/cooperbench/cb2-extract.py` from the harness's `result.json` and `eval.json`). Analysis: `node observatory/cooperbench/cb2-analyze.mjs` → `summary.json`. Trajectories and patches stay on the server (`~/cooperbench/CooperBench/logs/cb2-*`).

Front (`programs/historical/fronts.md`): intelligence, question I2.

## Result

A pair counts when the hidden tests of both features pass on the merged result.

| Arm | Both features pass | Share | Merge conflicts | Clean merges that pass | Cost (harness) | Agent steps |
|---|---|---|---|---|---|---|
| **solo**: one agent, both features | **29 of 50** | 0.58 | – | – | [US$ redacted] | 758 |
| **none**: two agents, no communication | 8 of 50 | 0.16 | 34 | 8 of 16 | [US$ redacted] | 1,100 |
| **messages**: two agents, messaging | 10 of 50 | 0.20 | 28 | 10 of 22 | [US$ redacted] | 1,396 |
| **field**: two agents, shared remote, no messaging | **19 of 50** | 0.38 | 23 | 17 of 25 | [US$ redacted] | 1,548 |

Two pairs of the field arm have no result (see deviations) and are scored as failed, as registered. In the messages arm the agents exchanged 1 to 16 messages per pair (median 5).

| Test | Difference | Interval, resampling the 20 tasks | Resampling pairs | Pairs won by each side | Result |
|---|---|---|---|---|---|
| H1 field − messages | +0.18 | 0.07 to 0.32 | 0.08 to 0.30 | 9 / 0 | **supported** |
| H2 messages − none | +0.04 | 0.00 to 0.12 | −0.06 to 0.14 | 4 / 2 | **supported** (messaging adds nothing detectable) |
| H3 field − none | +0.22 | 0.10 to 0.37 | 0.12 to 0.34 | 11 / 0 | **supported** |
| H4 best coop arm (field) − solo | −0.20 | −0.37 to 0.00 | −0.36 to −0.04 | 4 / 14 | **supported** (no coop arm above solo) |

Not registered as tests: messages − solo −0.38 (−0.53 to −0.24); none − solo −0.42 (−0.57 to −0.28).

Leaving the two pairs without a result out of every arm (48 pairs: solo 28, none 8, messages 10, field 19) changes no verdict: H1 +0.19 (0.07 to 0.32), H3 +0.23 (0.11 to 0.38), field − solo −0.19 (−0.35 to 0.00).

## Reading

- **Seeing and merging the other's work does what talking does not.** Every pair that passed with messaging or with no communication also passed with the shared remote, and the remote added nine and eleven more. It is the largest effect of a coordination medium the lab has measured, and the first on real repositories.
- **Messaging is close to no communication.** Twenty per cent against sixteen, four pairs won and two lost, at 44% more cost. The interval by task starts at zero, so the registered verdict stands by the narrowest margin; the benchmark's authors report the same for frontier models.
- **The loss is a merge problem and the field attacks it there.** Without communication 34 of 50 pairs ended in a merge conflict, and every conflict was a failure. Messaging lowered that to 28, the shared remote to 23. The remote also raised the share of clean merges whose tests pass: 17 of 25, against 10 of 22 and 8 of 16. Two field pairs passed even though the final merge reported a conflict, because one agent's branch already contained the other's work.
- **One agent is still ahead, at less than half the cost.** Solo passed 29 pairs for [US$ redacted]; the field arm 19 for [US$ redacted] The shared remote recovered about half of the gap between no communication and solo (0.16 → 0.38 of 0.58). Four pairs passed with the field and not solo; fourteen the other way.
- **For the paper's atlas**, row VI (termites: the work product as the trace) now has evidence with its bound: a shared artefact removes part of the coordination loss that messages leave, on a task one agent does better alone.

## Deviations and corrections

1. **Infrastructure failures and the rerun.** In the first pass the agents of 8 solo pairs and 11 field pairs never started: `docker run` timed out after 120 seconds while the task image was being pulled (the server's images had been removed by an unrelated clean-up before the run). The messages and none arms had none. As registered, the 19 pairs were run once more; the first-pass folders are kept on the server under `logs/cb2-solo-infrafail` and `logs/cb2-field-infrafail`. The rerun used concurrency 2 instead of 3.
2. **Two field pairs failed twice** (`dottxt_ai_outlines_task/1655` features 6 and 7; `dottxt_ai_outlines_task/1706` features 4 and 6), the second time because the harness's git server container had been removed by the operator between the passes and was not found when the rerun began. They are scored as failed in the field arm, as registered, which works against the hypothesis; the sensitivity line above leaves them out.
3. **Interim counts quoted before the rerun were wrong for two arms.** Solo was reported as 22 of 50 and the field as 16 of 50; those counts included the pairs whose agents never ran. The figures are 29 and 19.
4. **Tokens are not reported.** The registration promised tokens summed from the trajectories; the harness writes zero token counts for this model and the trajectories were not parsed. Cost as the harness reports it ([US$ redacted] and 0.50 per million tokens) and agent steps stand in for them.
5. **The fourth cell** (messages and shared remote) was not run.
6. **Whether and when the agents fetched and merged** was not measured: the commands appear in the harness's own prompt, so counting them in the trajectories does not separate use from instruction.

## Spend

[US$ redacted] as the harness reports it, against the ceiling of [US$ redacted]: smoke run 0.03, solo 0.99, messages 1.88, none 1.31, field 2.24 (the solo and field figures include the rerun). Outside the shared batch ledger, as approved.

## Limits

One run per pair, one small model, fifty pairs. The arms are not matched in cost: the coop arms are two agents, each with its own step limit. The field arm is the harness's git mode with a prompt written by the benchmark's maintainers to make agents push, fetch and merge; the result shows that a shared, visible work product removes part of the loss, not that agents take up such a medium unprompted. The comparison is between media for two agents, on tasks where one agent is better: it says nothing about a collective exceeding one agent. Wall-clock is not comparable across arms (the field arm ran partly at lower concurrency).
