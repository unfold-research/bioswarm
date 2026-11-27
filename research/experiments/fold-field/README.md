# fold-field

A coordination kernel for agents that each own part of a coupled piece of work: modules behind shared interfaces, sections of one specification, the teams of one plan. Members do not converse by default. Each round the environment checks the whole work and returns its violations. A rule then decides who acts on each violation. The chosen members run in parallel and write only what they own.

`field.mjs` is model-agnostic. You supply `check(state)` and `act(job)`, and the kernel decides who acts and merges the results. Run the offline tests with `node --test experiments/fold-field/field.test.mjs`; they use a deterministic greedy member and no model.

## Which rule, and why

The evidence comes from preregistered studies LI1 to LI6 (Claude Haiku 5.5 members on synthetic graph colouring and multi-team project schedules; synthesis in `results/li-synthesis/REPORT.md`) and LI7 (Claude Sonnet 5.5 members each owning a module of an executed JavaScript codebase; `results/li7-real-code-geometry/REPORT.md`). See `results/li*/REPORT.md` and the reviews in `docs/reviews/`. In LI1 to LI6 no swarm arm solved a case; in LI7 the router solved 12 of 12. Read it as the direction of effects, not as product guarantees.

| Situation | Use | Evidence |
|---|---|---|
| Either side of a violation can fix it (symmetric constraints) | `inhibit` or `random`: never let both sides of a violation act in the same round | On colouring, simultaneous repair oscillated. Breaking the symmetry cut final conflicts about threefold in 36 of 36 and 24 of 24 paired cases. Choosing the side added nothing over random activation (20 against 15, p = 0.5). |
| Violations have a direction, so one side should move toward a target | let both sides act and let them message each other; do not apply inhibition | Messaging beat simultaneous repair in LI2 (18/6), LI5 (20/3) and LI6 (18/5). Inhibition added nothing there, and messaging combined with inhibition was worse than messaging alone (4/20, LI5). Typed requests on the field were inconclusive. |
| Both kinds present | `routed`: a symmetric violation to one side, a directed one to both, and let members message | On code (LI7, Sonnet) the router solved 12 of 12 codebases by round 3; free messaging solved 0 (its symmetric edges swapped formats 220 times of 220) and inhibition 3. On schedules (LI6, Haiku) it beat inhibition 19/5 and tied messaging 13/11. Its messages carry part of the gain (LI6: against the silent router 21/3) |
| The whole problem exceeds one agent | work a window around the violations rather than the whole problem | At 240 nodes, one agent on a 40-node window ended below an agent given the whole graph in 12 of 12 cases. The whole-graph agent often declined to answer. |
| The problem fits one agent | do not use a swarm | One agent from scratch solved 12 of 12 at 60 nodes and 6 of 12 at 96 items, which no swarm arm matched. |

Not established: that a swarm beats one agent given all the information (it never did: in LI7 one agent also solved 12 of 12, at a quarter of the tokens), that these effects hold on tasks other than planted-coupling code and synthetic graphs or on non-Claude models, or that biological framing adds anything over the classical distributed-constraint rules (distributed breakout, DSA), which are prior art.
