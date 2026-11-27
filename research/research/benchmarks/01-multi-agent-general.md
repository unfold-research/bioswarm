# General benchmarks and evaluation methodology for multi-agent / swarm LLM systems

Study date: 2026-11-12. Scope: general-purpose benchmarks and methodology papers for comparing a collective of LLM agents against one strong agent and against a conventional orchestrator.

## 0. How to read this document

**Evidence standard.** Every paper below was opened at its primary source (arXiv HTML/abstract page, ACL Anthology, vendor post) and repository metadata was read from the GitHub API on the study date. Pages were read through an extraction step that truncates long papers at about 100k characters, so appendices were often not seen. Consequences:

- A number without a tag was read from the primary source.
- **UNVERIFIED** means: not seen at the primary source (secondary summary, memory, or a part of the paper that was truncated), or my own inference.
- **ESTIMATE** means: my own back-of-envelope cost figure, not something any paper reports. All estimates assume a mid-tier model at roughly [US$ redacted] per million input tokens and [US$ redacted] per million output tokens with no caching. Recompute with the model and price list actually used.
- Nothing was executed. "Runnable with the Anthropic API" is judged from the paper's model list and the repo README, not from a test run.

**The four conditions** (shorthand used in every table):

| Code | Condition |
|---|---|
| C1 | No single agent can see the whole problem (information is partitioned or exceeds one context) |
| C2 | Individuals are unreliable (noise, faults, weak members) |
| C3 | The environment changes while the work is in progress |
| C4 | Real parallelism helps (independent sub-work, wall-clock matters) |

