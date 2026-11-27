# Coordination: mechanisms from nature against market coordination

At equal N, on work that needs N agents, does a swarm coordinated by mechanisms from natural collectives beat the coordination the market ships: a **manager agent** that assigns work, or a **group chat** among the same agents? Active programme since 2026-11-17; collective defence is paused.

## Target (owner, 2026-11-19)

The question above is the unit test. The programme is a **map**: which of the traits that make up biological swarms help LLM agents, under which conditions, on which tasks, at which sizes and with which models, and which do not. The instrument is the genome catalogue (`catalog/genome/`): 39 traits on 7 axes, 51 natural systems (38 seen, 13 unseen), 9 ecological conditions, plus the 18 mechanisms of the [map of mechanisms](#/e/doc-nature-mechanisms). Crossing traits with conditions, tasks and models gives hundreds of cells.

Where the map stands: 33 of the 39 traits have a flag in the simulation engine and 6 have none; on real LLM agents only a handful have been tested (stigmergy with polarity, response thresholds, claim announcements, arbiters, waiting for the trace), and none of the 7 defence-axis traits. A positive result in one cell is a finding, not the end of the programme, and the programme is far from done.

## How a mechanism climbs (evidence ladder)

| Level | Meaning |
|---|---|
| L0 | Screened: a free simulation or a cheap pilot says it is worth a paid study. |
| L1 | Preregistered primary hypothesis supported on new seeds, one model. |
| L2 | Same effect, primary supported, in at least 3 models, one of them outside the Claude family. |
| L3 | Holds against a strong manager (default effort, ample plan budget, enough rounds), at a size where the baseline does not solve nearly everything and one agent cannot hold the work. |
| L4 | Holds on real code (a repository benchmark such as CooperBench) at matched cost. |
| L5 | The part that produces the gain is isolated by ablation. |

A mechanism is **satisfactory to keep investing in** at L2 with L3 under way; it is a **result worth a paper or a product decision** at L5. Each verdict is attached to its cell (mechanism, condition, model class), never generalised beyond it.

**Stop or pivot, per mechanism.** If the manager catches up when given more rounds or a stronger plan (the LI36 question) and no other model family reproduces the gain, record it as "cost, not quality" and stop spending on that cell. A refuted or inconclusive cell is recorded the same way as a supported one.

## How the programme is judged

- **Coverage:** the share of the 39 traits, and of the 7 axes, with at least an L1 verdict on real agents, tracked in the table generated from `catalog/genome/traits.json` (`catalog/genome/COVERAGE.md`, built by `scripts/coverage.mjs`, checked in CI). Today 4 of the 39 traits have an L1 verdict, 23 have some test on real agents (mostly flag-level), and the defence axis has none beyond a flag-level reserve test. The six traits without a flag are screened in `results/sims/screen-noflag.md`: individual learning (FLD-04) is worth a paid study; the reproductive gate (DOL-03) and sacrificial guards (DEF-05) only where a bad edit spreads.
- **Depth:** how many mechanisms reach L3 and beyond. The owner sets the milestone numbers; this page does not.
- **Funnel, not one study per trait:** free simulation screens first, then factorial studies that vary several flags at once, and only survivors get a paid study that isolates one mechanism. Paid studies run through the research bench and its single ledger, and the ledger cap stays the owner's call.

## How it works

- Each study isolates one or more of the 18 natural mechanisms in the [map of mechanisms](#/e/doc-nature-mechanisms).
- Each study keeps the market baselines (manager, and chat where informative) on the same cases, and one agent with everything as a capacity reference.
- Tasks are executed code with coupled modules, growing towards work one agent cannot hold, and towards latency, loss of members and open-ended work.

## Where it stands

- LI1 to LI11 done; LI12 running (polarity, and traces written by the agents themselves).
- Leaderless chat never finished coupled work; any arbiter fixes the oscillation behind it.
- A manager agent beat our first bio router once caller workarounds were counted (LI10).
- Polarity (the requirement goes only to whoever can fix the source) beat the manager in LI11, but with a trace written by the harness; LI12 tests it without that help.
