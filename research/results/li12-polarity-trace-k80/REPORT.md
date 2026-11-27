# LI12 report: polarity, the trace, and who writes it, under strict feedback (2026-11-17)

Preregistration: `tasks/LI12-POLARITY-TRACE-PREREG.md`. Data: `results/li12-polarity-trace-k40/`, `results/li12-polarity-trace-k80/` (`analysis.json`, where feedback and scoring were the same strict live check; `holdout.json`, strict, 40 fresh inputs per check; `state.json`; raw batch files in the releases `data-li12-polarity-trace-k40` and `-k80`, checksums in `RAW-SHA256SUMS`). Verdicts: `observatory/batch2/rc/analyze-li12.mjs`. Independent review: `docs/reviews/LI12-REVIEW-2026-11-17.md`. Claude Haiku 5.5, Message Batches API, 0 failed requests, [US$ redacted]

16 codebases (8 of 40 modules, 8 of 80), one Haiku member per module, five arms on the same cases and round 0.

| Arm | Solved | Pass on fresh inputs (strict) | Act rounds to solve | Output tokens per solved case |
|---|---|---|---|---|
| `oracle` (harness writes the requirement on the check; helper owner only) | 16 | 16 of 16 | 1 to 3 | 135,706 |
| `manager` (market: a lead agent assigns work) | 16 | 15 of 16 | 3 to 7 | 270,336 |
| `routed` (bio router, messages) | 16 | 8 of 16 | 3 to 6 | 286,878 |
| `stig` (the caller's agent writes the trace; **about 55% of traces dropped by a parser bug**) | 9 | 1 of 9 | 5 to 8 | 511,432 |
| `polarity` (helper owner only, no trace) | 0 | – | – | – |

## Verdicts (as registered) and the review

| Hypothesis | Registered | After review |
|---|---|---|
| H-LI36 polarity alone beats the router | **refuted** (0 against 16; p = 0.00003) | stands |
| H-LI37 agent-written stigmergy beats the manager | refuted (9 against 16; manager lower in 7 cases) | **invalid**: all 7 losses come from traces the parser dropped |
| H-LI38 the trace matters | **supported** (9 against 0) | stands, as a lower bound |
| H-LI39 agent traces nearly as good as the oracle | refuted (9 against 16) | **invalid** (parser bug) |
| H-LI40 agent-written stigmergy cheaper than the manager | refuted | **invalid** (parser bug) |

## What it shows

1. **Polarity without the requirement does nothing.** Sending a failing directed check only to the helper owner, with no trace, solved 0 of 16. The helper owner can only reverse-engineer the requirement from three failing examples, which mostly produced lookup tables. What made LI11's pheromone arm work was the requirement, not the routing.
2. **When an agent's trace reached the helper owner, it worked every time.** The bug dropped traces whose id the agent copied with brackets. Where a trace was delivered, the helper owner resolved the check 211 of 211 times; every check left unresolved had a correct trace that never arrived. Agent-written stigmergy is untested here, but this is the strongest signal yet that it works. LI12R, with the parser fixed, is the real test.
3. **With one check for feedback and scoring, the router finishes.** The router solved 16 of 16, against 5 of 16 in LI10, where the run fed back a check that accepted caller workarounds. LI10's verdict against the router was about the protocol, as the LI10 review said.
4. **Solving the tests is not solving the task.** On fresh inputs the router keeps 8 of 16, agent traces 1 of 9, the manager 15 of 16 and the oracle 16 of 16. The failures are mostly near-miss helpers that equal the requirement on the 8 test inputs, or requirements that are constant on them; agent traces also quote test values, which invites fitting. The test suites are too weak: later studies need more inputs per check, covering the alphabet.
5. **The oracle trace is the cheapest and fastest arm** (1 to 3 rounds, half the manager's tokens), but it is the harness handing over the specification, not a mechanism the swarm has.

## Limits

One model, synthetic code, 16 cases. The `stig` arm was broken by an instrument bug (found by the LI13/LI14 pilot, fixed before any later data). The strict sentence rarely appears; the usual failure text lets helper owners infer requirements from examples in every arm. 5 manager plans truncated at 80 modules.
