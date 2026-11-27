# R3 and D4b preregistration (2026-11-11)

Registered before any paid call of these studies. Owner instruction of 2026-11-11 ("Sim, os dois"), within the standing authorisation for the shared ledger. Claude Haiku 5.5, thinking disabled, throughout.

## R3: two boundaries of the partial-coverage result
Code: `observatory/batch2/r3-bounds/protocol.mjs`, one submission per scenario and regime (`r3-scatter-sweep`, `-alarm`, `-router`; `r3-poison-sweep`, `-alarm`, `-verify`, `-router`); analysis `observatory/batch2/r3-bounds/analyze.mjs`.

R2 and R2b: with 6 re-counts for 12 parts and an edit of three neighbouring parts, a local alarm rule beat the best fixed schedule (0.72 against 0.53; 0.70 against 0.48). Both reports list what was not tested: edits without locality, and false traces. R3 tests them. Setting of R2b unless stated; 60 new collections per scenario; both conditions (stable, edited).

**Scatter** (seeds 29001 to 29060). The three edited parts are chosen so that no two are neighbours. The alarm rule still favours the neighbours of an alarmed part and the orchestrator is still told that edits tend to be local: both act on a belief that is false here. With exact readers the seeded schedules give 0.47 for the sweep and 0.28 for the alarm rule.

**Poison** (seeds 30001 to 30060). The edit is as in R2b. Before the first round a false count is on the board: on one part outside the block, the first count with three studies added to the leader. It raises an alarm and inflates the leader's total (20 becomes 23); the edited condition is then right only if all three edited parts are re-read, or two of them and the poisoned part. A fourth regime, **verify**, re-reads an alarmed part once more before favouring its neighbours and clears the alarm if the second count agrees with the first count of all. With exact readers: sweep 0.38, alarm 0.17, verify 0.38.

The leak probe finds no way to locate the edited parts or the poisoned part from the first counts (offline test in `r3-bounds/protocol.test.mjs`).

Accuracy in the edited condition, paired by collection, seeded bootstrap (4,000 draws).
- **P1, without locality the alarm rule loses its advantage** (scatter): *supported* unless the 95% interval of alarm minus sweep is above zero.
- **P2, the orchestrator copes with scattered edits better than the rule** (scatter): router minus alarm, interval above zero.
- **P3, a false count removes the advantage of the alarm rule** (poison): *supported* unless the interval of alarm minus sweep is above zero.
- **P4, confirming an alarm before acting on it repairs the rule** (poison): verify minus alarm, interval above zero.
- **P5, the orchestrator handles the false count better than the rule** (poison): router minus alarm, interval above zero.
- **P6**: every regime at least 0.9 in the stable condition of both scenarios.
Reported: edited parts re-read, whether the poisoned part was re-read, re-counts spent beside it, cost.

A third boundary named in earlier reports, failure of the coordinator, is not run: losing one assignment call costs the orchestrator a round of two re-counts where losing one worker costs the rule one, which is arithmetic and needs no model.

## D4b: exploration carried by the agents
Code: `observatory/batch2/d4b-choice/protocol.mjs`, submitted as `d4b-told`, `d4b-wide`, `d4b-draw`; analysis `observatory/batch2/d4b-choice/analyze.mjs`.

D4: workers shown the marks near them went to a fresh neighbour of a changed part in 90% of choices and asked to be sent elsewhere in 3 of 720; 0.58 against 0.70 for the rule in the harness. D4b tries three ways of giving the agents the exploration half, on the same 60 collections and starting positions (seeds 28001 to 28060):
- **told**: the D4 view, and two sentences saying that analysts who stay near where they started reach only a few parts and that, when nothing near has changed, being sent elsewhere covers more.
- **wide**: the D4 instructions with nine parts in view.
- **draw**: the D4 view plus `offered_elsewhere`, one part not yet re-counted, drawn by the harness, that the worker may take.
In this version a worker sent elsewhere lands outside its current view. With exact readers, a worker that follows alarms and otherwise leaves gets 0.80 (told, draw) and 0.77 (wide).

Edited condition, paired with `d4-marks` by collection; *supported* if the 95% interval is above zero.
- **P1**: told minus D4 marks. **P2**: wide minus D4 marks. **P3**: draw minus D4 marks.
- **P4**: every variant at least 0.9 in the stable condition.
Reported: how often each variant leaves its neighbourhood, the comparison with the R2b alarm rule and orchestrator, cost.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]).

## Limits stated in advance
R3: the alarm rule and the orchestrator are tested with a prior that the scenario makes false, which is the point of a boundary test and not a fair contest; a rule or a prompt written for scattered edits was not tried. The false count is one, placed by us, with a fixed size. D4b: comparisons with D4 and R2b use collections whose results were known; three wordings, one each. One model, one task.
