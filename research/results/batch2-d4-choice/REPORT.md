# D4 agents that read the marks and choose: they follow the signal and do not explore

Preregistration `tasks/C1B-D4-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled, as `d4-marks` and `d4-blind`; 2,160 requests each, all succeeded. Usage estimate [US$ redacted] each. Analysis: `node observatory/batch2/d4-choice/analyze.mjs` → `summary.json` here. Same 60 collections as R2b, paired by collection.

## Result

Edited condition; every regime was right on 60 of 60 when nothing changed.

| Regime | Who chooses where to re-count | Correct, edited | Edited parts re-read (of 3) | US$ |
|---|---|---|---|---|
| D4 marks | each worker, from the marks near it | 35 of 60 (0.58) | 1.52 | [redacted] |
| D4 blind | each worker, without the `changed` mark | 28 of 60 (0.47) | 1.35 | [redacted] |
| R2b alarm rule | a seeded rule in the harness | 42 of 60 (0.70) | 1.83 | [redacted] |
| R2b orchestrator | one model reading the whole board | 45 of 60 (0.75) | 2.17 | [redacted] |
| R2b fixed schedule | nobody | 29 of 60 (0.48) | 1.40 | [redacted] |

| Test | Verdict |
|---|---|
| P1 the agents use the marks (marks against blind) | **supported**: +0.12, interval 0.02 to 0.22 |
| P2 agents choosing do as well as the rule in the harness | **not supported** as a difference: −0.12, interval −0.27 to 0.03 |
| P3 agents choosing beat the best fixed schedule | **not supported**: +0.10, interval −0.08 to 0.28 |
| P4 nothing is lost when nothing changed | **supported** |

Against the orchestrator, agents choosing were worse: −0.17, interval −0.32 to −0.02 (reported, not a registered test).

## What the workers did

- With a changed part in view (77 choices), they went to a fresh neighbour of it in 90% of cases, and their working says why ("parts 0 and 2 are adjacent to the changed part and unchecked").
- They asked to be sent elsewhere in 3 of 720 choices. In the first round all 240 chose a part beside them. They never chose a part already re-counted.

## Reading

- The agents can carry the response half of the rule. Shown a mark, a small model does what the harness rule does, nine times in ten, with no instruction other than the fact that edits tend to be local.
- They did not carry the exploration half. The harness rule draws at random over the whole ring when there is no alarm; the agents, seeing five parts, stayed among them. Two workers confined to their neighbourhoods find the edited block less often, and that is the whole gap: 1.52 edited parts re-read against 1.83.
- So the answer to the paper's decision A2 is split. A local rule can live in the agent when it is a response to a signal. Search, the part that needs randomness and a view of what has not been visited, was better kept in the substrate. The orchestrator, which sees the whole board, was better than agents with a local view by 0.17.
- Cost: choosing took one extra call per re-count, 17% more than the harness rule, for a worse result.

## Limits

- The comparison with R2b regimes uses collections whose R2b results were known when this was registered.
- The workers were offered "elsewhere" as an option without being told that staying local limits coverage; a prompt that explained the trade might change the result, and so might a larger neighbourhood. One wording, one radius.
- "Elsewhere" is still drawn by the harness. One model, one task, sixty collections, locality built into the edit.
