# RD orchestrator model and locality prior: a strong orchestrator with the right prior searches almost perfectly; so does ten lines of code

Preregistration `tasks/R4-D2-PREREG.md`. Run 2026-11-11 as seven studies `rd-<scenario>-<model>-<prior>` on the collections of R2b and R3; readers always `claude-haiku-5-5`, orchestrator `claude-haiku-5-5` or `claude-sonnet-5-5`. 7,560 reader calls and 2,520 assignments, all succeeded, no unusable assignment. Usage estimate [US$ redacted] of which [US$ redacted] on the five Sonnet studies. Analysis: `node observatory/batch2/ring/analyze-routers.mjs` → `summary.json` here.

## Result

Collections right in the edited condition, of 60. Every arm was right on 60 of 60 when nothing changed.

| Regime | local edit | scattered edit | local edit and a false count |
|---|---|---|---|
| fixed schedule | 29 (0.48) | 28 (0.47) | 23 (0.38) |
| alarm rule (random draws) | 42 (0.70) | 17 (0.28) | 10 (0.17) |
| Haiku orchestrator, prior given | 45 (0.75) | 12 (0.20) | 16 (0.27) |
| Haiku orchestrator, no prior | 28 (0.47) | 14 (0.23) | — |
| Sonnet orchestrator, prior given | **59 (0.98)** | 14 (0.23) | 17 (0.28) |
| Sonnet orchestrator, no prior | 37 (0.62) | 17 (0.28) | — |

| Test | Verdict |
|---|---|
| P1 a stronger orchestrator copes with scattered edits better | **not supported**: +0.03, interval −0.12 to 0.18 |
| P2 and with a false count | **not supported**: +0.02 |
| P3 removing the prior helps the small orchestrator under scattered edits | **not supported**: +0.03 |
| P4 and the large one | **not supported**: +0.05 |
| P5 an orchestrator without the prior is safe in both worlds | **not supported** for either model: under scattered edits both are below the fixed schedule (Haiku −0.23, interval −0.40 to −0.07; Sonnet −0.18, interval −0.37 to 0.00) |
| P6 nothing lost when nothing changed | supported |

## What was not predicted

Under local change, Sonnet with the prior was right on 59 of 60 collections, against 45 for Haiku with the same prior (+0.23, interval 0.13 to 0.35) and 42 for the alarm rule.

This was checked for a leak, because R2 had one. There is none: 30 of its 120 first-round picks fell inside the edited block, exactly chance. What it does is plan a search. In 57 of 60 collections it opened with two parts on opposite sides of the ring; when both came back unchanged it sent the next two analysts to the parts midway between ("far from the checked ones and from each other"); once a part came back changed it sent analysts to that part's neighbours. With blocks of three neighbouring parts, probes three apart must hit the block by the second round, which leaves the third round for the neighbours.

The same plan written as a rule in code (`probe` in `observatory/batch2/ring/engine.mjs`: untouched neighbours of alarmed parts first, otherwise probes three apart from a seeded start) is right on 2,000 of 2,000 simulated collections under local change, 0.29 under scattered change and 0.39 with a false count (`results/ring-rules/summary.json`).

## Reading

- **The prior is what makes an orchestrator good, in both directions.** With it, both models are far above the schedule under local change. Without it, Haiku is at the schedule (0.47) and Sonnet a little above (0.62); the difference made by the prior is −0.28 and −0.37, intervals well below zero. Under scattered change every orchestrator is below the schedule, with or without the prior, small or large.
- **A stronger model did not adapt; it exploited the prior better.** Nothing in three rounds let either model discover that the prior was false, and neither behaved more cautiously without it than a fixed schedule would. The gain of the larger model is in planning a search under a correct assumption.
- **The "alarm rule" of R2 and R2b was a weak rule.** It reacts to alarms and otherwise draws at random. A rule that also plans where to probe is perfect in this setting. So the earlier statement that a rule and an orchestrator are equivalent holds for the rule and the orchestrator that were compared; the general statement is that a good search policy wins, and here the best one found can be written in code at no orchestration cost. The Sonnet arm cost 4.4 times the rule regimes and found the policy; the code version costs nothing to run.
- **A model is a way to find the policy, not necessarily to run it.** That is a concrete use of the larger model in a swarm design: let it plan on a sample, read its working, write the plan down as a rule, verify the rule by simulation. It is also what happened here by accident.

## Limits

- The probe rule was written after seeing what Sonnet did; it is a post hoc construction, not a preregistered arm, and it encodes the block size.
- The Haiku arms with the prior were run earlier with a first-round assignment shared between conditions.
- Sonnet has adaptive thinking; Haiku has none. One wording with and without the prior. Three rounds. Sixty collections per arm.
- Every policy here, model or code, is safe only in the world its prior describes. None is above the schedule under scattered change.
