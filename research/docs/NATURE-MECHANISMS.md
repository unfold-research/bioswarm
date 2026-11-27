# Nature's coordination mechanisms: the map the LI line works through (2026-11-17)

The owner's direction (2026-11-17): from LI11 on, every study isolates one or more mechanisms that natural collectives use, and measures it against the coordination people ship (a manager agent, a group chat) at equal N, on tasks that need N agents. Stigmergy is one mechanism among many; this map keeps the view wide. Each row names the natural system, the rule stripped to what an agent can follow, and where the lab stands.

| # | Mechanism | Natural example | Rule for an agent swarm | Status |
|---|---|---|---|---|
| 1 | Stigmergy (state in the field) | ant trails, termite mounds | write what is needed into the shared artefact (tests, traces), not into messages | LI1 to LI10 use the test suite as the field; LI11 put the caller's requirement into it, but written by the harness (an oracle); **LI12** has the caller agent write the trace |
| 2 | Lateral inhibition / stop signal | honeybee stop signal at nest-site choice; retina | on a symmetric conflict one side holds the turn, the other waits | LI1 to LI10 (`inhibit`, `routed`): cures format oscillation; LI27: without it waiting for the trace solves 0 of 12 at 160 modules. So far the harness breaks the symmetry; LI31 has the agents do it themselves (an announcement in the field, the stop signal) |
| 3 | Recruitment | waggle dance, tandem running | a member who holds a requirement calls the one who can act on it | LI7 to LI10 (`routed` messages) |
| 4 | Response thresholds with noise | division of labour in ants and wasps (Bonabeau, Theraulaz) | each member responds to a stimulus with a probability; chance, not a coordinator, breaks ties | LI11 (`threshold`): breaks ties better than simultaneous action, worse than an arbiter; churns |
| 5 | Polarity of signals | morphogen gradients, chemotaxis | the signal goes to whoever can change the source, never to whoever only suffers it | LI11 (`pheromone`): with the requirement delivered only to the helper owner, caller workarounds vanished (strict 15 of 16 against the manager's 11); **LI12** separates polarity from the trace |
| 6 | Quorum sensing | bacteria, rock ants and honeybees choosing a nest | a choice is committed only once enough members share it; below quorum, keep exploring | LI12 candidate: conventions (formats) adopted by quorum across the codebase |
| 7 | Positive feedback with evaporation | trail reinforcement and decay (Deneubourg double bridge) | reinforce what works, let unused signals fade, so the swarm converges and can still change its mind | LI12 candidate |
| 8 | Naming game / convention emergence | bird song dialects, human language (Steels) | local pairwise agreement spreads into one global convention | LI12 candidate (with quorum) |
| 9 | Scout and recruit balance | bee foragers: a fraction always explores | keep a fixed share of members exploring alternatives while others exploit | LI13 candidate (open-ended tasks, not repair) |
| 10 | Clonal selection and affinity maturation | adaptive immune system | many cheap variants of a fix compete on the field; the winners are copied and mutated | LI13 candidate (best-of-N per failing check, selected by tests) |
| 11 | Negative selection / apoptosis | thymus removes self-reactive cells; cells die on damage | a member whose output keeps breaking others is reset or removed | LI13 candidate (also catches the workarounds of LI7 and LI9) |
| 12 | Flocking (alignment, cohesion, separation) | starlings, fish schools | each member matches its neighbours' style and keeps apart from their territory | LI14 candidate (style drift and ownership on shared files) |
| 13 | Synchronisation of oscillators | fireflies, heart pacemaker cells (Kuramoto) | members phase-lock their rhythm (when to act, when to wait) by watching neighbours | LI14 candidate (async scheduling) |
| 14 | Network reinforcement | slime mould (Physarum) building transport networks | channels that carry useful traffic thicken, idle ones wither | LI14 candidate (who talks to whom) |
| 15 | Hormonal broadcast | endocrine signals, queen pheromone | one cheap global signal changes every member's thresholds at once (e.g. "deadline near") | LI15 candidate |
| 16 | Reaction-diffusion / morphogenesis | Turing patterns, body plans | local activation and longer-range inhibition partition work without a plan | LI15 candidate (task partition) |
| 17 | Redundancy and degeneracy | many genes, many neurons for one function | more members than needed, so losing any one costs nothing | LI15 candidate (robustness when members fail; where a single manager is a single point of failure) |
| 18 | Dominance hierarchy | paper wasps, primates | a natural *hierarchy*: a reminder that nature is not always leaderless; the control arm on the bio side | used as a reference against `manager` |

## Where bio is expected to win, and where it is not

- A central manager wins while the whole problem fits in its attention (LI9: 5 and 12 modules). Natural collectives are not built for exact, all-or-nothing targets at small scale; they are built for scale, noise, loss of members and no single point of failure.
- So the studies that can show the claim are at **scale** (LI10, LI11: 40 and 80 modules), under **latency** (waves to solve), under **failure** (a member or the manager drops out), and on **open-ended** work (exploration, not repair).
- Every study keeps the market baselines (`manager`, and `chat` where it is informative) on the same cases.
