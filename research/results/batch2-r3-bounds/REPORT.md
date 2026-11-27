# R3 boundaries: without locality, or with one false count on the board, the alarm rule falls below the fixed schedule, and the orchestrator falls with it

Preregistration `tasks/R3-D4B-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled, as seven studies (`r3-scatter-*`, `r3-poison-*`); 10,800 requests, all succeeded. Usage estimate [US$ redacted] Analysis: `node observatory/batch2/r3-bounds/analyze.mjs` → `summary.json` here. Sixty new collections per scenario; every regime was right on 60 of 60 in the stable condition of both.

## Scattered edits

| Regime | Correct, edited | Edited parts re-read (of 3) |
|---|---|---|
| sweep | 28 of 60 (0.47) | 1.47 |
| alarm rule | 17 of 60 (0.28) | 1.17 |
| orchestrator | 12 of 60 (0.20) | 1.10 |

## A false count on the board

| Regime | Correct, edited | Edited parts re-read (of 3) | Poisoned part re-read | Re-counts spent beside it |
|---|---|---|---|---|
| sweep | 23 of 60 (0.38) | 1.35 | 48% | 1.0 |
| alarm rule | 10 of 60 (0.17) | 1.47 | 2% | 2.5 |
| verify (confirm an alarm before acting) | 22 of 60 (0.37) | 1.32 | 98% | 0.8 |
| orchestrator | 16 of 60 (0.27) | 0.83 | 93% | 2.8 |

| Test | Verdict |
|---|---|
| P1 without locality the alarm rule loses its advantage | **supported**: −0.18 against the sweep, interval −0.37 to 0.00 |
| P2 the orchestrator copes with scattered edits better than the rule | **not supported**: −0.08; against the sweep it is worse, −0.27, interval −0.43 to −0.10 |
| P3 a false count removes the advantage of the alarm rule | **supported**: −0.22 against the sweep, interval −0.37 to −0.07 |
| P4 confirming an alarm before acting on it repairs the rule | **supported**: +0.20 over the alarm rule, interval 0.05 to 0.35; level with the sweep |
| P5 the orchestrator handles the false count better than the rule | **not supported**: +0.10, interval −0.05 to 0.25 |
| P6 nothing lost in the stable condition | supported |

The three code regimes landed on the figures their seeded schedules give with exact readers (scatter 0.47 and 0.28; poison 0.38, 0.17 and 0.38).

## Reading

- **The R2b advantage is an advantage under locality.** With the same budget and edits that are not neighbours, following alarms to neighbours wastes re-counts and the fixed schedule is better. The rule is a bet on the structure of change; when the bet is wrong it costs.
- **A model coordinator did not escape the bet.** Told that edits tend to be local, the orchestrator did worse than the rule in the scattered case and worse than the plain schedule. It did not notice, within three rounds, that the neighbours it sent analysts to came back unchanged. Being a model with the whole board in view did not buy adaptation here.
- **One false count is enough to turn the rule against itself.** The alarm rule almost never re-read the poisoned part (2%) and spent 2.5 of its 6 re-counts beside it. The orchestrator did re-read it (93%), then kept investigating around it (2.8 re-counts) and reached fewer edited parts than any other regime.
- **A cheap defence in code worked.** Re-reading an alarmed part once before recruiting to its neighbours cleared the false count in 98% of collections and brought the rule back to the level of the schedule. It did not restore the advantage over the schedule: confirming costs re-counts, and with six there is little left.
- Together with R1, R2 and R2b this draws the map for the regime claim of the paper: a fixed schedule is the safe default; a trace-following rule beats it only when change is local and traces are trustworthy; trace verification is a necessary part of the rule and not an extra; and a model in the coordinator's seat inherits the same assumptions it is given.

## Limits

- A boundary test and not a fair contest: the rule and the orchestrator were run with a prior the scenario makes false. A rule or a prompt that hedges across local and scattered change was not tried, nor an orchestrator given no prior.
- One false count, of a fixed size, placed by us before the first round. An adaptive adversary is a different problem.
- The coordinator-failure boundary was not run (arithmetic: one lost assignment costs a round of two re-counts).
- One model, one task, sixty collections per scenario.
