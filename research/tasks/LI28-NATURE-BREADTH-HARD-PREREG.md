# LI28 preregistration: other mechanisms from nature against a group chat, on harder tasks (2026-11-18)

**Status:** registered 2026-11-18 before any LI28 data. Haiku 5.5, Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` as sweep 4, in parallel with the end of LI24 and with LI29 (rule 9). Verdicts: `verdict.mjs` (per-case sign test; act rounds exclude manager plan waves; Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. A stop at the study cap now ends the run as incomplete (exit 3, no summary, no verdicts), after the LI21 review. Spec: `observatory/batch2/rc/sweeps/LI28.json`.

**Why.** Since LI16 the line has compared one natural mechanism (waiting for the trace, stigmergy) with a manager agent. The market has a second pattern, the leaderless group chat, last tested on easy tasks; and nature has other mechanisms already in the bench that were last tested on easy tasks too (LI11): response thresholds with noise (division of labour in social insects), lateral inhibition (one side acts per conflict, as in cell fate and neural circuits), and plain simultaneous action as the no-coordination floor. LI28 runs them all on the harder tasks of LI19 and LI24 (80 modules, 160 directed and 80 symmetric edges, 16 test inputs per check, 6 act rounds, no wave budget), so the comparison is no longer stigmergy only.

**Arms.** `stigwait` (waiting for the trace), `chat` (market: leaderless group chat), `threshold` (response thresholds with noise), `inhibit` (lateral inhibition), `sync` (everyone touched acts; floor). Seeds 28800 to 28811 (12 cases). Cap [US$ redacted]

## Hypotheses (the case is the unit)

- **H-LI79 (primary).** On harder tasks, waiting for the trace ends with fewer failing checks than a leaderless group chat: `stigwait` against `chat` on `final`.
- **H-LI80.** Response thresholds end with fewer failing checks than a group chat: `threshold` against `chat` on `final`.
- **H-LI81.** Lateral inhibition ends with fewer failing checks than a group chat: `inhibit` against `chat` on `final`.
- **H-LI82.** Waiting for the trace ends with fewer failing checks than response thresholds: `stigwait` against `threshold` on `final`.
- **H-LI83.** Waiting for the trace uses fewer tokens than a group chat: `stigwait` against `chat` on `tokens`.

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive. `sync` is reported as the floor, with no hypothesis.
