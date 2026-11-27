# Papers

Papers planned from this repository. A paper folder holds the architecture of a paper, not its results: results stay where the evidence discipline of the repository puts them (`results/`, `tasks/`, `hypotheses/`), and a paper cites them by path.

## Programme

**Towards Bio-Inspired and Leaderless AI Swarms.** The public line of Unfold, an AI swarm lab (unfold.host): "We study swarming species towards leaderless agentic AI." The programme asks when LLM agents should coordinate the way living collectives do, without a leader, and when one agent or plain engineering is better.

## Series

| # | Working title | Kind | What it delivers | Status |
|---|---|---|---|---|
| P1 | [Bio-Inspired Agentic Swarms: Towards Leaderless AI](P1-bio-inspired-agentic-swarms/README.md) | framework and pilot | vocabulary (primitives, regimes), an atlas from species to mechanism to problem class, position against related work, one pilot comparison | architecture |
| P2 | When Do Bio-Inspired Agentic Swarms Beat an Orchestrator? | empirical | the full matrix of regimes by tasks at matched cost, with a deep single agent as third arm; introduces the benchmark below | not started |
| P3 | Talking to the Swarm | interface | the human as a perturbation of the shared field instead of a commander of a router | not started |
| P4 | Beyond Biology | empirical | which natural constraints (local information, no memory, no broadcast) are still needed in digital swarms | not started |

P2 to P4 cite P1 for vocabulary. Titles are working titles chosen by the owner on 2026-11-11.

## Benchmark

**BioAgenticSwarmBench (BASBench)**: bio-inspired against engineered coordination for AI agents, at matched cost. Working name chosen by the owner on 2026-11-11; it is the paper title plus "Bench". It is named in P2, when there is a matrix of tasks. P1 only says that its standard of comparison is being assembled into a benchmark.

Three layers, of which only the last is what is studied:

| Layer | What it is | In the benchmark |
|---|---|---|
| Model | the language model | fixed within a comparison |
| Agent | anything that reads part of the field and leaves a deposit: one model call, a minimal loop with tools, or a full harness | fixed within a comparison; pluggable across studies |
| Coordination | the regime: orchestrator, fixed schedule, single deep agent, bio-inspired regimes | the variable |

Order of work: (1) pure agents, one model call each, which is where R1 is; (2) minimal agents with tools, for tasks that require acting; (3) full harnesses as agents (OpenBot, Claude Code, Codex), as a demonstration that a regime survives outside the laboratory and not as the core measurement. Comparing harnesses with each other changes model, tools and prompts at once and measures the product, not the coordination.

Arms every task carries: one agent with the whole budget, an orchestrator, at least one bio-inspired regime; cost in tokens as priced, equal across arms. `observatory/` is the existing runner and R1 its first task under this standard.

Neighbours to position against (related work of P1 and P2; none read from the PDF yet): SwarmBench, Ruan et al., arXiv 2505.04364 (models as decentralised agents on a 2D grid; card `research/literature/lit-swarmbench-2025.md`); SwarmBench, Gao et al., arXiv 2608.30661 (models as orchestrators of agent swarms); Towards a Science of Scaling Agent Systems, arXiv 2512.08296 (single agent against four topologies at matched iterations; card `research/literature/lit-scaling-agent-systems.md`); BioAgent Bench, arXiv 2601.21800 (agents doing bioinformatics: a different subject with a close name).

## Rules for a paper folder

- Every claim in a paper is a row in its `CLAIMS.md`, with exactly one evidence level from the README of this repository and a path to the evidence. A claim without a path is a gap, and is written as one.
- A simulation result is support inside a model. It may motivate a claim about LLM agents; it may not stand for one.
- A comparison of a collective with anything is reported at matched cost, with one agent holding the whole budget as an arm.
- Nothing under `internal/` is cited or paraphrased in a paper.
- Numbers taken from other papers are checked against the PDF before they enter a draft; summaries from fetch tools are not a source.
