# Benchmarks for swarms of LLM agents: survey and what to adopt (2026-11-12)

Why this exists: the lab's own studies of 2026-11-11 and 11-12 used small synthetic tasks on which one agent is near ceiling. They are sound as instrument work and say little about the question the programmes ask, which is whether a collective organised by biological mechanisms beats one strong agent and a conventional orchestrator on complex tasks. Five sub-agent studies surveyed what exists. They are reading notes, not evidence: each marks what it could not verify at the source (122 such marks in total), and every number must be checked against the paper before it is cited.

| File | Scope |
|---|---|
| `01-multi-agent-general.md` | general multi-agent benchmarks and the rules of a fair comparison |
| `02-software-engineering.md` | repository-scale coding (Void) |
| `03-deep-research.md` | research over corpora larger than one context (Murmur), and a home-grown option on our library |
| `04-security-robustness.md` | defence and robustness of agents and collectives (Abracadabra) |
| `05-swarm-intelligence.md` | how swarm intelligence is measured in robotics and biology; LLM agents in swarm settings; mechanism by mechanism |

## What the survey says

1. **No published study shows a collective beating the best single agent at matched total tokens** on a task a frontier agent already solves above about 45% (01). Results in favour of collectives are unmatched in budget (Anthropic's +90.2%, WideSearch, AgentWorld) or sit where the single agent is weak or overloaded. Where budgets were matched the single agent wins or ties: every multi-agent design 2 to 15% worse on SWE-bench Verified (02); on BrowseComp-Plus decentralised +9%, centralised 0, independent −35% (03); CooperBench pairs 30% below solo (checked at the abstract).
2. **Biological mechanisms have almost never been tested as mechanisms with LLM agents** (05). Where they were ablated the effect is weak: in Pressure Fields the abstract's "decay is essential" rests on 29 of 30 against 26 of 30 (p = 0.35, per the study's reading of v3), and one agent does as well as four. No study was found that sweeps quorum with unequal options, cross-inhibition, designed response thresholds, idle reserve or danger signals.
3. **Swarm robotics has no shared benchmark and no single-agent baseline** (05): decentralisation is assumed by the problem. Its standard of evidence is worth copying: a parameter sweep with an interior optimum, a null controller, and an environment where the mechanism should not pay. So are its metrics: scaling curve in N, robustness to agent loss, adaptation time after a change.
4. **Scaling curves with LLM agents are mostly flat or falling** (01, 05): AgentsNet near zero at 100 agents, Silo-Bench 61% at 2 agents to 18% at 100.
5. **The conditions under which biology predicts a benefit rarely hold in existing benchmarks.** They are: no agent can see the whole problem, members are unreliable, the environment changes during the work, parallelism is real. In most "distributed" benchmarks the split is imposed by the harness and one agent with everything is the ceiling. Agent drop-out has no public benchmark (04).

The gap is therefore the lab's question itself: bio-inspired coordination against a full-budget single agent and an orchestrator, tokens and wall-clock matched, on tasks that exceed one context, with unreliable members and a changing environment as designed variables.

## Shortlist

Costs are the sub-agents' estimates, mostly at mid-model list prices; none is a measured cost of ours. A pilot of five tasks comes before any of them.

