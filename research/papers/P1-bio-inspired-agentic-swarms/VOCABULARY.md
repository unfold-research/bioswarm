# P1 vocabulary

The open points in the tables below were settled on 2026-11-12 (`README.md`, "Decided"). The definitions as used are in `draft/`, section 3: a trace is $(a, p, \tau, \kappa, w)$; the stimulus at a part is the sum of traces weighted by recognition, age and a kernel; a regime is $\langle \alpha, \pi, x; w, h, \theta, q, \rho; N, b\rangle$ (assignment, selection, executor; primitive values; controls). The work product counts as a trace. Elapsed time is reported as a second axis of cost. The original proposal follows.

The terms the paper defines. Each needs an operational definition: something a harness can set or measure. A term that cannot be given one leaves the paper.

## Objects

| Term | Proposed definition | Operational handle | Open point |
|---|---|---|---|
| **Field** | The shared state through which agents coordinate: the artefact being worked on plus the traces left on it | A data structure every agent can read and write; in R1, the board of counts and marks | Whether direct messages between agents are part of the field or a separate channel |
| **Trace** | Anything an agent leaves in the field that changes what other agents do | A write with an author, a time and a weight | Whether the work product itself counts as a trace (classical stigmergy says yes) |
| **Agent** | Anything that reads part of the field and leaves a deposit | One model call in R1; a loop with tools or a full harness can take the same slot | P1 uses pure agents; harnesses as agents are future work, stated in the conclusion |
| **Regime** | A configuration of the primitives below under which a group of agents works | A parameter vector plus the rule that uses it | Rule in the harness or behaviour of the agent (README, open item 2) |
| **Orchestrator** | An agent that reads the state and assigns work to others | A model call whose output is an assignment | The baseline of today's systems; called "router" in the repository so far. Pick one word |
| **Deep agent** | One agent holding the whole budget, with working space | Calls and tokens equal to the collective's total | The control that decides, per `tasks/L2-RELATED-WORK-TO-READ.md` |
| **Matched cost** | Two arms spend the same budget | Tokens returned by the provider, priced; not calls, not "decision opportunities" | Whether wall-clock time is reported as a second axis |
| **Leaderless** | No agent assigns work to another | Absence of an assignment call in the regime | A fixed schedule has no leader either. The paper must say whether "leaderless" excludes it |

## Primitives

| Primitive | In nature | In an agent system | Parameter | Evidence here |
|---|---|---|---|---|
| **Deposit** | pheromone laid on a trail; a pellet placed on a wall | an agent writes a trace to the field | weight per write | `research/nature/nat-stigmergy.md`; `sims/sim-stigmergy.mjs` |
| **Decay** | evaporation | the weight of a trace falls with time | half-life | H-07, H-25; `sims/sim-router-decay.mjs`; R1 prediction P1 |
| **Threshold** | response thresholds in division of labour | an agent takes up work when a stimulus passes its threshold | threshold per agent and stimulus | H-06; `sims/sim-response-threshold.mjs` |
| **Quorum** | scouts at a nest site; autoinducers in bacteria | a decision is taken when enough independent signals agree | quorum size | H-08; `sims/sim-quorum.mjs` (predictions failed in the model: say so) |
| **Recognition and inhibition** | nestmate recognition; stop signals between factions | a trace or an agent is accepted, discounted or stopped by others | acceptance rule, inhibition weight | H-27 (open, untested); `research/nature/nat-stop-signal-cross-inhibition.md`; the Abracadabra rounds in `STATE.md` |

Candidates not yet in the set: recruitment proportional to quality (H-20, waggle dance), reserve (H-26), fixed neighbourhood (H-22). Each either joins as a primitive or is expressed as a use of the five; the paper should not have nine.

## Presets

Named regimes, to be defined as parameter settings once the primitives are fixed. The names are communication, not claims about the animals.

| Preset | Dominant primitive | Built for |
|---|---|---|
| **Ants** | deposit with slow decay | converging on one artefact |
| **Bees** | parallel exploration, recruitment, high quorum | choosing among alternatives |
| **Wasps** | recognition with a response that scales | detecting and containing what does not belong |

The public products of the lab (Void for code, Abracadabra for defence, Murmur for research) are programmes that apply regimes; they are not regimes. The mapping "Ants for builders" is a hypothesis for P2, not a premise.

## Words to keep out

- "Emergent" as an explanation. It may describe an observation that has a measure.
- "Swarm intelligence" for a result that a schedule reproduces.
- "Leader" for the human who starts the swarm; the paper uses "operator".