**The uncomfortable summary.** In nearly every benchmark below, C1 is *imposed by the harness* (the input is cut into shards and handed out). A single agent given the whole input is then the upper bound by construction, and the benchmark measures how much a collective *loses*, not whether it can *win*. Only three situations in the literature leave room for a collective to beat one agent: (i) the whole input no longer fits or is no longer usable in one context (Silo-Bench at large N, Tran & Kiela's context-degradation experiment); (ii) wall-clock is capped and work is parallelisable (WideSearch, Gaia2 Time split, the Anthropic research system); (iii) the single agent's success rate is low enough that redundancy and verification pay (Scaling paper: below about 45% single-agent success). Design our experiments around those three, not around "multi-agent tasks" in general.

---

## 1. Summary table

| Benchmark | Year | Tasks | Agents | Scoring | Single-agent baseline in paper | Matched budget | C1 | C2 | C3 | C4 | Code licence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MultiAgentBench / MARBLE | 2025 | 6 scenarios, ~100 each | 2–7 (varies) | Mixed; 2 of 6 scenarios LLM-judged, all process metrics LLM-judged | No (only a 1-agent point in an ablation figure) | No | weak | no | weak | weak | MIT |
| SwarmBench | 2025 | 5 grid tasks | 8–30 | Objective | Centralised "commander" variant only | No | yes | noise ablation | yes | yes | MIT |
| AgentsNet | 2025 | 5 problems x 27 graphs (+81 scaling) | 4–100 | Objective, strict binary | No | No | yes (artificial) | no | no | no (synchronous rounds) | MIT |
| HiddenBench | 2025/26 | 65 | 4 (3–7 ablated) | Objective | Yes: full-information single agent (ceiling) | No | yes (artificial) | no | no | no | MIT |
| Silo-Bench | 2026 | 30 x 54 configs | 2–100 | Objective | Yes: N=1 oracle with full input | No, tokens reported | yes (artificial; real at large N) | no | no | partly | Unlicense |
| CooperBench | 2026 | 652 feature pairs | 2 (3–4 on a subset) | Objective (hidden tests) | Yes: Solo agent does both features | Same workload, tokens not matched (UNVERIFIED) | partly | no | yes (peer edits the repo) | yes | MIT |
| Collaboration Gap (maze) | 2025 | generated 6x6 mazes | 2 | Objective route check, LLM extracts the route | Yes: solo, full and distributed map | No | yes (artificial) | weak-partner pairings | no | no | no code found |
| AgentWorld | 2026 | 100 + 100 augmented | 3–20 | Objective verifier (+1 judged metric) | Yes: one agent plays all roles (28.6% vs 52.0%) | No | yes | no | partly | yes | MPL-2.0 |
| Gaia2 / ARE | 2025 | 800 (+320 augmented); mini 160 | 1 + app-agents | Objective verifier, LLM soft checks | Yes: same scenarios without Agent2Agent | Cost-capped curves | A2A split only | Noise split | yes | Time split | MIT |
| WideSearch | 2025 | 200 | 1 + parallel sub-agents | Table match, partly LLM-judged | Yes | No | no | no | live web | yes | MIT |
| MAC-Bench | 2026-11 | 48 test | not stated | Objective private verifiers | Yes: ReAct | Yes: shared 5/10/15M token cap, 2 h wall-clock | partly | no | UNVERIFIED | partly | not stated |
| alem | 2026 | procedural, 3 difficulty levels | 2–N | Objective return | Appendix only (not seen) | No | yes | no | yes | yes | MIT |
| Collab-Overcooked | 2025 | 30 (6 levels) | 2 | Objective vs reference trajectories | No | No | yes (artificial) | no | mild | no | MIT |
| REALM-Bench | 2025 | 14 problems + JSSP sets | 1–many | Objective (makespan gap) | Unsupported claim only | No | no | no | scripted disruptions | no | none |
| BattleAgentBench | 2024 | 7 stages | 1–6/8 | Objective game score | Stages 1–2 are single-agent navigation, not a baseline | No | partly | no | yes | weak | MIT |
| TheAgentCompany | 2024/25 | 175 | 1 (+LLM NPC colleagues) | Checkpoints, 29% of tasks LLM-evaluated | It *is* the single-agent result; one MAS (OWL) did far worse | No | partly | no | mild | weak | MIT |
| GAIA | 2023 | 466 (165 dev / 301 test) | 1 | Objective exact match | Single-agent benchmark | No | no | no | live web | weak | gated dataset |
| AgentBench | 2023 | 1,014 test in 8 envs | 1 | Objective | Single-agent benchmark | No | no | no | no | no | Apache-2.0 |

Methodology-only papers (no benchmark of their own): MAST, Towards a Science of Scaling Agent Systems, Towards a Science of Collective AI, Tran & Kiela (equal thinking-token budgets), Phase Transition for Budgeted Multi-Agent Synergy. See section 3.

---

## 2. Benchmarks in detail

### 2.1 MultiAgentBench / MARBLE

- Source: https://arxiv.org/abs/2503.01935 · code https://github.com/MultiagentBench/MARBLE (MIT, 62 stars, last push 2025-06-21, i.e. unmaintained for 17 months).
- **Task.** Six scenarios: Research (co-write a proposal), Minecraft (build), Database (diagnose anomalies), Coding, Bargaining, Werewolf. Supports star, chain, tree and graph topologies and several planning strategies.
- **Size.** "100 test cases per task" for the four task-oriented scenarios; 100 Werewolf archives; 100 Bargaining products. Research is split 33/34/33 easy/medium/hard. No total is stated; about 600 is my sum.
- **Agents.** Database: exactly 5. Bargaining: 2 sellers + 2 buyers. Others not stated in the text I could read. Ablation on Research uses 1, 3, 5, 7 agents.
- **Scoring.** Task Score is rule-based for Minecraft, Werewolf, Database, Coding and **LLM-rubric-judged for Research and Bargaining**. The milestone KPI is detected by an LLM. The Coordination Score (communication + planning, 5-point scale) is judged by GPT-4o. Human validation only on Werewolf (6 annotators, 60 tasks); the text says results "are closely aligned" and gives no coefficient in the part I read.
- **Single vs multi.** No single-agent baseline in the results table. The agent-count ablation is a figure without numbers in the text: overall KPI *decreases* as agents are added; coordination score improves from 1 to 3 agents. No budget matching; token use shown only on a rescaled 0–100 axis.
- **Published results.** gpt-4o-mini has the highest average task score. Research task scores sit at 70–84 for every model including Llama-3.1-8B (80.87) — the judged metric does not discriminate. Minecraft is near floor (0.21–33.6). Coordination score does not track task score (Llama-3.1-70B Minecraft: TS 0.21, CS 75.0).
- **Conditions.** C1 weak (roles are assigned, information is mostly shared; Werewolf and Bargaining have private information but they are competitive, not a joint task). C2 no. C3 weak (opponents act). C4 weak.
- **Flaws.** Judge noise on the headline metrics; Research is saturated and model-insensitive; models are 2024-era small models, so results say little about current frontier; the "graph is best" finding rests on one scenario; repo stale.
- **Anthropic API.** No Claude model in the paper. Whether MARBLE's model layer accepts Anthropic keys out of the box: UNVERIFIED.
- **Cost.** Not reported.
- **Verdict.** Do not adopt as a primary benchmark. Useful only as a source of task content (Database, Coding) with our own scoring.

### 2.2 SwarmBench ("Benchmarking LLMs' Swarm Intelligence")

- Source: https://arxiv.org/abs/2505.04364 (v4, 2025-10-15) · code now at https://github.com/RUC-GSAI/YuLan-SwarmIntell (the paper's link x66ccff/swarmbench redirects there; MIT, 40 stars, last push 2025-05-21).
- **Task.** Five decentralised tasks on a 2D grid: Pursuit (surround a faster prey), Synchronization (all agents flip a binary state together), Foraging (carry food to a nest), Flocking (form a target shape), Transport (push a large block out, then escape). Each agent sees a k x k window (5x5 in the main runs; 3 and 7 ablated), remembers the last 5 rounds, and can message only locally.
- **Size.** 5 tasks x 5 simulations per model; 13 models. Agent counts of 8, 12, 16 in the main scaling section and 20, 30 in an appendix. Default N, grid size and round limit: not found in the text I read (a 100-round figure exists).
- **Scoring.** Fully objective per-task counters (captures, unanimous flips, food delivered, distance progress, time-weighted escapes).
- **Baselines.** Three rule-based strategies per task (20 runs each), a human baseline, and a centralised variant where agent 0 is a global commander. No single-agent baseline is meaningful (one body cannot surround a prey).
- **Published results.** Best totals: gemini-2.0-flash 27.40, o4-mini 26.62, claude-3.7-sonnet 25.70. **Transport is 0.00 for 11 of 13 models.** Humans score far higher (Foraging 20.40 vs best LLM 5.80; Synchronization 41.95 vs 12.60). Rule-based Pursuit reaches 9.15, on par with the best LLM (9.60). Centralised vs decentralised (gemini-2.0-flash): Synchronization 9.00 vs 3.40, Foraging 8.20 vs 5.80, Pursuit equal. With 20% message corruption and 0–4 step delay, gemini-2.0-flash drops 52%, o4-mini is unchanged.
- **Variance.** Very large with 5 runs: claude-3.7-sonnet Synchronization is 12.60 ± 9.62; gemini Foraging 5.80 ± 4.35. Model rankings on single tasks are not significant.
- **Conditions.** C1 yes and physically grounded (local view). C2 only through the noise/delay ablation. C3 yes (prey moves, other agents move). C4 yes (embodied simultaneity).
- **Flaws.** It tests whether an LLM can *be* a swarm particle, not whether a swarm of LLMs solves a hard problem. Classic non-LLM controllers would likely beat every LLM at a millionth of the cost (the paper's own heuristics already tie on Pursuit); a comparison with real swarm algorithms was not found. Centralised control wins or ties everywhere it was tested, which is the opposite of what the lab wants to show. No token or cost reporting.
- **Anthropic API.** Claude 3.5 Haiku and 3.7 Sonnet were evaluated, so a route exists; whether directly or via a router: UNVERIFIED.
- **Cost.** ESTIMATE: 10 agents x 100 rounds = 1,000 calls per simulation, ~1.5k input tokens each → ~[US$ redacted] per simulation, ~[US$ redacted] for the 25-simulation table per model. To get usable confidence intervals plan 20+ seeds per task (~[US$ redacted]).
- **Verdict.** The only swarm-native LLM benchmark. Good as a cheap decentralised-coordination unit test with noise injection. Not a "complex task" and not a place where we can claim a win over a single agent.

### 2.3 AgentsNet

- Source: https://arxiv.org/abs/2507.08616 · code https://github.com/floriangroetschla/AgentsNet (MIT) · data https://huggingface.co/datasets/disco-eth/AgentsNet.
- **Task.** Five distributed-computing problems on a communication graph, one agent per node, synchronous message rounds: (Δ+1)-Coloring, Minimal Vertex Cover, Maximal Matching, Leader Election, Consensus. Agents know only their neighbours.
- **Size.** 27 graphs (small-world, scale-free, Delaunay; 4, 8, 16 nodes) x 5 tasks. Scaling study: 81 graphs up to 100 agents.
- **Scoring.** Objective and strict: an instance counts only if the whole network satisfies the property.
- **Single vs multi.** No single-agent or centralised baseline. These problems are trivial for one agent that sees the graph, so the benchmark measures protocol execution, not problem-solving.
- **Published results.** Mean solved fraction: Gemini 2.5 Pro 0.80, Claude 3.7 Sonnet 0.70, Gemini 2.5 Flash 0.69, o4-mini 0.53, GPT-4.1 mini 0.45, Claude 3.5 Haiku 0.26. With Gemini 2.0 Flash, performance decays smoothly with size and "drops to near zero" at 100 agents.
- **Conditions.** C1 yes but artificial. C2 no (authors list faulty/adversarial agents as future work). C3 no. C4 no (rounds are synchronous and fixed: 4–6 for local tasks, 2D+1 for global ones).
- **Flaws.** Fixed round count; JSON answer parsing errors counted as failures; binary metric hides partial progress; homogeneous agents; "at least one repeat" per graph, so thin statistics.
- **Anthropic API.** Claude models evaluated in the paper.
- **Cost.** A cost-per-repeat axis exists in Figure 1 but no dollar values in the text. ESTIMATE: ~[US$ redacted] per instance at 8–16 nodes, ~[US$ redacted] per full 135-instance repeat; 100-node instances are an order of magnitude more.
- **Verdict.** Best existing harness for *decentralised protocols at 16–100 agents* with objective scoring. We would have to add what the lab cares about: faulty nodes (C2), topology change mid-run (C3), and a token-matched "one agent sees the graph" control.

### 2.4 HiddenBench (hidden-profile tasks)

- Source: https://arxiv.org/abs/2505.11556 (ICML 2026, https://proceedings.mlr.press/v306/li26ej.html) · code https://github.com/Yassellee/HiddenBench_ICML (MIT) · data on Hugging Face `YuxuanLi1225/HiddenBench`.
- **Task.** The social-psychology hidden-profile paradigm: each agent gets shared facts plus unique facts; the correct option is only reachable by pooling. A Full Profile condition gives every agent everything.
- **Size.** 65 tasks (57 generated and filtered, 3 manual, 5 from human studies). Groups of 4; ablation over 3–7.
- **Filtering.** From 200 generated candidates, kept those with ≥80% accuracy under Full Profile and ≤20% under Hidden Profile before discussion.
- **Scoring.** Objective (designated correct option), 10 sessions per task.
- **Single vs multi.** Abstract: 30.1% multi-agent accuracy with distributed information vs 80.7% for single agents with full information, across 15 models. Best model (Gemini 2.5 Pro) reaches 0.671 after discussion. More rounds do not help monotonically (GPT-4.1: 0.108, 0.200, 0.233, 0.133 at 5/10/15/20 rounds). Gains shrink with group size (+0.348 at N=3 to +0.006 at N=7, but the per-N task counts are 7, 58, 5, 5, 5, so the trend is weakly supported). A blunt "share all information" prompt gets GPT-4.1 to 0.467; a reveal-everything protocol to 0.926 on 18 tasks.
- **Conditions.** C1 yes, artificial. C2 no. C3 no. C4 no.
- **Flaws.** Tasks were selected *against* GPT-4.1-family behaviour, which biases the ranking of models. The collective cannot beat the full-information single agent by construction; the right reading is "fraction of the ceiling recovered". A trivial dump-all protocol nearly solves it, so it measures the default disposition to share, not hard integration. No Claude model evaluated. No tokens or cost.
- **Anthropic API.** Not evaluated on Claude; adapter status UNVERIFIED.
- **Cost.** ESTIMATE: one session = 4 agents x ~15 turns ≈ 60 calls ≈ [US$ redacted]; full protocol 650 sessions ≈ [US$ redacted]; a 20-task x 5-session subset ≈ [US$ redacted]
- **Verdict.** Cheap, objective, clean statistics. Use it to compare information-pooling mechanisms (blackboard/stigmergy vs chat vs orchestrator polling) at equal tokens, reporting the fraction of the full-profile ceiling.

### 2.5 Silo-Bench

- Source: https://arxiv.org/abs/2603.01045 (ACL 2026 main, https://aclanthology.org/2026.acl-long.1354/) · code https://github.com/jwyjohn/acl26-silo-bench (Unlicense).
- **Task.** 30 algorithmic tasks adapted from LeetCode-style problems in three communication-complexity levels (10 each): Aggregation O(N), Mesh O(N), Global Shuffle O(N log N)–O(N²). The global input is cut into N near-equal shards; no agent is privileged; **input size scales with N** so per-agent load is constant. Role-free: agents choose their own topology over one of three protocols (peer-to-peer, broadcast, shared file system).
- **Size.** N ∈ {2, 5, 10, 20, 50, 100}; 54 configurations x 30 tasks = 1,620 experiments.
- **Scoring.** Objective, programmatic ground truth: success rate and partial correctness, plus tokens and communication density.
- **Single vs multi.** N=1 oracle (one agent, full input, no communication) is reported as the upper bound. For GPT-OSS-120B the oracle itself falls from 96.7% to 20.0% (Level I), 90.0% to 13.3% (Level II), 80.0% to 10.0% (Level III) as the input grows. Multi-agent averages: DeepSeek-V3.1 36.9%, GPT-OSS-120B 16.9%, Qwen3-Next 8.2%. DeepSeek by N: 61.2% (2), 48.5% (5), 39.9% (10), 33.6% (20), 19.0% (50), 18.1% (100); Level III is 0% at N ≥ 50. Diagnosis: agents exchange enough information but fail to integrate it ("communication-reasoning gap").
- **Conditions.** C1 yes; at large N it becomes *real* because the oracle's own accuracy collapses with input size. That is the one regime in this survey where a collective has headroom above the single agent. C2 no. C3 no. C4 partly (shards can be processed concurrently; Level I is embarrassingly parallel).
- **Flaws.** **Each configuration was run once** (fixed data seeds) — no variance estimate. Only three open models, none frontier, no closed model. LeetCode provenance means solution patterns are memorised, although the instances are generated. Tokens are reported (mean communication tokens per agent 2.0k–8.5k) but there is no budget-matched comparison. Only three protocols; no hierarchical or gossip mechanisms.
- **Anthropic API.** Not evaluated on closed models (authors cite cost). Adapter status UNVERIFIED; expect to write one.
- **Cost.** ESTIMATE: at N=20, ~20 agents x a few rounds x 2–8k tokens ≈ 0.2–0.5M tokens ≈ [US$ redacted] per run; a subset of 12 tasks (4 per level) x N ∈ {1, 5, 20, 50} x 5 seeds x 3 systems ≈ 720 runs ≈ [US$ redacted] N=100 roughly doubles it.
- **Verdict.** Closest fit to the lab's question: scalable to 100 agents, objective, role-free, has the single-agent oracle, and has a regime where the oracle degrades. Missing C2 and C3, which we can add (drop or corrupt a shard-holder; mutate a shard mid-run).

### 2.6 CooperBench

- Source: https://arxiv.org/abs/2601.13295 (ICLR 2026) · code https://github.com/cooperbench/CooperBench (README badge says MIT; GitHub API reports no detected licence file; actively maintained, last push 2026-10-18) · data `CodeConflict/cooperbench-dataset` on Hugging Face · `pip install cooperbench`.
- **Task.** Two coding agents each implement a different feature in the same real repository. Features are compatible but touch overlapping code. Agents can message each other; the two patches are merged and run against hidden tests.
- **Size.** 652 feature pairs from 199 features in 12 repositories (Python, TypeScript, Go, Rust). The repo has a `lite` subset and a curated 10-pair `flash_10` subset. Settings: `solo`, `coop`, `team` (lead + members with shared task list).
- **Scoring.** Objective: expert-written tests after merge.
- **Single vs multi.** Solo = one agent implements both features. GPT-5 and Claude Sonnet 4.5 reach about 25% in the two-agent setting, roughly half of Solo; pooled retention across models 0.59. On a 46-task subset success falls from 68.6% (2 agents) to 46.5% (3) to 30.0% (4). About 20% of steps go to communication; messages reduce merge conflicts but not failures. Root causes: expectation gaps 42%, commitment gaps 32%, communication gaps 26%. Whether Solo and Coop are matched in tokens, steps or wall-clock: UNVERIFIED (not in the text I could read); "same total workload" is what the README claims.
- **Conditions.** C1 partly (each agent knows only its own feature spec, but both can read the whole repo). C2 no. C3 yes in a real sense: the peer is editing the same codebase concurrently. C4 yes: the two features are independent work and coop should be faster in wall-clock, which the paper does not appear to report (UNVERIFIED).
- **Flaws.** A single agent with both specs is strictly better informed, so Solo ≥ Coop is expected on accuracy; the missing measurement is wall-clock at equal tokens. Open issues show the harness needed several correctness fixes during 2026 (ungradeable features, agents unable to tell a finished peer from a silent one), so pin a version. Needs Docker, Modal or GCP sandboxes plus Redis.
- **Anthropic API.** Yes: `ANTHROPIC_API_KEY` is a documented setting and Claude Sonnet 4.5 is in the paper.
- **Cost.** Not reported in what I read. ESTIMATE by analogy with TheAgentCompany ([US$ redacted] per agentic task): [US$ redacted] per agent-run; `flash_10` x {solo, coop, ours} x 3 seeds ≈ 120 agent-runs ≈ [US$ redacted]
- **Verdict.** The best real-work benchmark with a clean single-agent control and genuine concurrency. A collective is unlikely to win on accuracy; the publishable question is retention at matched tokens and the wall-clock ratio.

### 2.7 The Collaboration Gap (split-maze)

- Source: https://arxiv.org/abs/2511.02687 (Microsoft Research et al.; a COLM 2026 version exists).
- **Task.** Two agents each see the same 6x6 maze with about half the cells hidden and must agree on every move. A gpt-4.1 grader extracts the agreed route; success is then checked objectively.
- **Size / stats.** Generated mazes (count not stated); at least 100 rollouts per setting, 50 per heterogeneous pair; confidence intervals reported. 32 models.
- **Single vs multi.** Solo with full map: about half the models near-perfect. Homogeneous pairs drop for "virtually all" models: gpt-4.1 0.50, gpt-4.1-mini 0.39 weighted outcome (binary 0.01), o3 0.77, gemini-2.5-pro 0.84, gpt-5 0.99. Order effects: gpt-4.1-mini + o3 scores 0.77 when o3 speaks first and 0.62 otherwise. "Relay inference" (strong model opens, weak model continues) recovers much of the gap.
- **Conditions.** C1 artificial. C2 through weak-partner pairings. C3 no. C4 no.
- **Flaws.** Toy; already saturated by gpt-5; no code repository found; token cost not reported and described by the authors as considerable.
- **Verdict.** Copy the statistics (≥100 rollouts, CIs, order-effect control), not the task.

### 2.8 AgentWorld

- Source: https://arxiv.org/abs/2609.31590 · code https://github.com/openagents-org/agentworld (MPL-2.0, active).
- **Task.** Long-horizon collaboration in a persistent 2D sandbox world (combat, crafting, gathering, trading, exploration, survival, construction, coordination). 3–20 agents with asymmetric roles, skills, spawn points and items; "blackbox": agents see nothing of teammates except chat. Turn-based for reproducibility; round budgets 25–55 (mean 38).
- **Size.** 100 human-annotated tasks + 100 LLM-augmented variants; 45 of the 100 use 3 agents.
- **Scoring.** Objective Python verifier on final state (success, partial success). One extra metric (causal contribution of communication) uses a GPT-4.1 judge, κ = 0.64 against humans.
- **Single vs multi.** With Gemini 3 Flash: multi-agent 52.0%, **single agent playing all roles 28.6%**, no communication 22.9%, shared plan without communication 17.6%, oracle communication 60.0%, random 5.7%. Other models: Claude Haiku 4.5 45.0%, GPT-5 Mini 36.0%. Not budget-matched; tokens not reported.
- **Conditions.** C1 yes. C2 no. C3 partly (world state evolves through others' actions; no scripted shocks found). C4 yes (agents act in different places).
- **Flaws.** Very new, four main models, run-to-run variance measured on only 3 runs of one model on 35 tasks. The single-agent control is "one model round-robins all bodies", which handicaps it with a long context rather than giving it an equal budget. This is one of the few published cases where multi beats single, and it is not controlled for tokens.
- **Anthropic API.** Claude Haiku 4.5 evaluated.
- **Cost.** Not reported. ESTIMATE: 3 agents x 38 rounds ≈ 115 calls ≈ [US$ redacted] per 3-agent task; 20-agent tasks 5–10x.
- **Verdict.** Strong candidate for the embodied/role-asymmetric slot if we re-run its single-agent control at matched tokens.

### 2.9 Gaia2 / Meta Agents Research Environments (ARE)

- Source: https://arxiv.org/abs/2509.17158 · code https://github.com/facebookresearch/meta-agents-research-environments (MIT, 579 stars, active).
- **Task.** A simulated smartphone world (10 "universes", 101 tools each). **Time advances whether or not the agent acts**; scenarios contain scheduled and random events. Seven capability splits of 160 scenarios: Search, Execution, Adaptability, Time, Ambiguity, Noise, Agent2Agent. In Agent2Agent a fraction r of apps is replaced by autonomous app-agents that the main agent can only message.
- **Size.** 800 annotated scenarios + 320 augmented (Noise, Agent2Agent); Gaia2-mini 160.
- **Scoring.** A verifier matches the agent's write actions against annotated oracle actions with exact checks, plus an LLM judge (Llama 3.3 70B) for free-text arguments and timing windows. Verifier agreement with humans 0.98 on 450 trajectories. pass@1 over 3 runs with standard error.
- **Single vs multi.** Overall / Agent2Agent pass@1: GPT-5 (high) 42.1 / 17.9; Claude 4 Sonnet 34.8 / 27.9; Gemini 2.5 Pro 25.8 / 20.4; Llama 4 Maverick 7.4 / 9.2. Collaboration helps weak models and does not improve the score-per-token curve for Claude 4 Sonnet. Heterogeneous teams on mini: Llama main + Llama apps 8.5 ± 1.7; Llama main + Claude apps 16.2; Claude main + Llama apps 18.3; Claude + Claude 29.3 ± 2.9. Time and Noise are the hardest splits; GPT-5 (high) scores 0.0 on Time because slow reasoning misses deadlines. Injected noise on Claude 4 Sonnet: 31.2 (none), 23.8 (default), 8.1 (high).
- **Conditions.** C1 only in Agent2Agent. C2 yes in Noise (tool failures, distractor events). **C3 yes — the only benchmark here with a genuinely asynchronous clock.** C4 yes in Time; the authors note their own scaffold cannot run actions in parallel, which some Time scenarios need.
- **Flaws.** The multi-agent mode is a fixed hub-and-spoke hierarchy, not a peer collective. Verifier assumes one valid action sequence. Dollar cost per scenario only in a figure. Real-time runs were disturbed by provider rate limits.
- **Anthropic API.** Provider-agnostic ReAct scaffold; Claude 4 Sonnet evaluated.
- **Cost.** ESTIMATE: [US$ redacted] per scenario for a frontier model; Time + Noise + Adaptability at mini scale (≈ 70 scenarios) x 3 runs x 3 systems ≈ [US$ redacted]
- **Verdict.** The right place to test C2 and C3 with objective scoring. We would bring our own orchestration (the paper invites this) and report against the paper's ReAct baseline under the same cost cap.

### 2.10 WideSearch

- Source: https://arxiv.org/abs/2508.07999 · project https://widesearch-seed.github.io/ · code https://github.com/ByteDance-Seed/WideSearch (MIT).
- **Task.** Broad information gathering: given a query and a table schema, find every matching entity on the live web and fill every cell. Tasks were kept only if a human needed more than 10 minutes and 10 pages; annotators averaged 2.33 hours and 44 pages.
- **Size.** 200 tasks (100 English, 100 Chinese); 4 attempts each.
- **Scoring.** Success = table exactly matches ground truth; row and item F1. Cell matching mixes exact, numeric, date, URL rules and a GPT-4.1 judge (97.8–98.3% agreement with humans).
- **Single vs multi.** Same model, naive lead + parallel sub-agents vs single agent. Success (Avg@4): o3 4.5 → 5.1; Claude Sonnet 4 2.3 → 3.6; Gemini 2.5 Pro 1.5 → 2.0. Row F1: Claude Sonnet 4 31.7 → 38.5; Kimi K2 29.7 → 36.2. Human single attempt 20%. **No budget matching** and no token report; the multi-agent mode certainly used more tokens.
- **Conditions.** C1 no. C2 no. C3 live web drift (uncontrolled). C4 yes — the cleanest case of work that is wide, independent and time-consuming.
- **Flaws.** Success rate is at floor (≤5%), so only F1 discriminates. Live web makes results non-reproducible over time. Half the set is Chinese. Unmatched budgets mean the reported multi-agent gain cannot be separated from extra compute.
- **Verdict.** Use a frozen-corpus variant of the same idea if we want to show a parallelism win. BrowseComp-Plus (https://arxiv.org/abs/2508.06600, fixed corpus) is the reproducible alternative; its exact size and licence are UNVERIFIED here.

### 2.11 MAC-Bench

- Source: https://arxiv.org/abs/2611.01728 (November 2026) · code github.com/rzchen777-wq/MAC_Bench · data `sihuichuibuqi/MAC-Bench` on Hugging Face. Code licence not stated.
- **Task.** Each task is a bundle of interconnected work components with dependencies and shared-resource constraints, in business operations (finance, service, project) and software engineering (app, library, dev tools).
- **Size.** 48 test tasks (8 per category) plus a development set.
- **Scoring.** Objective private verifiers on final state: Progress Score and Resolved Rate.
- **Single vs multi at matched budget.** This is the one benchmark that enforces it: **a shared cap of 5M, 10M or 15M input+output tokens per task covering every model call including sub-agents, and a 2-hour wall-clock limit**, same backbone for all roles. Progress / resolved (%), GPT-6 Luna: ReAct 17.74 / 4.17; Meta-Team 22.63 / 6.25; Superagent 9.66 / 2.08; Magentic-One 6.50 / 0.00; AOrchestra 5.37 / 0.00. DeepSeek-Flash: ReAct 21.88 / 6.25; Meta-Team 23.88 / 4.17; others ≤ 7.72. Three of four multi-agent systems are far *below* single-agent ReAct; one is slightly above on progress.
- **Conditions.** C1 partly (the workload is large; whether it exceeds one context is UNVERIFIED). C2 no. C3 UNVERIFIED. C4 partly (components have dependencies).
- **Flaws.** **One episode per cell, no seeds, no variance**; with 48 tasks a resolved-rate difference of 4.17 vs 6.25 is one task. At floor (max 6.25% resolved). Brand new, unreviewed; I read only the first 40% of the paper.
- **Cost.** ESTIMATE from the caps: 5–15M tokens per task is [US$ redacted] per task per system at mid-tier prices before caching; a full 48-task pass ≈ [US$ redacted] per system per seed.
- **Verdict.** Copy the budget protocol. Too expensive and too close to floor to adopt whole; a 6–8 task slice is the most we should consider.

### 2.12 alem

- Source: https://arxiv.org/abs/2606.08340 · code https://github.com/alem-world/alem-env (MIT, active).
- JAX survival world built on Craftax-Coop with procedurally sampled coordination tasks (synchronous and handover), partial observability, three difficulty levels. Objective normalised return. 13 LLMs zero-shot plus four MARL baselines at 100M and 1B steps. LLMs average about 6% total; on Hard, Gemini-3.1-Pro-High reaches 17.5% coordination score against 17.6% for MARL at 1B steps. Removing communication cuts Gemini from 17.5 to 5.3. Heterogeneous teams land at the mean of their members. Proprietary models limited to 10 seeds for cost; Claude not evaluated. A single-agent comparison is in an appendix I did not see (UNVERIFIED).
- C1 yes, C3 yes, C4 yes, C2 no. A serious open-ended environment, but near floor for LLMs and expensive per episode; keep on the watch list.

### 2.13 Collab-Overcooked

- Source: https://arxiv.org/abs/2502.20073 · code https://github.com/YusaeMeow/Collab-Overcooked (MIT, active).
- Two agents in separated kitchens: resources are isolated and only one agent knows the recipe, so collaboration is forced. 30 tasks in 6 levels (5 each), 10 repetitions per task. Objective: success rate plus progress scored against reference action trajectories. GPT-4o success by level: 94, 86, 68, 34, 2, 4. DeepSeek-R1: 100, 100, 98, 82, 44, 30, at 18.6x the tokens of GPT-4o. Human pairs stay at 90–100. No single-agent baseline. Prompts ~2,000 tokens per request.
- C1 artificial, others no. Two agents only, sequential by design (no parallelism), reference trajectories may not cover all valid solutions. Not useful for swarm-scale questions.

### 2.14 REALM-Bench

- Source: https://arxiv.org/abs/2502.18836 (v2) · code https://github.com/genglongling/REALM-Bench (no licence).
- 14 planning/scheduling problems (campus tours, ride-sharing, wedding logistics, disaster relief, supply chain, job-shop) with static and "dynamic" variants containing scripted disruptions, plus standard JSSP sets. Objective metrics (makespan gap to upper bound).
- Problems found at the source: the paper says 188 JSSP instances but its own table sums to 182; a caption claims the authors' system beats a baseline that the table shows marginally ahead; tables in the case study contradict each other; "single-agent static 85–95%, multi-agent dynamic 45–70%" is stated without a supporting experiment; no comparison with a classical solver (OR-Tools or similar) was found; no run counts, tokens or cost.
- Scheduling problems are fully visible to one agent and are better solved by a solver. C3 holds only through scripted events. Do not adopt; the disruption idea is worth borrowing.

### 2.15 BattleAgentBench

- Source: https://arxiv.org/abs/2408.15971 · code https://github.com/THUDM/BattleAgentBench (MIT, last push 2025-02).
- Text version of the Battle City tank game; 7 stages in 3 levels (1 agent navigation; 2 agents cooperative or competitive; 4–6/8 agents mixed — the paper is internally inconsistent about stage 7). Objective game score. 3 runs for API models, 5 for open models. claude-3.5-sonnet averages 7.2 at level 3; removing the cooperation interface costs 2.3 points. Authors call the gain from cooperation "relatively small". 60–80 turns chosen to limit cost.
- Mixed cooperative/competitive, 2024 models, three runs, stale repo. Low priority.

### 2.16 TheAgentCompany

- Source: https://arxiv.org/abs/2412.14161 · code https://github.com/TheAgentCompany/TheAgentCompany (MIT, 813 stars) · leaderboard https://the-agent-company.com.
- 175 workplace tasks in a self-hosted company (GitLab, ownCloud, Plane, Rocket.Chat) with LLM-simulated colleagues. Checkpoint scoring; 51 tasks (29%) use LLM-based evaluators. Single-agent OpenHands results: Gemini 2.5 Pro 30.3% full completion at 27.2 steps and [US$ redacted] per task; Claude 3.7 Sonnet 26.3% at [US$ redacted]; Claude 3.5 Sonnet 24.0% at [US$ redacted] The one multi-agent system tested (OWL RolePlay) scored 4.0%. Later leaderboard numbers around 52% come from third-party aggregators: UNVERIFIED.
- It is a single-agent benchmark. C1 partly (some facts must be asked from NPC colleagues), others weak. Heavy infrastructure. A full run is ≈ [US$ redacted] at the reported per-task cost. Useful as a realism check, not for the collective question; the appendix category counts sum to 167, not 175.

### 2.17 GAIA

- Source: https://arxiv.org/abs/2311.12983 · dataset https://huggingface.co/gaia-benchmark (gated) · cost-aware board https://hal.cs.princeton.edu/gaia.
- 466 questions needing browsing, files and tools; answers to 300 are withheld (commonly cited split 165 validation / 301 test). Objective exact match. Humans 92%.
- Single-agent benchmark. No controlled single-vs-multi study found; many leaderboard systems are multi-agent, with different models and budgets, so nothing can be concluded. HAL's top entry is about 74.5% for about [US$ redacted] per full validation run, the cheapest listed about 19.4% for [US$ redacted] (figures via search snippets of the HAL page; treat as lightly verified). HAL paused updates in early 2026 (UNVERIFIED, secondary). Level 1 is close to saturation and validation answers are public, so contamination is likely; claimed inflation sizes are unsourced.
- MAST includes GAIA traces from Magentic-One. Anthropic reports that on BrowseComp-style research, token usage alone explains 80% of performance variance — the same will hold on GAIA, which is why unmatched leaderboard comparisons are uninformative.
- None of the four conditions hold. Do not adopt.

### 2.18 AgentBench

- Source: https://arxiv.org/abs/2308.03688 · code https://github.com/THUDM/AgentBench (Apache-2.0).
- 8 single-agent environments (OS, database, knowledge graph, card game, lateral-thinking puzzles, household, web shopping, web browsing); 269 dev and 1,014 test samples; about 11k inference calls for the test set. Objective metrics. Single-agent by design; 2023 difficulty. None of the four conditions hold. Not relevant except as historical baseline.

### 2.19 Other items found, lower confidence

| Item | What it is | Status |
|---|---|---|
| AgentWebBench, https://arxiv.org/abs/2604.10938 (ICML 2026), MIT | One user agent coordinating with website-specific content agents on search, recommendation, QA, deep research. Decentralised access "generally lags behind centralized retrieval"; gap narrows with model scale; can win on QA | Abstract read. "100 content agents" is from a search snippet: UNVERIFIED |
| Magentic Marketplace, https://arxiv.org/abs/2510.25779, MIT, active | Two-sided market simulation with many buyer/seller agents; welfare metrics; manipulation and bias probes | Not opened in depth |
| Market-Bench, https://arxiv.org/abs/2604.05523 (ACL 2026) | Competitive supply-chain economy, automatic economic metrics | Snippet only: UNVERIFIED |
| SwarmWorld, arXiv 2608.26081 | Stigmergic "society" vs best-of-N isolated search; shared societies reportedly get broader portfolios while isolated search stays competitive for the single best artifact | Secondary summary only: UNVERIFIED. Read it — it is the nearest thing to our framing |
| MASLab, https://arxiv.org/abs/2505.16988 | Unified codebase with 20+ MAS methods on 10+ benchmarks; no method wins everywhere; evaluation protocol changes rankings | Snippets only: UNVERIFIED. Possible source of orchestrator baselines |
| "Single-agent or Multi-agent Systems? Why Not Both?", https://arxiv.org/abs/2505.18286 | MAS advantage shrinks as base models improve; cascade routing between SAS and MAS | Snippets only: UNVERIFIED |
| DeepSeek-V4.1-Flash report, arXiv 2609.19969 | Agent teams beat single agents at every wall-clock deadline, not token-matched, flagged preliminary by authors | Snippet only: UNVERIFIED |

---

## 3. Methodology papers

### 3.1 MAST — "Why Do Multi-Agent LLM Systems Fail?"

- Source: https://arxiv.org/abs/2503.13657 (v3) · https://github.com/multi-agent-systems-failure-taxonomy/MAST (no licence file detected) · data `mcemri/MAST-Data`.
- 1,642 annotated traces from 7 frameworks (MetaGPT, ChatDev, HyperAgent, AppWorld, AG2/MathChat, Magentic-One, OpenManus) on ProgramDev, SWE-Bench Lite, AppWorld, GSM-Plus, OlympiadBench, MMLU, GAIA. Taxonomy built from 150 traces, human agreement κ = 0.88; an o1-based annotator reaches κ = 0.77 (0.79 on unseen systems).
- 14 failure modes in three groups. Largest: step repetition 15.7%, reasoning-action mismatch 13.2%, unaware of termination conditions 12.4%, disobey task specification 11.8%, incorrect verification 9.1%, no or incomplete verification 8.2%, task derailment 7.4%, fail to ask for clarification 6.8%, premature termination 6.2%. Information withholding is only 0.85%.
- Failure rates of the studied systems: 41% to 86.7%. Targeted fixes to ChatDev gave +9.4% (role specification, or giving one role final say) and +15.6% (adding a high-level verification step).
- It does not compare against single agents itself; that claim is cited from other work.
- **Use for us.** Run the released LLM annotator over our traces and report the MAST profile next to accuracy. Caveats: the taxonomy was built on chat-style role-play frameworks with 2024 models, it has no category for swarm-specific failures (herding, premature convergence, pheromone lock-in), and automated labels at κ ≈ 0.77 are too noisy for small differences.

### 3.2 "Towards a Science of Scaling Agent Systems" (Google / MIT)

- Source: https://arxiv.org/abs/2512.08296 (v2). No code or data release found.
- **Design.** 180 configurations: 5 architectures (single agent; independent, centralised, decentralised, hybrid multi-agent) x 9 models from OpenAI, Google, Anthropic (Claude Sonnet 3.7, 4.0, 4.5) x 4 benchmarks (Finance-Agent 50 instances, BrowseComp-Plus 100, PlanCraft 100, WorkBench 100); 15,750 instance runs. Teams of 3 (plus an orchestrator when centralised); a side experiment varies 1–9 agents.
- **Budget matching.** All configurations matched on total *reasoning-token* budget, "mean 4,800 tokens per trial"; teams split the budget and get fewer iterations per agent. The enforcement mechanism was not found. Turns still differ a lot: single 7.2, independent 11.4, decentralised 26.1, centralised 27.7, hybrid 44.3. So total tokens including context re-reading are *not* equal — overhead is reported as 58% to 515%.
- **Results vs single agent.** Finance-Agent: centralised +80.8% (0.631 vs 0.349). BrowseComp-Plus: decentralised +9.2%, independent about −35%. WorkBench: decentralised +5.7%, others about −1%. PlanCraft: every multi-agent variant −39% to −70%.
- **Derived claims.** Error amplification 17.2x for independent agents, 4.4x for centralised. Success per 1k tokens: single 67.7, independent 42.4, decentralised 23.9, centralised 21.5, hybrid 13.6. Returns turn negative once the single agent exceeds about 45% success. Turns grow as (n + 0.5)^1.724. A 20-parameter regression reaches cross-validated R² = 0.524 and picks the best architecture for 87% of held-out configurations.
- **Cautions.** R² of 0.52 means half the variance is unexplained. Four benchmarks, only 50–100 instances each, number of seeds not found. All agents share one base model. Maximum team size 9, mostly 3–4 — it says nothing about 10+ agents or about decentralised stigmergic designs. The 45% threshold is a fitted boundary on these four tasks, not a law. Not peer-verified code.
- **Use for us.** The most relevant prior for experiment design: pick tasks where the single-agent baseline is clearly below 45%, are decomposable, and are not tool-sequential. Report success per 1k tokens and overhead, as they do.

### 3.3 "Towards a Science of Collective AI" (arXiv 2602.05289)

- Source: https://arxiv.org/abs/2602.05289. **Position paper with no experiments of its own.**
- Proposes the collaboration gain Γ = Φ_M / Φ_S, where Φ_S is "the best achievable results of a single agent when allocated a total resource budget equivalent to that of the MAS"; Γ > 1 is the only evidence of real synergy. The budget can be tokens, sampling steps or tool calls; **wall-clock time is not mentioned**. Insists the single-agent baseline be "saturated" (the best single-agent use of the budget, including independent parallel instances for accumulative tasks).
- Provides a factor library: task factors (decomposability, sequential dependency, clarity), control-level factors (structure, communication mechanism, diversity, scale), information-level dynamics (content entropy, evolutionary distance). Asks for a "stability filtering" stage so that Γ > 1 survives stochastic noise. Gives no seed counts.
- **Use for us.** Adopt Γ and the saturated-baseline rule verbatim; extend it with a wall-clock version.

### 3.4 Tran & Kiela — single agent vs multi-agent at equal thinking-token budgets

- Source: https://arxiv.org/abs/2604.02460. No code link found.
- Budgets of 100 to 10,000 thinking tokens; the single agent gets all of it, multi-agent variants (sequential, sub-task parallel, parallel roles, debate, ensemble) split it evenly. FRAMES and 4-hop MuSiQue; Qwen3-30B, DeepSeek-R1-Distill-70B, Gemini 2.5 Flash and Pro. LLM-as-judge scoring by the same model; 95% bootstrap CIs.
- Average accuracy: at 1,000 tokens single 0.418 vs best multi 0.388; at 10,000 single 0.426 vs 0.423. Single agent is best or statistically tied at every budget except 100 tokens. **Multi-agent wins only when the single agent's context is degraded**: with 70% of context masked or substituted, the sequential system is better.
- Artifacts they report: API thinking budgets are caps the model does not fill (Gemini's visible thinking plateaus below the request), and deep paraphrasing of questions *raises* accuracy, suggesting memorisation of the public benchmarks.
- **Cautions.** Text-only multi-hop QA where everything fits in one context — the setting least favourable to collectives. Judge is the evaluated model. Budget covers thinking tokens, not total tokens.
- **Use for us.** The degradation experiment is the template for showing *when* a collective should win: sweep the degree to which one context is insufficient and find the crossover.

### 3.5 "Phase Transition for Budgeted Multi-Agent Synergy" (arXiv 2601.17311)

- Source: https://arxiv.org/abs/2601.17311. Theory plus synthetic simulation; no LLM benchmark.
- Defines budgeted synergy as "outperforming the best single agent under the same total budget" and derives when it occurs from three constraints: finite context, lossy communication, correlated errors between similar agents. Useful as a source of predictions (correlation between agents' errors is the quantity to measure), not as evidence.

### 3.6 Anthropic, "How we built our multi-agent research system"

- Source: https://www.anthropic.com/engineering/multi-agent-research-system (2025-06-13).
- Lead Opus 4 + Sonnet 4 sub-agents "outperformed single-agent Claude Opus 4 by 90.2% on our internal research eval". Agents use about 4x the tokens of chat, multi-agent about 15x. "Token usage by itself explains 80% of the variance" on BrowseComp. States that domains where all agents need the same context, and most coding, are poor fits.
- Not token-matched, internal eval of about 20 queries, rubric scored by an LLM judge. It is evidence that parallel breadth-first research benefits from more tokens spent in parallel, not that a collective beats a single agent at equal tokens.

---

## 4. What the published single-vs-multi evidence says

| Study | Budget control | Result |
|---|---|---|
| Scaling Agent Systems | Reasoning tokens matched; total tokens not | Depends on task: +81% (finance analysis) to −70% (sequential planning) |
| Tran & Kiela | Thinking tokens matched | Single ≥ multi except with degraded context |
| MAC-Bench | Total tokens capped (shared) + 2 h | 3 of 4 MAS far below single ReAct; 1 marginally above; no variance |
| CooperBench | Same workload | Two agents ≈ half of Solo; worse with 3 and 4 |
| HiddenBench, Silo-Bench, Collaboration Gap | Single agent given full information | Collective recovers a fraction of the ceiling; fraction falls with N |
| AgentWorld | None | Multi 52.0% vs single 28.6% |
| WideSearch | None | Multi slightly better in F1, both at floor on success |
| Gaia2 Agent2Agent | Cost-capped curves | Helps weak models, no gain per token for a strong model |
| Anthropic research system | None | +90.2% at about 4x the tokens of a single agent |

Reading: every result favouring collectives is either not budget-matched or sits in a regime where the single agent is weak or overloaded. No study has shown Γ > 1 at matched *total* tokens on a task a frontier single agent handles above about 45%. No study has tested bio-inspired or decentralised designs at all; "decentralised" in the Scaling paper means 3 peers debating.

---

## 5. (a) Ranked shortlist

Costs are ESTIMATES under the price assumption in section 0, for three systems (single agent, orchestrator, swarm).

| Rank | Benchmark / subset | Why | Conditions covered | Smallest useful subset | Est. cost |
|---|---|---|---|---|---|
| 1 | **Silo-Bench** | Objective, role-free, scales to 100 agents, has the single-agent oracle, and the oracle degrades with input size — the only regime with headroom above one agent | C1 (real at large N), C4 partly; add C2/C3 ourselves | 12 tasks (4 per level) x N ∈ {1, 5, 20, 50} x 5 seeds | [US$ redacted] |
| 2 | **Gaia2-mini**, Time + Noise + Adaptability (+ Agent2Agent) | Only benchmark with an asynchronous clock, injected faults and deadlines; objective verifier; maintained; invites custom orchestration | C2, C3, C4; C1 in A2A | ~70 scenarios x 3 runs | [US$ redacted] |
| 3 | **CooperBench** `flash_10` → `lite` | Real repositories, hidden tests, built-in Solo control, genuine concurrency, Claude supported | C3, C4, C1 partly | 10 pairs x 3 seeds, then lite | [US$ redacted] for flash_10 |
| 4 | **HiddenBench** | Cheapest clean test of information pooling with 10-session statistics and a human reference | C1 | 20 tasks x 5 sessions | [US$ redacted] |
| 5 | **AgentsNet** 16-node set (+ our fault injection) | Objective decentralised-protocol test that scales to 100 nodes | C1; add C2/C3 | 9 graphs x 5 tasks x 3 repeats | [US$ redacted] |

Runners-up: **AgentWorld** (role-asymmetric, multi beats single in the paper — worth re-testing at matched tokens once it has more than one paper behind it); **SwarmBench** (swarm-native, cheap, but centralised control wins and heuristics tie); **MAC-Bench** (copy the protocol; 6–8 tasks at most); **WideSearch / BrowseComp-Plus** for a parallelism-under-deadline demonstration.

Not recommended: GAIA, AgentBench, TheAgentCompany (single-agent benchmarks), MultiAgentBench (judged, saturated, stale), REALM-Bench (internal inconsistencies, solver-dominated), BattleAgentBench, Collab-Overcooked (two agents, sequential).

Cautions on the shortlist:

1. On ranks 1, 4 and 5 the single agent with full information is the ceiling. Report the fraction of ceiling recovered and where the ceiling itself breaks; do not present these as tasks a swarm "wins".
2. Silo-Bench and HiddenBench have never been run on Claude; expect adapter work and expect frontier models to move the numbers a lot (the Collaboration Gap maze went from 0.39 to 0.99 between gpt-4.1-mini and gpt-5).
3. Silo-Bench's published numbers are single runs. Our first job on it is to measure seed variance.
4. CooperBench's harness had correctness fixes through 2026. Pin a release and re-run Solo ourselves; do not compare against the paper's numbers.
5. None of the five tests C2 natively except Gaia2. Fault injection will be our own addition and must be applied identically to all three systems.

---

## 6. (b) Methodology rules to copy

**Budget**

1. Define the comparison as Γ = Φ_M / Φ_S with Φ_S the *best* single-agent use of the same budget, including "N independent single-agent attempts + pick/vote" and "one agent with a longer loop" (Collective AI; Phase Transition).
2. Match **total billed tokens** (input + output + thinking, every call including sub-agents, planners, judges inside the system), enforced as a shared hard cap by the harness, not as a per-call setting (MAC-Bench). Matching only reasoning tokens leaves 58–515% hidden overhead (Scaling paper).
3. A budget passed to an API is a ceiling the model may not use. Log actual consumption and report it; under-use by the single agent is a known artifact (Tran & Kiela).
4. Sweep the budget (at least 4 levels) and plot accuracy against tokens for every system. One budget point proves nothing; crossovers are the result (Tran & Kiela; Gaia2 cost-capped curves).
5. Same base model, same tools, same tool descriptions, same temperature, and no per-system prompt tuning beyond a fixed effort declared in advance (Scaling paper lists unequal prompt tuning as a limitation).
6. Report cost-normalised metrics next to accuracy: success per 1k tokens, overhead percentage, turns (Scaling paper); dollars per run (HAL, TheAgentCompany).

**Wall-clock**

7. Treat time as a second, separate budget: a wall-clock cap per episode (MAC-Bench, 2 h) or an environment clock that advances regardless of the agent (Gaia2). Report results at matched tokens *and* at matched wall-clock; they favour different systems.
8. Measure latency under controlled concurrency. Provider rate limits corrupted Gaia2's real-time runs; fix a concurrency ceiling per system and report it.

**Controls**

9. Always include: full-information single agent (ceiling), single agent with the partitioned view, no-communication collective, shared-plan-without-communication, oracle communication, random policy (AgentWorld, HiddenBench, Silo-Bench N=1).
10. Include a non-LLM baseline wherever one exists (heuristics in SwarmBench; a solver for scheduling). If a 50-line script matches the swarm, the task is wrong.
11. Find the crossover deliberately: degrade or enlarge the single agent's context step by step until the collective overtakes (Tran & Kiela masking experiment; Silo-Bench scaling input with N).
12. Control speaking order and team composition; order alone moved a pairing from 0.62 to 0.77 (Collaboration Gap).

**Variance**

13. Seeds: the careful papers use 10 sessions per task (HiddenBench), 10 repetitions (Collab-Overcooked), ≥100 rollouts per setting (Collaboration Gap), 3 runs with standard error (Gaia2). Single-run designs (Silo-Bench, MAC-Bench) and 5-run designs (SwarmBench: 12.60 ± 9.62) cannot rank systems. Use at least 5 seeds for agentic tasks costing dollars each and at least 10 for cheap ones, and decide the number from a pilot variance estimate, not by habit.
14. Report bootstrap 95% confidence intervals over tasks and seeds, and paired differences on the same task instances (Tran & Kiela; Collaboration Gap).
15. Report both strict success and a partial-progress score; strict binary metrics hide progress (AgentsNet's own limitation) and partial scores hide failure.

**Scoring**

16. Prefer programmatic verifiers on final state. If an LLM judge is unavoidable, restrict it to narrow binary checks, use a different model from the one under test, and publish agreement with humans (Gaia2: 0.98 on 450 trajectories; AgentWorld: κ = 0.64; MultiAgentBench publishes none).
17. Check for memorisation with paraphrased or freshly generated instances (Tran & Kiela found accuracy shifts under paraphrase).
18. Annotate failures with a fixed taxonomy (MAST) so that a loss can be attributed to coordination and not to the base model.

---

## 7. (c) What nobody has benchmarked yet

1. **Bio-inspired or stigmergic coordination against anything, at matched budget.** No paper compares pheromone/blackboard, quorum, or recruitment mechanisms with an orchestrator and a single agent under one token cap. SwarmBench tests LLMs as particles; SwarmWorld (unread) compares with isolated search only.
2. **Ten or more agents on a complex task.** Work at N ≥ 10 exists only on toy problems (AgentsNet, Silo-Bench, SwarmBench), where performance collapses toward zero at 50–100. Real-work benchmarks stop at 2–4 agents (CooperBench) or 3–9 (Scaling paper).
3. **Matched total tokens *and* matched wall-clock together.** MAC-Bench caps both but reports one seed; nobody reports the speed-up a collective buys per extra token, which is the actual economic case for parallel agents.
4. **Unreliable members as a designed variable.** No benchmark varies the per-agent error rate, drops agents mid-task, or mixes in faulty or adversarial members and then measures graceful degradation against a single agent with the same failure probability. Gaia2 injects environment noise, not member faults; AgentsNet names it as future work.
5. **Environment change during collective work.** Only Gaia2 has a real clock, and its multi-agent mode is a fixed hierarchy. No benchmark changes the task under a decentralised team and measures re-coordination time.
6. **Problems that genuinely exceed one context.** Almost all "distributed information" tasks fit in one prompt. Silo-Bench at large N is the only measured case where the single-agent oracle degrades, and it used mid-size open models. A benchmark built so that the total input is several times a frontier context window, with an objective answer, does not exist.
7. **Heterogeneous collectives at equal cost** (many cheap agents vs one expensive agent at the same dollars). Gaia2 has four heterogeneous pairings; the Scaling paper lists it as future work.
8. **Error correlation between agents.** Theory says synergy depends on how correlated members' errors are; no benchmark measures or manipulates it (same model, same prompt gives highly correlated errors, which undermines voting and redundancy).
9. **Variance as a first-class result.** Several headline benchmarks publish single runs. Nobody reports how reliability (worst-seed performance) differs between a single agent and a collective, which is where redundancy should pay.
10. **Frontier models on the collective benchmarks.** HiddenBench, Silo-Bench and SwarmBench have no results for current Claude models; the collaboration gap may be much smaller, or the tasks may already be saturated, as the split-maze was by gpt-5.

---

## 8. Source list

- MultiAgentBench: https://arxiv.org/abs/2503.01935 · https://github.com/MultiagentBench/MARBLE
- SwarmBench: https://arxiv.org/abs/2505.04364 · https://github.com/RUC-GSAI/YuLan-SwarmIntell
- AgentsNet: https://arxiv.org/abs/2507.08616 · https://github.com/floriangroetschla/AgentsNet
- HiddenBench: https://arxiv.org/abs/2505.11556 · https://github.com/Yassellee/HiddenBench_ICML
- Silo-Bench: https://arxiv.org/abs/2603.01045 · https://github.com/jwyjohn/acl26-silo-bench
- CooperBench: https://arxiv.org/abs/2601.13295 · https://github.com/cooperbench/CooperBench
- The Collaboration Gap: https://arxiv.org/abs/2511.02687
- AgentWorld: https://arxiv.org/abs/2609.31590 · https://github.com/openagents-org/agentworld
- Gaia2 / ARE: https://arxiv.org/abs/2509.17158 · https://github.com/facebookresearch/meta-agents-research-environments
- WideSearch: https://arxiv.org/abs/2508.07999 · https://github.com/ByteDance-Seed/WideSearch
- BrowseComp-Plus: https://arxiv.org/abs/2508.06600
- MAC-Bench: https://arxiv.org/abs/2611.01728
- alem: https://arxiv.org/abs/2606.08340 · https://github.com/alem-world/alem-env
- AgentWebBench: https://arxiv.org/abs/2604.10938 · https://github.com/cxcscmu/AgentWebBench
- Collab-Overcooked: https://arxiv.org/abs/2502.20073 · https://github.com/YusaeMeow/Collab-Overcooked
- REALM-Bench: https://arxiv.org/abs/2502.18836 · https://github.com/genglongling/REALM-Bench
- BattleAgentBench: https://arxiv.org/abs/2408.15971 · https://github.com/THUDM/BattleAgentBench
- TheAgentCompany: https://arxiv.org/abs/2412.14161 · https://github.com/TheAgentCompany/TheAgentCompany
- GAIA: https://arxiv.org/abs/2311.12983 · https://hal.cs.princeton.edu/gaia
- AgentBench: https://arxiv.org/abs/2308.03688 · https://github.com/THUDM/AgentBench
- MAST: https://arxiv.org/abs/2503.13657 · https://github.com/multi-agent-systems-failure-taxonomy/MAST
- Towards a Science of Scaling Agent Systems: https://arxiv.org/abs/2512.08296
- Towards a Science of Collective AI: https://arxiv.org/abs/2602.05289
- Tran & Kiela, equal thinking-token budgets: https://arxiv.org/abs/2604.02460
- Phase Transition for Budgeted Multi-Agent Synergy: https://arxiv.org/abs/2601.17311
- Anthropic multi-agent research system: https://www.anthropic.com/engineering/multi-agent-research-system
- Magentic Marketplace: https://arxiv.org/abs/2510.25779 · https://github.com/microsoft/multi-agent-marketplace
- MASLab: https://arxiv.org/abs/2505.16988
- Single-agent or Multi-agent Systems? Why Not Both?: https://arxiv.org/abs/2505.18286
