# LI12R report: LI12 on fresh seeds, with agent traces working (2026-11-17)

Preregistration: `tasks/LI12R-REPLICATION-PREREG.md` (amended before any data: the trace parser was fixed). Data: `results/li12r-replication-k40/` (`analysis.json`, strict live check for feedback and scoring; `holdout.json`, strict, 40 fresh inputs per check; raw batch files in the release `data-li12r-replication-k40`). Verdicts: `node observatory/batch2/rc/analyze-li12.mjs results/li12r-replication 40`. Review: `docs/reviews/LI12R-REVIEW-2026-11-17.md`. Haiku 5.5, 8 cases at 40 modules, [US$ redacted]

| Arm | Solved | Pass on fresh inputs | Act rounds to solve | Output tokens per solved case |
|---|---|---|---|---|
| `oracle` (harness writes the requirement on the check) | 8 | 8 of 8 | 1 to 3 | 89,906 |
| `stig` (the caller's agent writes the trace) | 8 | **3 of 8** | 2 to 4 | 146,458 |
| `manager` | 8 | 8 of 8 | 2 to 6 | 169,429 |
| `routed` | 8 | 4 of 8 | 3 to 6 | 193,986 |
| `polarity` (no trace) | 0 | – | – | – |

## Verdicts

H-LI36 (polarity alone beats the router) **refuted**, replicating LI12. For H-LI37 to H-LI40 this run is a corrected rerun (LI12's agent-trace arm lost most traces to a parser bug): H-LI37 (stig beats the manager) **inconclusive** (every case tied at solved); H-LI38 (the trace matters) **supported**; H-LI39 (agent traces nearly as good as the oracle) **supported** (8 against 8); H-LI40 (stig cheaper) **supported** per solved case, but reversed per case that also passes the hold-out (about 390,000 against 169,429).

## What it shows

1. **With the parser fixed, agents carry the requirement themselves.** Agent-written traces solved every case, as many as the manager and the oracle, in fewer act rounds than the manager.
2. **The weakness is not the trace, it is acting before it arrives.** All 7 checks that fail on fresh inputs were made to pass in wave 1 by the helper owner, by reverse-engineering the failure examples, before any trace could arrive; the callers' traces were correct but were never delivered because the check already passed. Of 102 checks resolved after a delivered trace, none fails on fresh inputs. The oracle avoids the problem because its trace arrives with the first failure. Next mechanism: a helper owner waits for the trace (acts on the signal, not on the symptom).
3. **Weak tests again.** Three of the 7 failures have a requirement that is constant on the 8 test inputs.
