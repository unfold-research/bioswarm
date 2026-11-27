# LI31 preregistration: emergent symmetry breaking inside the Colony (2026-11-19)

**Status:** registered 2026-11-19 before any LI31 data, after LI27's 160-module raw counts were seen (disclosed: waiting for the trace with the harness tie-break solved 12 of 12, without it 0 of 12, the manager 11 of 12). Real Colony agents on the headless runtime fleet on benchhost, Colony `ca8e3df` (amended before any data: `e7ef7c3` plus lab telemetry, below), gpt-6-luna on the ChatGPT subscription (outside the API ledger), after LI29 frees the fleet.

## Why

In the batch bench the advantage of the bio arm on format pairs (an encoder in one module, its decoder in another) came from a **tie-break the harness applies**: one side is chosen to act. Without it both sides adapt to each other at once, swap formats and never converge (LI27). In nature this symmetry breaking is done by the agents themselves (lateral inhibition, a first mark that holds the others back). LI31 asks whether agents can do it with a local rule through the field, with nobody arbitrating.

## Design

- **Arms** (one team per arm and case: a parent and 4 ants owning 10 modules each):
  - `claim`: the field in mode `claim` (Colony `e7ef7c3`): wait for the caller's trace on directed checks, as LI20; on a failing format pair, read the field; if the other side announced it adapts, keep your format; otherwise announce "I adapt to your format; keep yours" with `field_trace` and then adapt; if both announced, the lower file number adapts.
  - `nopeer`: the field in mode `wait`, the same in every other respect, with no rule for format pairs.
  - `market`: the Colony default team (reference; messages between ants allowed).
- In `claim` and `nopeer`, **ants cannot message each other** (`antLimits.peer: false`; the parent still talks to each ant), and the parent is told not to decide who changes in format pairs. In all arms: the same message budget (200 per request, 60 per pair), the same no-questions instruction.
- **Tasks** heavy in format pairs: 40 modules, 40 symmetric and 10 directed edges, 2 local checks per module, 8 test inputs per check; seeds 31400 to 31407; 60 minutes cap per team; done after 3 minutes without a running chat. The agents' runner applies the scorer's check (including callers that ignore their helper, from LI29).
- **Instrument:** the driver snapshots every module file and runs the test runner every 15 seconds (`timeline` in each run record). From it `analyze-li31.mjs` counts **simultaneous changes** (a format pair failing at one snapshot whose two files both changed by the next) and **regressions** (a format pair passing at one snapshot and failing at the next).
- **Colony lab telemetry** (amendment, 2026-11-19, before any LI31 data; it changes no agent behaviour): Colony `ca8e3df` records every tool call of a lab agent with its input, the reason for a block and its result (error, short output, hash of a written file), and the field's traces created, read and closed; the export carries them per task. The driver summarises them per run (`telemetry`: calls, errors, blocked, edits, test runs, failed `ant_send` and `field_trace`). Reported, not tested.
- Config `observatory/batch2/colony/li31-k40.json`; scoring `evaluate.mjs`; verdicts `analyze-li31.mjs`; review `docs/reviews/REVIEW-PROMPT.md`.

## Hypotheses (8 cases per arm, paired by seed; the case is the unit)

- **H-LI90 (primary).** Announcing who adapts lowers simultaneous changes of both sides of a failing format pair: `claim` against `nopeer`.
- **H-LI91.** Announcing who adapts leaves fewer checks failing on fresh inputs: `claim` against `nopeer` on `holdoutFailing`.
- **H-LI92.** Announcing who adapts finishes sooner: `claim` against `nopeer` on wall-clock.
- **H-LI93.** The announcing field leaves fewer checks failing on fresh inputs than the default team: `claim` against `market`.

Rule: supported if the first arm is lower in more cases with sign-test p < 0.05; refuted if the second is lower in more cases; otherwise inconclusive. Holm on the secondary hypotheses. Also reported: solved, hold-out passes, regressions, traces, stalls, capped runs, total tokens. A known risk, stated in advance: asynchronous agents may rarely change both sides within one 15-second window, in which case H-LI90 has little to count and the regressions and wall-clock carry the reading.