| Programme | Benchmark | Why | Conditions it has | Estimated cost | Checked by me |
|---|---|---|---|---|---|
| core question | **Silo-Bench** (arXiv 2603.01045, ACL 2026) | 30 exact algorithmic tasks, input sharded over 2 to 100 agents, single-agent oracle that itself degrades as input grows | no global view (real at large N), parallelism; faults and change must be added by us | [US$ redacted] at mid-model prices for 12 tasks × 4 sizes × 5 seeds; far less with a small model | title, venue, 30 tasks, main finding. Oracle degradation and licence not checked |
| Void | **CooperBench** (arXiv 2601.13295) | real repositories, hidden tests, features that can be built in parallel and must merge, a solo control built in | parallelism, partial view; no faults | [US$ redacted] small model, [US$ redacted] mid, three arms on 50 pairs | abstract; README: 652 tasks, `flash` = 50 pairs, `--setting solo|coop`, Anthropic key, Docker or Modal, Redis, MIT |
| Void, second | FeatureBench, SWE-EVO | multi-file features; release-sized tasks that do not fit a context | partial view | [US$ redacted] small model | no |
| Murmur | **BrowseComp-Plus** (arXiv 2508.06600) | fixed corpus, human evidence labels, reproducible | deep, not wide; partial view | [US$ redacted] for 100 queries, three arms | abstract (fixed corpus, GPT-5 55.9% to 70.1%) |
| Murmur, wide | Oolong-synth; a benchmark on our library | aggregation beyond one window with exact scoring | no global view, parallelism | [US$ redacted]; [US$ redacted] plus a human audit | no. The library option must never be scored against the existing cards |
| Abracadabra | **AgentDojo**, then the TAMAS peer-compromise slice | code-scored utility and attack success; TAMAS has compromised peers, orchestrator against swarm | unreliable and hostile members | [US$ redacted] small model, [US$ redacted] mid | no |

Caution for Abracadabra: current Claude models already show 0 to 7% attack success undefended on public static suites, so a defence has no headroom there, and twelve published defences fell above 90% under adaptive attack (04). A credible study needs a weaker or mixed collective and an adaptive red-teamer.

## Pilot run (2026-11-12)

CooperBench was piloted on five pairs with Claude Haiku 5.5 (`results/cb1-cooperbench/REPORT.md`): solo 5 of 5, two cooperating agents 2 of 5 (three merge conflicts), [US$ redacted] in total. The unmodified harness fails on Claude 5.5 models when its history compaction triggers; moving the trigger fixes it. Solo is at ceiling on those pairs, so the benchmark measures what coordination loses, not what a collective gains.

## Full run on the 50-pair subset (2026-11-12)

CB2 (`results/cb2-cooperbench/REPORT.md`, preregistered, [US$ redacted]): one agent 29 of 50, two agents with no communication 8, with messaging 10, with a shared remote and no messaging 19. The shared remote was above messaging (+0.18; 0.07 to 0.32) and above no communication (+0.22; 0.10 to 0.37); messaging was not distinguishable from no communication; no cooperating arm was above one agent. Solo is not at ceiling on the 50 pairs (0.58), so the pilot's caution applies to the five easy pairs only. Operational notes: pull the task images before a run (a cold `docker run` passes the harness's 120-second limit and the pair is lost), and do not remove the harness's git container between passes.

## Rules to adopt (from 01, 02, 03, 05)

- One hard cap on total billed tokens per task, counting planner, merge, board and sub-agents; a separate wall-clock cap; results at three budgets or more.
- Arms: single agent with the full budget; k independent attempts selected by a visible check; scripted map-reduce; orchestrator with workers; the swarm; and, where information is split, no-communication and oracle-communication controls. Same model, tools and base prompt in every arm.
- For a mechanism: a sweep of its parameter, a null version of it, and a condition where it should not help.
- Report the scaling curve in N, the loss when agents are removed mid-task, and the time to recover after a scripted change.
- Five to ten seeds, paired analysis, bootstrap intervals, graded scores where tests allow. At [US$ redacted] per study the interval is about ±10 to ±17 points: only large effects are detectable.

## Proposed order

1. **Shared token and wall-clock ledger with the arms above** as a harness of ours. Free; needed by everything else.
2. **CooperBench pilot**: five pairs, solo against coop, small model, to measure cost and the harness work. It is the real-benchmark form of the B3 coding batch. Its calls are interactive and outside the batch ledger, so it needs the owner's approval.
3. **A Silo-Bench-style study with the missing conditions added** (a shard-holder dropped or corrupted, a shard changed mid-run) and biological mechanisms as arms, each with its sweep and null. This is the study nobody has published.
4. Murmur and Abracadabra after the first two have shown what a matched comparison costs us.

What the lab's earlier work contributes: the preregistration and leak-probe discipline, the warning that six of its own findings did not survive replication, and three priors that save arms (votes among direct agents add nothing; working space for one agent dominates; a trace-following policy is a bet on how the field changes).
