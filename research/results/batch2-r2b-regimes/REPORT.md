# R2b partial coverage without the leak: the alarm rule beats the fixed schedule again; the orchestrator matches the rule and costs more

Preregistration `tasks/R2B-PARTIAL-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled, as four studies (`r2b-sweep`, `r2b-random`, `r2b-alarm`, `r2b-router`); 6,060 requests, all succeeded. Usage estimate [US$ redacted] Analysis: `node observatory/batch2/r2b-regimes/analyze.mjs` → `summary.json` here. Nothing is pooled with R2.

## The leak is closed

22 of the orchestrator's 120 first-round picks fell inside the block that would be edited; chance gives 30. In R2 it was 88. Its most common opening was two parts on opposite sides of the ring.

## Result

Sixty new collections; 6 reads after the edit for 12 parts.

| Regime | Correct, stable | Correct, edited | Edited parts re-read (of 3) | US$ |
|---|---|---|---|---|
| sweep (best fixed schedule) | 60 of 60 | 29 of 60 (0.48) | 1.40 | [redacted] |
| random | 60 of 60 | 29 of 60 (0.48) | 1.48 | [redacted] |
| alarm (recruitment to neighbours) | 60 of 60 | 42 of 60 (0.70) | 1.83 | [redacted] |
| router (orchestrator model) | 60 of 60 | 45 of 60 (0.75) | 2.17 | [redacted] |

Counts were exactly right in 0.99 of reads. No false alarm in the stable condition in any regime.

| Test, edited condition | Verdict |
|---|---|
| P1 (E7) a stigmergic rule with a signal beats the best fixed schedule (replication) | **supported**: +0.22, interval 0.05 to 0.38 |
| P2 the signal is what does it (replication) | **supported**: +0.22, interval 0.05 to 0.38 |
| P3 an orchestrator with the same information beats the local rule | **not supported**: +0.05, interval −0.10 to 0.20 |
| P4 alarms do no harm when nothing changed | **supported** |

## Reading

- **E7 holds twice.** With a budget that covers half the field and changes that come in neighbouring parts, a local rule that follows alarms was right on 0.72 and 0.70 of collections against 0.53 and 0.48 for the best fixed schedule, on two independent sets of sixty. Both runs landed on the figures the seeded schedules give with perfect readers.
- **Central and local use of the same signal are equivalent here.** Once the first counts no longer gave the edit away, the orchestrator was right on 0.75 against 0.70 for the rule, a difference of three collections with an interval that spans zero. It did re-read slightly more edited parts (2.17 against 1.83), which is what one would expect from a planner that sends both analysts to fresh neighbours of an alarm, as it did in 40 of 64 such rounds, where the rule draws two picks independently and sometimes collides. It cost 16% more.
- So the regime comparison stands at three statements: with full coverage a fixed schedule is enough (R1); with partial coverage and local change a signal left on the field beats any fixed schedule (R2, R2b); and given the signal, a rule in code and a model orchestrator do about equally well, the rule for less (R2b).
- For the question of the P1 paper: what paid was the trace (an alarm on the field) and a response to it. Whether that response sits in a local rule or in a coordinator made no measurable difference. "Leaderless" is not what the result supports; "coordinate through traces on the field" is.

## Limits

- The advantage comes from locality built into the edit; with scattered edits an alarm does not say where to look next. Untested.
- The rule is a seeded choice rule in the harness. An agent that reads the marks and chooses for itself is run D4 of the paper's needs and is not tested.
- The orchestrator was given the locality prior in words.
- Sixty collections: a true difference of 0.10 between orchestrator and rule would not have been detected.
- One task, one model, one kind of edit. Predictions P1 and P2 were written after R2 and are replications.
