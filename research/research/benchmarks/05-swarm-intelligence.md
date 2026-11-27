# 05 — How swarm intelligence is benchmarked, and LLM agents in swarm settings

Literature study, 2026-11-12. Scope: (1) classical swarm robotics and collective-behaviour benchmarks and their metrics; (2) work from 2024 to 2026 that puts LLM agents into swarm settings; (3) where the biology-to-LLM analogy holds and where it breaks. It ends with a mechanism table, a reuse shortlist and a metrics list.

## How to read the evidence labels

- **[S]** opened at the primary source in this session (arXiv abstract or HTML page, publisher page, repository page). These pages were read through a fetch-and-summarise tool, not by me line by line in the PDF. Numbers are as that tool returned them; long pages were truncated at 100,000 characters, so appendices were often not seen. Re-check any number against the PDF before citing it in a paper.
- **[A]** abstract or search-result level only.
- **[L]** taken from this repository's own cards (`research/literature`, `research/nature`, `tasks/L2-RELATED-WORK-TO-READ.md`), which record their own verification state.
- **UNVERIFIED** stated from memory or from a secondary source; not checked at the source in this session.

Nothing here was reproduced. No code was run.

---

## 1. Classical swarm benchmarks and what counts as evidence

### 1.1 The three claimed properties, and the field's own admission that they are rarely measured

Brambilla, Ferrante, Birattari and Dorigo (2013), *Swarm robotics: a review from the swarm engineering perspective*, Swarm Intelligence 7:1–41 [S, technical-report PDF TR/IRIDIA/2012-014, text extracted locally; https://doi.org/10.1007/s11721-012-0075-2] define the three properties the field claims:

- **Robustness**: "the ability to cope with the loss of individuals", promoted by redundancy and the absence of a leader.
- **Scalability**: "the ability to perform well with different group sizes"; adding or removing individuals does not change performance drastically; promoted by local sensing and communication.
- **Flexibility**: "the ability to cope with a broad spectrum of different environments and tasks".

The same review states that comparing one system with another is "still very difficult" because of "the lack of well defined metrics and testbed applications", that metrics are usually tied to one solution, that foraging and construction are the only common testbeds, and that there is no single definition of a standard foraging scenario (it cites Winfield 2009 for the foraging taxonomy). This is a 2013 statement, but nothing found in this pass contradicts it: there is still no accepted, shared swarm benchmark suite with fixed scenarios. The field is organised around task families, not a leaderboard.

Its taxonomy of collective behaviours [S]: spatially organising (aggregation, pattern formation, chain formation, self-assembly, object clustering); navigation (collective exploration, coordinated motion, collective transport); collective decision-making (consensus achievement, task allocation); other (collective fault detection, group-size regulation, human–swarm interaction). Analysis methods: microscopic models, macroscopic models (rate equations and similar), real-robot analysis.

Dorigo, Theraulaz and Trianni (2021), *Swarm Robotics: Past, Present, and Future*, Proc. IEEE 109(7):1152–1165, doi:10.1109/JPROC.2021.3072740 [A; the HAL full text was blocked by bot protection]: only a few published experiments have shown collective behaviour with robot numbers comparable to biological swarms; open problems include the lack of dedicated platforms, the lack of reliable design methodologies, and how to use biological inspiration well.

Milner, Sooriyabandara and Hauert (2023), *Swarm Performance Indicators*, arXiv:2311.01944 [S, ar5iv] argue that robustness, fault tolerance, scalability and adaptability are "often assumed to be inherent to swarms, with little or no supporting tests", and give formulas that we can adopt directly:

| Indicator | Formula | Reading |
|---|---|---|
| Robustness R | %ΔP + %ΔN, with %ΔP = (P_F − P_0)/P_0 and %ΔN = m/N (m faulty of N) | R > 0: performance lost is smaller than the share of agents lost |
| Fault tolerance FT | (P_F − P_0)/P_0 − (P_S − P_0)/P_0, where P_S is a healthy swarm of N − m | FT > 0: a faulty agent left in place hurts less than removing it. FT < 0 means faulty agents are worse than absent ones |
| Scalability S | %ΔP / %ΔN for adding m agents to N | S > 0 scalable; S > 1 superlinear |
| Adaptability A | %ΔP / |%Δx| + 1 for a change in environment parameter x | A > 0: loss is no worse than proportional to the change |

Their demonstration (2D logistics simulation, N from 5 to 150) shows the usual shape: performance 9, 18, 29, 33, 45, 56, 65, 74, 69 at N = 5, 10, 20, 30, 40, 50, 60, 100, 150, so S turns negative near 150 [S]. Limits they state: end performance only (no recovery over time), one parameter at a time, one setup.

Two further results cut against the default belief that swarms are robust and that more communication is better:

- Bjerknes and Winfield (2013), *On fault tolerance and scalability of swarm robotic systems*, DARS 2010, doi:10.1007/978-3-642-32723-0_31 [A]: in an emergent beacon-taxis task, overall system reliability falls quickly with swarm size when failures are partial (a robot that still moves but senses wrongly anchors the swarm). Details of the reliability model were not read: UNVERIFIED beyond the abstract-level statement.
- Talamali, Saha, Marshall and Reina (2021), *When less is more: robot swarms adapt better to changes with constrained communication*, Science Robotics 6(56), doi:10.1126/scirobotics.abf1416 [A]: with voter-model behaviours, a **shorter** communication range gives **better** adaptation when a minority observes new information; globally connected groups fail to discard outdated beliefs. Model predictions confirmed in multi-agent simulation and with 50 Kilobots. This is the cleanest classical result on the cost of rich communication in a changing environment.
- Hamann (2013), *Towards swarm calculus*, Swarm Intelligence 7:145–172, arXiv:1210.6539 [A]: performance against density is not monotone; it rises (sometimes superlinearly) and then falls with interference, so every performance value below the peak is reached at two densities. A scaling curve therefore needs enough N values to find the peak, not two points.

### 1.2 Task families: what is varied, what is measured

| Task family | Typical setup | Mechanism under test | What is measured | Source and status |
|---|---|---|---|---|
| Foraging (central-place) | robots search an arena and return items to a nest; resources uniform, clustered or power-law | recruitment, pheromone trails with evaporation, site fidelity, interaction-rate regulation | items collected per unit time; per-robot efficiency against N (interference); effect of resource distribution | Krieger, Billeter and Keller (2000), Nature 406:992–995 [A]: groups foraged more efficiently than single robots; benefit decreased in larger groups (3, 6, 9, 12 robots), probably through interference; recruitment helped when food was clustered. Winfield (2009) foraging taxonomy, cited in Brambilla [S for the citation only]. CPFA with GA-tuned parameters as used by LLM-Foraging (below) |
| Best-of-n collective decision (site selection) | N robots choose among n options with quality ρ_i and sampling cost σ_i | positive feedback modulated by quality, majority rule or voter model, quorum, cross-inhibition | exit probability (accuracy), consensus time, the speed–accuracy trade-off, dependence on N and on neighbourhood size | Valentini, Ferrante and Dorigo (2017), Front. Robot. AI 4:9 [S, first half of the article]; Valentini, Ferrante, Hamann and Dorigo (2016), JAAMAS 30:553–580 [A] |
| Task allocation | several tasks with time-varying demand (stimulus) | fixed or reinforced response thresholds; activation thresholds on nest energy | match of workforce to demand, total work done, switching cost, robustness to removal of specialists | Bonabeau, Theraulaz and Deneubourg (1996) and Theraulaz et al. (1998) [L, `nat-response-threshold`]; "The call of duty" (up to 12 real robots, individual activation thresholds) [A, title and abstract via search; authors not confirmed: UNVERIFIED] |
| Aggregation | robots gather in one cluster without a map | probabilistic stop/leave rules depending on local density | largest cluster fraction, time to aggregate, cluster stability | Brambilla §3.1.1 [S for the existence of the family; individual papers UNVERIFIED] |
| Collective transport | object too heavy for one robot | force alignment, consensus on direction | success rate, transport speed, minimum N | Brambilla §3.2.3 [S]; SwarmBench "Transport" is the LLM version |
| Area coverage / exploration | cover or map an unknown area | dispersion, potential fields, pheromone-marked visited areas | coverage over time, redundancy (revisits), time to full coverage | Brambilla §3.2.1 [S] |
| Dynamic environments | the best option or the resource location changes mid-run | evaporation/forgetting, constrained communication, stubborn or exploring minority | adaptation time after the change, fraction of runs that switch | Talamali et al. (2021) [A] |

The best-of-n formalisation deserves detail because it is the benchmark with the most rigorous methodology [S]: a collective decision is a majority M ≥ (1 − δ)N for one option, with δ = 0 for consensus. Problems are classified by whether option quality and cost are symmetric or asymmetric (symmetry breaking; cheapest option; best option; synergic or antagonistic quality–cost). Valentini et al. note that nearly all studies are binary: the only experiment with n > 2 used n = 7 and the only theory with n > 2 used n = 3. Physical experiments mostly used 5 to 20 robots, with one 100-robot validation. In the 100-Kilobot study, the majority rule decided faster and less accurately than the voter model, and the trade-off depended mainly on one parameter, the neighbourhood size used for the majority rule [A].

### 1.3 What counts as evidence that a mechanism matters

Reading across these sources, the accepted standard in swarm robotics has four parts:

1. **A parameter sweep of the mechanism, not an on/off comparison**: evaporation rate, quorum threshold, neighbourhood size, communication range. The claim is a curve with an interior optimum or a trade-off (speed against accuracy), which is harder to obtain by accident than a single difference.
2. **An ablation or a null controller on the same robots**: no recruitment against recruitment (Krieger et al.); voter against majority rule (Valentini et al.); random walk as a floor.
3. **Agreement between a macroscopic model and the experiment** (rate equations, chemical-reaction-network or urn models, then simulation, then robots). The model predicts the curve before the robots produce it.
4. **A sweep in N and an environmental manipulation**: the mechanism should pay only where theory says it should. Dornhaus et al. (2006) [L, `nat-recruitment-benefit-conditions`] is the template from biology: recruitment helps when sources are few, poor and variable, and can hinder when food is abundant.

What swarm robotics does **not** usually do, and this matters for us: it almost never compares against a centralised controller or one more capable robot at the same cost. Decentralisation is assumed by the problem statement (no global communication, no map), so the question "would one better agent do this cheaper?" is outside the frame. The evidence is therefore evidence that a mechanism works *within* the constrained regime, not that the regime is the right choice. LLM swarm papers inherit this omission, and for LLMs the omitted baseline is the strongest competitor.

---

## 2. LLM agents in swarm settings, 2024–2026

Field legend for each entry: **Task · Agents and N · Measured · Single-agent or centralised baseline at matched compute? · Result · Mechanism ablated? · Code and licence.**

### 2.1 Benchmarks

**SwarmBench** — Ruan, Huang, Wen, Sun, *Benchmarking LLMs' Swarm intelligence*, arXiv:2505.04364v4 (2025-10-15) [S; plus L `lit-swarmbench-2025`]. https://arxiv.org/abs/2505.04364
- Task: five 2D-grid tasks (Pursuit, Synchronization, Foraging, Flocking, Transport); each agent sees a k×k patch and may send a short anonymous local broadcast (120 characters), with a memory of the last 5 rounds.
- Agents and N: 13 LLMs, zero-shot; README example uses 10 agents on a 10×10 grid, 100 rounds; sensitivity runs at N = 8, 12, 16 and N = 20, 30. The default N of the main table was not found in the text read: UNVERIFIED.
- Measured: task-specific scores, plus movement and group-dynamics descriptors; 5 runs per model–task pair.
- Baseline: no single-agent baseline (most tasks are multi-body by construction). A **centralised global-view variant** for one model (gemini-2.0-flash, 5 runs): Foraging 8.20 against 5.80, Synchronization 9.00 against 3.40, Flocking 9.90 against 9.40, Pursuit equal, Transport 0 in both. Rule-based baselines match LLMs on Pursuit and lose on Foraging and Synchronization. Human baselines are far above every model (Foraging 20.4, Synchronization 41.95, Transport 4.61). **No token or cost accounting.**
- Result: scores are low and task-dependent; only o4-mini and DeepSeek-R1 score above zero on Transport. Foraging gets worse with more agents, Transport better, Pursuit peaks at N = 12. Message noise (20% corruption, 0–4 step delay) changes the average score by −52% to +14% depending on the model.
- Ablated: view size and N are swept; communication is not removed (its importance is inferred from a random-forest attribution, which is not an ablation). No agent-failure test.
- Code: https://github.com/x66ccff/swarmbench (also mirrored at RUC-GSAI/YuLan-SwarmIntell), MIT [S].
- Caution: the centralised variant wins or ties everywhere it was tried. The benchmark measures whether LLMs can act under imposed locality, not whether locality pays.

**AgentsNet** — Grötschla, Müller, Tönshoff, Galkin, Perozzi, arXiv:2507.08616 [S]. https://arxiv.org/abs/2507.08616
- Task: five distributed-computing problems on a graph: (Δ+1)-colouring, minimal vertex cover, maximal matching, leader election, consensus. LOCAL model: synchronous rounds, messages to neighbours only.
- N: 4, 8, 16 nodes on small-world, scale-free and Delaunay graphs; scaling study from 20 to 100 agents.
- Measured: fraction of instances fully solved; score against API cost per repeat (plot only).
- Baseline: none single-agent or centralised. No faulty or Byzantine agents by design.
- Result: Gemini 2.5 Pro 0.80, Claude 3.7 Sonnet 0.70, down to Claude 3.5 Haiku 0.26; "for 100-agent networks, performance drops to near zero across the board".
- Ablated: no mechanism; topology and N are varied.
- Code: https://github.com/floriangroetschla/AgentsNet, MIT; graphs on Hugging Face `disco-eth/AgentsNet` [S].
- Value for us: exact ground truth, classical algorithms with known round complexity as a reference, and a real scaling axis.

**Silo-Bench** — Zhang et al., arXiv:2603.01045, ACL 2026 [A, search result and abstract only]. https://arxiv.org/abs/2603.01045
- Task: 30 algorithmic tasks with exact answers where the input is split across agents, in three levels of optimal communication complexity (aggregation, mesh, global shuffle).
- N: six agent scales (up to at least 50; Waggle uses it at 16 to 128), 3 protocols, 3 models, 1,620 experiments.
- Result as reported: agents communicate actively but fail to turn it into distributed computation; level-III tasks reach zero success beyond 50 agents.
- Baseline, ablation, licence: not read. UNVERIFIED. Code: github.com/jwyjohn/acl26-silo-bench (licence UNVERIFIED).
- Value for us: this is the closest existing analogue of "no agent can see the whole problem", which is the condition under which a swarm mechanism could pay.

**LoopBench** — arXiv:2512.13713 [A, catalogue abstract]: colouring odd cycles (C3, C5, C11) where deterministic non-communicating agents loop forever; tests symmetry breaking. Reasoning models devise escape strategies; standard models and heuristics struggle. Details UNVERIFIED.

**A second, unrelated "SwarmBench"** — Gao et al., *SwarmBench: Can Large Language Models Act as Agent Swarm Orchestrators?*, arXiv:2608.30661, EMNLP 2026 Findings [S, abstract]. It evaluates an LLM as a central orchestrator of sub-agents (accuracy, efficiency, cost, process quality). It is a benchmark of the conventional orchestrator, the opposite of swarm coordination. The name collision will cause citation errors; always cite by arXiv id.

**MoltBook framework** — Yee and Koh, arXiv:2603.03555 [S, abstract]: evaluation framework over an archive of 2.73M interactions among 90,704 agents; reports core–periphery structure and "severe coordination overhead" against a single-agent baseline (Cohen's d = −0.88). **Withdrawn by the authors at v3 ("Substantial Revision Required")**. Do not cite as a result.

### 2.2 Stigmergy, shared artefacts, decay

**Pressure fields** — Rodriguez, arXiv:2601.08129v3 (2026-01-29) [S; plus L]. https://arxiv.org/abs/2601.08129
- Task: meeting-room scheduling, three sizes; solved if all meetings are placed with no attendee overlap within 50 ticks.
- Agents and N: qwen2.5 0.5b/1.5b/3b through Ollama; 1, 2 and 4 agents; 270 trials per strategy, 1,350 total.
- Baseline: conversation (AutoGen-style), "hierarchical" (one agent, one region per tick, patch applied only if pressure drops), sequential and random (one agent). **Tokens are reported but not matched**: per trial 617K (pressure field), 161K (conversation), 38K (hierarchical), 46K (sequential, random). The winning arm used about 16 times the tokens of the "hierarchical" arm. No single agent with the full budget.
- Result: 48.5% solved against 12.6%, 1.5%, 0.4%, 0.4%.
- Ablated: yes, and the result is weak. Decay: 96.7% (29/30) with, 86.7% (26/30) without, Fisher p = 0.35, easy problems only. Inhibition: no detectable effect (96.7% both). Scaling: 83.3%, 93.3%, 83.3% at 1, 2, 4 agents, so **one agent on the pressure field does as well as four**. The abstract's sentence that disabling decay costs 10 points is the non-significant figure above. Secondary sites (a PyPI package page, blog posts) repeat a "30×" claim and a "2 to 32 agents" claim; the second was not found in v3: UNVERIFIED.
- Code: https://github.com/Govcraft/pressure-field-experiment, Rust, MIT OR Apache-2.0, with baselines, result JSON and R analysis [S].
- Reading: the measured gain comes from the pressure signal plus validation plus model escalation plus more tokens, not from multiplicity or decay.

**ScaleMAS, substrate-centric coordination** — Qi et al., *Scaling Multi-Agent Intelligence with Substrate-Centric Coordination*, arXiv:2610.16120v1 [S]. https://arxiv.org/abs/2610.16120
- Mechanism: an append-only shared store of linked messages; agents never address each other; `search` returns at most k messages (BM25 plus a citation weight that rises when later messages cite a message and decays over time); messages outlive their authors. This is stigmergy with reinforcement and decay, stated in information-retrieval terms.
- Task: BrowseComp-Plus (100 questions), FATE Lean 4 proving, SWE-bench Verified (100), and a new Contradiction Audit over documentation corpora.
- Agents and N: Qwen3.5-9B and Claude-5-Sonnet; 1 to 16 agents, up to 128 in a separate study.
- Baseline: parallel ReAct without communication, multi-agent debate, AOrchestra (central coordinator), DeLM (blackboard). Compute is measured as inference tokens per example and compared on scaling plots. The single-agent reference is the N = 1 point of the same system. Whether one agent was ever given the full token budget of the N = 16 arm was not established from the text read: UNVERIFIED.
- Result: Qwen 1 → 16 agents: BrowseComp-Plus 38.1 → 65.3%, FATE-M 24.0 → 56.0%, Contradiction Audit ×4 4.1 → 29.4%; SWE-bench Verified levels off after 8. At about 20M tokens per example on BrowseComp-Plus, 8 ScaleMAS agents 60.0% against 16 DeLM agents 26.0%.
- Ablated: yes. Removing the citation weight (BM25 only): BrowseComp-Plus 60.0 → 40.8%, Contradiction Audit 23.1 → 9.7% at 8 agents; random ranking is about the same as BM25 only. Shared against private against no substrate (4 agents, BrowseComp-Plus): 55.1, 46.8, 38.0. **Agent loss**: with one permanently failing agent ScaleMAS equals the healthy agents alone, DeLM drops below 1%; with random dropout p = 0.8, 8 agents still solve 22.0% of FATE-M, while the orchestrator loses more than half its score at p = 0.2. Decay rate and the read bound k were not ablated separately in the text read.
- Code: none found on the pages read. UNVERIFIED whether released.
- Reading: the most complete evidence found for a stigmergic mechanism with LLM agents: token accounting, a scaling curve to 128, an ablation of the reinforcement signal, and failure injection against an orchestrator. It is one preprint, and the saturated single-agent control is still missing.

**SwarmWorld** — Pal, Wang, Buehler, arXiv:2608.26081v1 [S, first 100k characters; plus L]. https://arxiv.org/abs/2608.26081
- Task: open-ended technology building in a simulated world; a deterministic simulator scores artefacts and controllers on held-out disturbances.
- Agents and N: 50, 100, 200 (800 ticks) and 100 (3,200 ticks); four seeds; model not identified in the text read.
- Baseline: N isolated one-agent worlds, reported as a best-of-N envelope, matched on scheduled decision opportunities, not on tokens. No token cost reported.
- Result at tick 3,200: portfolio resilience 0.247 (full culture), 0.237 (physical stigmergy only), 0.179 (isolated). **Best single artefact: isolated 0.349 against 0.238.** Validated inventions: 5.75 (full culture), 7.00 (stigmergy only), 2.75 (isolated).
- Ablated: yes, by channel: full culture, no communication, no explicit culture, independent search. About 95% of first reuse happens through physical observation in both shared conditions. Removing explicit messaging did not hurt and sometimes helped.
- Code: none found; paper licence CC BY-NC-ND 4.0.
- Reading: a shared world buys breadth and resilience of a portfolio, not the best single result, and the authors say so ("bounded"). Four seeds.

**Emergent Culture in Minimal LLM Systems** — Jones and Hauert, arXiv:2606.30668, ALife 2026 [S]. https://arxiv.org/abs/2606.30668
- Three stateless agents (Claude Sonnet 4.5, Kimi K2, Gemini 3 Flash) and a shared key-value store whose entries corrupt with age (sigmoid, midpoint 10 cycles, deleted near cycle 16). No task. 10 main runs of 100 cycles.
- No single-agent control and no no-decay control; the authors name the decay sweep as the immediate next experiment. Measures are text and recurrence statistics.
- Code: bitbucket.org/hauertlab/swarm_llm (licence UNVERIFIED).
- Reading: an existence demonstration. It says nothing about task performance.

**MusicSwarm** — Buehler, arXiv:2509.11973 [S, first 100k characters]. https://arxiv.org/abs/2509.11973
- Eight bar-wise agents deposit and sense pheromone-like cues in a shared field with decay and reinforcement; GPT-5 in the second experiment. Baselines: a centralised system with a global critic, and a single-shot prompt.
- Compute matching not stated; number of runs not stated (each objective appears to be one example); quality measured by computed descriptors and the system's own consensus score, with no human rating; **no ablation of pheromone, decay or consensus**. Code not found; licence CC BY-NC-ND.
- Reading: a design demonstration with n = 1 per condition. Not evidence.

**AgentRoom** — arXiv:2608.23740v1 [S, first 100k characters]. https://arxiv.org/abs/2608.23740
- Concurrent coding agents in a CRDT-merged shared workspace with advisory claims (`room_claim`, `room_release`, `room_broadcast`). Four Express/TypeScript backend tasks; Claude Sonnet 4.6, Haiku 4.5, GPT-5.4.
- N: mainly 2; scaling 1 to 4.
- Baseline: Solo, shared-only, shared plus prompt, parallel-merge, ChatDev-style pipeline. **Matched on wall-clock, not on tokens**: about 1,072 s of agent compute for two agents against 550 s solo. One cost-equivalent contrast: two Haiku agents 0.662 against one Sonnet 0.544 (p = 0.036, called suggestive by the authors).
- Result: judged quality 0.669 (AgentRoom ×2) against 0.544 (Solo); **quality peaks at N = 2 and falls below Solo at N = 4** (0.544, 0.669, 0.553, 0.489). Solo runs abandon far more often (pooled odds ratio 13.7). Does not replicate on Codex.
- Ablated: a component ordering (shared-only < prompt < full), with intervals that span zero for the tool step.
- Code: a "release bundle" is mentioned; repository URL not found. Quality is LLM-judged.
- Reading: claims-as-traces is a stigmergic lock. The honest finding is a peak at two agents.

**Blackboard systems** — Salemi et al., arXiv:2510.01285v2 [S, abstract]: a central agent posts requests and sub-agents over data-lake partitions volunteer; 13–57% relative gain in end-to-end success over unnamed baselines on KramaBench and modified DSBench and DA-Code. Volunteering is a response-threshold analogue, but a central agent still posts the requests. Han and Zhang, arXiv:2507.01701 [S, abstract]: blackboard MAS "competitive" with fewer tokens, no numbers in the abstract. Compute matching and code UNVERIFIED for both.

**Cognitive Cells** — Ferreira, arXiv:2608.28606 [S, abstract]: a fixed small frozen model (1.5B and 3B) as the unit; vary only population, topology, bandwidth and protocol. **Debate, a shared blackboard and chain revision do not beat a matched-cost voting baseline**; adding cells helps only when errors are not too correlated; a cell's ability to relay several facts predicts whether a population can solve tasks larger than one cell's memory. Code UNVERIFIED. This "fixed-cell" method is the swarm-robotics method transplanted correctly, and its result is negative for the blackboard.

### 2.3 Classical swarm algorithms re-implemented with LLM agents

**LLM2Swarm** — Strobel, Dorigo, Fritz, arXiv:2410.11387v3, NeurIPS 2024 workshop [S]. https://arxiv.org/abs/2410.11387
- ARGoS simulation of Pi-puck robots, GPT-4o on each robot ("direct integration") or LLM-synthesised controllers ("indirect"). Showcases: controller synthesis, anomaly detection in a crops-versus-weeds estimation task, human–swarm interaction. Swarm size not stated.
- **No quantitative evaluation, no baseline, no ablation**; the only number is 10–12 tokens per second for TinyLlama on a Raspberry Pi 5. The authors say systematic performance studies are still needed, and list prompt growth with inter-robot interaction, swarm partitioning and Byzantine robots as limits.
- Code: https://github.com/Pold87/LLM2Swarm, MIT; needs ARGoS 3.0.0-beta59 and Python 3.9.

**Jimenez-Romero, Yegenoglu, Blum**, *Multi-agent systems powered by LLMs: applications in swarm intelligence*, arXiv:2503.03800 (journal version with a 2026 correction, per PMC) [S]. https://arxiv.org/abs/2503.03800
- NetLogo ant foraging (10 stateless ants, 3 food patches, 1,000 steps, 5 seeds) and bird flocking (30 birds, 5 LLM-guided in the hybrid). GPT-4o.
- Result: LLM ants collect about as much as rule-based ants (about 85 units; hybrid about 95), "as long as their instructions were meticulously designed". Prompts had to be iterated, for example from numeric pheromone values to directional cues. No cost figures; evaporation not ablated.
- Code: https://github.com/crjimene/swarm_gpt (licence UNVERIFIED).

**LLM-Powered Swarms: A New Frontier or a Conceptual Stretch?** — Rahman, Schranz, Hayat, arXiv:2506.14496v3 [S, abstract]. Boids and ACO implemented with OpenAI's Swarm framework against classical versions: the LLM Boids take roughly **300 times** the computation time. Conclusion: swarm-like dynamics can be emulated, with heavy overhead.

**LLM-Foraging** — arXiv:2605.01461v1 [S]. https://arxiv.org/abs/2605.01461
- Gazebo/ROS 2, TurtleBot3; 4, 6, 8, 10 robots; 36 configurations × 10 trials. gpt-5-mini is queried only at three decision points of the CPFA state machine.
- Baseline: GA-tuned CPFA trained on one configuration. No centralised LLM baseline.
- Result: more resources in 33 of 36 configurations, mean +70% (clustered +142%, power-law +49%, random +19%). 53,189 calls, mean latency 6.6 s per call.
- Ablated: none. The baseline is deliberately out of distribution (tuned for one configuration), so the result is about transfer without retraining, not about swarm mechanisms. Code linked by a short URL; licence UNVERIFIED.

**SwarmSys** — arXiv:2510.10047 [L, `lit-swarmsys`]: explorer/worker/validator roles with pheromone-like reinforcement; 8 GPT-4o agents score 65.8% on exams against 68.7% for a single GPT-5 at about one fifth of the cost; plateau near 14 agents; no code.

**Waggle** — *Learning One Anonymous Local Law for Self-Organizing LLM Swarms*, arXiv:2609.34136v1 [S, first 100k characters]. https://arxiv.org/abs/2609.34136
- One shared policy over bounded local views (Qwen3-4B with LoRA, distilled from GPT-4o teacher records) chooses a task action, an optional message and a local commitment update. Evaluated on SwarmBench, Silo-Bench and frozen transfer to AgentsNet.
- N: 16, 32, 64, with 128 as a frozen extension.
- Baseline: NoComm, native messaging, a hand-coded shared rule, and GPTSwarm, G-Designer, AgentNet, SwarmSys and others. **No single-agent or orchestrator baseline in the text read**; token matching is deferred to an appendix that was not read.
- Result: Silo-Bench success 86.3 / 79.0 / 58.2% at N = 16 / 32 / 64; at N = 64 the nearest baseline has 43.7%, NoComm 11.7%. At N = 128 it keeps 82.9% of its N = 64 success.
- Ablated: yes (training terms; conflict handling; commitment reversibility; "removing decay delays re-synthesis"). Delays, message loss and churn are in an appendix not read.
- Code: not found.
- Reading: the first paper found that trains the swarm-robotics object itself (one anonymous local rule) and reports the swarm-robotics curve (success against N). Success still falls with N.

**AMRO-S (ACO routing)** — arXiv:2603.12933 [S]: pheromone matrices over routing transitions with multiplicative evaporation; it is a router over models, not a swarm of task agents. Pheromone and evaporation are not ablated (the ablation is random routing and fine-tuning). No code; CC BY-NC-ND.

**SwarmAgentic** — Zhang et al., arXiv:2506.15672, EMNLP 2025 [A]. PSO over candidate agent-system designs (+261.8% relative over ADAS on TravelPlanner). The "swarm" is the optimiser's population of designs, not the agents solving the task. **GPTSwarm** — Zhuge et al., arXiv:2402.16823, ICML 2024 [S, abstract; L `lit-gptswarm`]: agents as optimisable computational graphs; centrally optimised edges and prompts; no local rules. Neither tests a swarm mechanism; both are in our list only because of their names.

### 2.4 Consensus, self-organisation and large populations

**De Marzo, Castellano, Garcia**, *AI agents can coordinate beyond human scale*, arXiv:2409.02822, Science Advances 12, eaea6091 (2026) [S, abstract]. Opinion dynamics of LLM populations on an arbitrary binary choice: a "majority force" that weakens with group size, a critical group size beyond which consensus is not reached, growing exponentially with model capability. Specific sizes (search-result summary: about 30 for weaker models, approaching 1,000 for the strongest) are UNVERIFIED. This is a symmetry-breaking best-of-2 in the Valentini classification, with no quality difference between options, so it measures conformity, not accuracy.

**Drop the Hierarchy and Roles** — arXiv:2603.28990v1 [S]. 25,000 runs, 8 models, 4 to 256 agents, protocols from Coordinator to Shared memory. A Sequential protocol (fixed order, self-chosen role, voluntary abstention) beats the Coordinator by 14% at N = 16 on Claude (0.875 against 0.767), and beats fully Shared by 44% in the pilot. Quality is flat from 64 to 256 agents (0.958–0.967) while cost rises 4.6×; about 45% of agents are idle at N = 256. **No single-agent baseline at matched tokens; LLM-judged synthetic tasks; the judge changed between series.** Four bio-inspired protocols (Morphogenetic, Clonal, Stigmergic, Ripple) were run but their results are deferred to a companion paper, which was not found. Code promised on acceptance. Voluntary abstention is the only response-threshold-like behaviour found in this pass, and it is emergent, not designed or swept.

**Emergent Coordination in Multi-Agent Language Models** — Riedl, arXiv:2510.05174, ICLR 2026 [S, abstract]. An information-decomposition test for whether a group shows higher-order synergy or is a collection of individuals, on a guessing game without direct communication. Personas plus an instruction to consider other agents produce differentiation and complementarity. Useful as a measurement tool for "is this a collective at all", not as a performance result.

**Project Sid** — Altera, arXiv:2411.00114 [S]. Minecraft, 10 to 1,000+ agents (runs above 1,000 were unstable); 30-agent villages for specialisation, 29 agents for collective rules, 500 for cultural transmission. Measures: role entropy (values only in figures), tax compliance (about 20% before an amendment, about 9% after), meme and convert counts. Ablation of the social module removes specialisation. No task-performance baseline against a single agent beyond item counts; compute cost not reported; code release not stated.

**AgentVerse** — Chen et al., arXiv:2308.10848 [S, abstract only]: dynamic group composition; reports emergent social behaviours. From memory, these were volunteer, conformity and destructive behaviours observed with a handful of agents in Minecraft: UNVERIFIED.

**The Mechanics of a Swarm** — Lütje, arXiv:2609.12748v2 [S, abstract]. Reconstruction of an unintended episode in which agents from a timed evaluation coordinated through a public third-party wiki (14,591 revisions; about 876 episodes estimated). Coordination formats converged within a day, and across 510 cohorts there was **no robust positive link between measured coordination and documented progress**. The author withdrew an earlier reading of marker adoption as transmission. This is the only field observation of spontaneous stigmergy among LLM agents found, and its performance finding is null. Details beyond the abstract UNVERIFIED.

**At Equal Inference Cost, Multi-Agent Structure Does Not Beat a Single Frozen Agent** — arXiv:2609.04217 [S, abstract]: on ALFWorld and WebShop with a frozen 7B model, a Planner–Executor–Critic team is not significantly better than one evolved executor (0.769 against 0.754, p = 0.80), and all the gain comes from the executor. **Towards a Science of Scaling Agent Systems** — Kim et al., arXiv:2512.08296v3 [S, abstract; L]: 260 configurations, performance changes from +80.8% on decomposable financial reasoning to −70.0% on sequential planning; coordination has diminishing returns once the single agent is strong. **Towards a Science of Collective AI** — Fan et al., arXiv:2602.05289 [S]: position paper; defines collaboration gain Γ = Φ_M / Φ_S where Φ_S is the best result of a single agent given the **same total resource budget** as the MAS ("saturated baseline"), with the budget measured in tokens, sampling steps or tool calls. No new experiments.

### 2.5 Mechanisms with no LLM study found

Searched and not found as LLM experiments with the mechanism swept or ablated: **quorum sensing as a decision threshold in a best-of-n task with unequal option quality**; **cross-inhibition / stop signals**; **response thresholds as a designed, heterogeneous parameter**; **idle reserve**; **immune-style danger signals in a performance (not security) setting**. The library's `mechanisms.csv` lists "quorum" papers that are Byzantine consensus or early stopping of sampling, and "response-threshold" papers that are escalation routers; these share a word with the biological mechanism, not its structure. Absence here means "not found in a few targeted searches plus the library catalogue", not "does not exist".

### 2.6 Summary of the LLM evidence

| Paper | N range | Single agent or central control at matched tokens? | Mechanism ablated? | Robustness to agent loss? | Code |
|---|---|---|---|---|---|
| SwarmBench 2505.04364 | 8–30 | central global-view variant for one model; no cost | no (N and view swept) | no (message noise only) | MIT |
| AgentsNet 2507.08616 | 4–100 | no | no | no | MIT |
| Silo-Bench 2603.01045 | up to 50+ | UNVERIFIED | UNVERIFIED | UNVERIFIED | public, licence UNVERIFIED |
| Pressure fields 2601.08129 | 1–4 | no; winner used about 16× the tokens of the one-agent arm | yes; decay p = 0.35, inhibition null | no | MIT OR Apache-2.0 |
| ScaleMAS 2610.16120 | 1–128 | tokens on the x-axis; orchestrator baseline; saturated single agent UNVERIFIED | yes (citation weight; shared/private/none) | yes | not found |
| SwarmWorld 2608.26081 | 50–200 | isolated best-of-N, matched on decisions | yes (channels) | no (topological knock-outs only) | not found |
| Emergent Culture 2606.30668 | 3 | no | no | no | Bitbucket |
| MusicSwarm 2509.11973 | 8 | central critic; matching not stated; n = 1 | no | no | not found |
| AgentRoom 2608.23740 | 1–4 | solo, matched on wall-clock only | partial | no | bundle, URL not found |
| Cognitive Cells 2608.28606 | not stated | matched-cost voting null | yes (protocols) | not stated | not found |
| Waggle 2609.34136 | 16–128 | no (in the part read) | yes | churn in an unread appendix | not found |
| LLM-Foraging 2605.01461 | 4–10 | no | no | no | public, licence UNVERIFIED |
| LLM2Swarm 2410.11387 | not stated | no | no | no | MIT |
| Drop the Hierarchy 2603.28990 | 4–256 | coordinator yes; single agent no | no | yes, on topology models | promised |
| Project Sid 2411.00114 | 10–1,000 | no | social module | no | not stated |

Three patterns:

1. **The matched single-agent control is still the exception.** Only Cognitive Cells (against voting), 2609.04217 and the Kim et al. study compare at equal cost, and none of those found a gain for interaction protocols over the simpler alternative outside decomposable tasks. This agrees with our own audit (16 of 200 full-text cards) and with our runs.
2. **Where a biological mechanism was ablated, the result is mostly weak or mixed**: decay not significant (pressure fields), inhibition null (pressure fields), explicit communication not needed (SwarmWorld), blackboard no better than voting (Cognitive Cells). The exception is the citation-weight ablation in ScaleMAS, a reinforcement signal on a shared store, in tasks where the evidence exceeds one context.
3. **Scaling curves, when reported, are flat or falling**: AgentsNet falls to near zero at 100; SwarmBench Foraging falls with N; AgentRoom peaks at 2; Drop the Hierarchy is flat from 64 to 256 with 45% idle; Waggle falls from 86% to 58% between 16 and 64; SwarmSys plateaus near 14. Rising curves appear in ScaleMAS and LLM-Foraging, both in tasks with a large search space and little interference.

---

## 3. Biology-to-LLM mapping

### 3.1 Why swarm mechanisms pay in biology

The mechanisms are answers to a specific set of constraints. From the classical literature above and our `research/nature` cards:

| Condition in biology | Why it makes the mechanism necessary |
|---|---|
| No individual has a global view (local sensing, no map) | information must be pooled through the environment or through encounters; stigmergy and recruitment are the only channel |
| Individuals are cheap and numerous | redundancy is affordable; losing a share of individuals is expected, so no role can be unique |
| Individuals are unreliable and noisy | a decision must aggregate many independent noisy samples; quorum sets the speed–accuracy point [L, `nat-speed-accuracy-quorum`] |
| The environment changes | stored information must expire; evaporation is forgetting; cross-inhibition and a constrained communication range prevent lock-in (Talamali et al.) |
| Resources are few, patchy and variable | recruitment pays; with abundant, evenly spread resources it does not (Dornhaus et al.) [L] |
| Demand for tasks fluctuates | heterogeneous thresholds allocate labour in proportion to demand without a coordinator; an idle reserve absorbs peaks at the price of short-term productivity (Charbonneau et al.) [L, `nat-inactive-reserve`] |
| No one can be trusted with command (a leader is a single point of failure) | decentralised control |

### 3.2 Where the analogy breaks for LLM agents

| Property | Biological agent | LLM agent | Consequence |
|---|---|---|---|
| Cost of one agent-step | negligible | large: 6.6 s mean latency per call in LLM-Foraging; about 300× the compute of classical Boids (2506.14496) | redundancy is not free. "Idle reserve" costs nothing only if idle agents make no calls; "many cheap explorers" is expensive |
| Capability of one agent | trivial rules | can plan, write a program, or hold the whole problem if it fits in context | the single agent is a serious baseline; in biology it is not. SwarmBench's centralised variant ties or wins everywhere tested |
| Global view | impossible | available whenever the task fits one context window | the main precondition for stigmergy is absent in most benchmark tasks, including all of our toy tasks |
| Communication | local, low bandwidth, costly | global, rich, cheap relative to thinking | the constraint that makes indirect coordination necessary has to be imposed artificially (SwarmBench's 120-character local broadcast). Talamali et al. suggest that rich global communication may itself be the harmful default in changing environments, which is testable |
| Independence of errors | genetically and experientially varied individuals sampling different places | copies of one model with correlated errors | quorum and voting assume independent samples. Cognitive Cells: more cells help only when errors are not too correlated. De Marzo et al.: a majority force, meaning conformity. See also our cards on correlated errors |
| Population size | 10³ to 10⁶ | 2 to 16 typically; 100+ only in simulations | density-dependent effects (encounter-rate quorum, interference) have no natural scale; N is a cost multiplier |
| Interference | physical crowding | duplicated work, merge conflicts, context pollution, rate limits | this part of the analogy holds: AgentRoom falls below solo at N = 4; SwarmBench Foraging degrades with N |
| Memory of the medium | pheromone evaporates physically | a store persists forever unless code deletes it | decay must be designed, and its rate is a free parameter that has to be matched to the rate of change of the task |
| Selection history | mechanisms tuned by evolution to an ecology | mechanisms chosen by a designer for one benchmark | a parameter sweep replaces evolution; a single setting proves little |

### 3.3 LLM task settings that reproduce the biological conditions

The mechanisms should be expected to pay only where the conditions of 3.1 are present for real, not imposed as a handicap.

| Biological condition | LLM setting that reproduces it without artificial handicaps | Existing example |
|---|---|---|
| No global view | corpus, codebase or search space much larger than one context window, so that reading it all sequentially costs more than the budget | BrowseComp-Plus and Contradiction Audit in ScaleMAS; Silo-Bench; data lakes in the blackboard paper |
| Time pressure that makes serial work infeasible | a wall-clock deadline where one agent cannot finish however good it is (parallelism as the resource, not tokens) | AgentRoom matches on wall-clock; none found that reports both token and wall-clock budgets |
| Unreliable individuals | noisy or flaky tools, rate-limited or failing workers, small cheap models as the unit | ScaleMAS dropout test; Cognitive Cells' fixed small cell; MeshHeal (gray failures, abstract only, not read) |
| Dynamic environment | a long-running task where the ground truth changes: a repository under active commits, a document set that is edited, a web that updates | none found with a controlled change and an adaptation-time measure. The wiki incident (2609.12748) is the nearest natural case |
| Patchy, variable resources | search where useful evidence is clustered and rare (deep research, vulnerability hunting, long proofs) | BrowseComp-Plus; FATE |
| Adversarial inputs | poisoned documents or prompt injection in part of the corpus, where an infected agent can spread the damage through a shared store | the defence literature in `library/catalog-defense.csv`; no performance benchmark with swarm mechanisms found |
| No trusted centre | orchestrator failure or context overflow of the orchestrator at scale | ScaleMAS: orchestrator loses over half its score at dropout 0.2 |

A blunt summary: the conditions hold for **large, partially observable, changing or hostile workloads under a wall-clock constraint**. They do not hold for a self-contained reasoning question, which is what most benchmarks, and all our runs so far, used. On those, the prediction from the biology itself is that the mechanisms should not pay, and that is what we measured.

---

## 4. Deliverables

### (a) Mechanism → condition → test → control

Every row assumes three arms at equal total tokens and equal wall-clock limit, both reported: **one strong agent with the whole budget** (Fan et al.'s saturated baseline), **an orchestrator with workers**, and **the swarm arm with the mechanism on**. The "control that isolates it" column is the fourth arm: the same swarm with only that mechanism removed or swept.

| Mechanism | Task condition under which it should pay | Benchmark or task design to test it with LLM agents | Control that isolates it |
|---|---|---|---|
| Stigmergy (traces on a shared artefact) | the artefact exceeds one context; work is decomposable but dependencies are discovered only while working; no agent can afford to read all messages | contradiction or defect audit over a corpus several times the context window; multi-file repair. Agents read a bounded slice plus the traces left there | same agents, same store, traces invisible to others (private substrate, as in ScaleMAS); plus the same traces delivered by direct messages, to separate "indirect" from "any shared information" |
| Pheromone decay / evaporation | the environment changes during the run, so old traces become wrong | the same audit with scheduled edits to the corpus mid-run (a defect fixed, a new one introduced, the best source moved). Measure stale-trace follow rate and adaptation time | decay-rate sweep including zero (no decay) and infinite (no memory), on a static and on a changing corpus. The claim is an interaction: decay helps only when the corpus changes. Needs far more than 30 trials per cell |
| Quorum sensing | options must be evaluated by noisy, costly samples; a wrong commitment is expensive; time matters | best-of-n with unequal quality: n candidate patches, hypotheses or sources, each evaluation noisy (a flaky test, a partial read). Commit when q independent agents endorse one option | sweep q from 1 to N and plot accuracy against tokens to commit (the speed–accuracy curve); compare with a fixed-sample majority vote at the same number of evaluations; add a correlated-error condition (same model, same prompt) against a decorrelated one |
| Recruitment (positive feedback toward good finds) | resources are rare, clustered and variable in value | search with clustered evidence: findings in one region of the corpus make neighbouring regions more valuable. Agents advertise finds in proportion to assessed quality | no advertising (independent search); uniform advertising (not quality-weighted); and the Dornhaus control: the same task with evenly spread evidence, where recruitment should not help |
| Response thresholds / division of labour | several task types with fluctuating demand, heterogeneous agents (models of different cost or tool access) | a queue with mixed task types whose arrival rates shift; each agent takes a task when its stimulus (age × priority) exceeds its own threshold | central assignment by a router with the same information; identical thresholds; random thresholds. Measure backlog, switching cost and tokens per completed task |
| Idle reserve | bursty load, or agent loss | the queue above with bursts and with scheduled agent failures; reserve agents make no calls until the stimulus crosses a high threshold | everyone always active at the same total budget; no reserve. Measure time to absorb a burst and cost during quiet periods. The reserve is only meaningful if idle costs zero tokens |
| Cross-inhibition / stop signals | two or more near-equal options produce deadlock or split commitment; or premature lock-in on the first find | the best-of-n task with close qualities, and a variant where the best option appears late | recruitment without stop signals; stop signals at varied strength. Measure deadlock rate, split rate and rate of switching to a late better option |
| Constrained communication range | new information is observed by a minority while the majority holds an outdated belief | the changing-corpus task with either full broadcast or neighbour-only messaging | topology sweep at equal message budget, replicating Talamali et al. Prediction to pre-register: full broadcast adapts more slowly |
| Immune-style danger signals | part of the input is adversarial or corrupt, and damage can spread through the shared store | the audit task with poisoned documents or injected instructions; agents raise a danger signal on evidence of damage (a failed check, a contradiction), not on mere novelty; flagged traces are quarantined | no signal; signal on novelty (a self/non-self analogue) against signal on damage; measure contamination spread, false quarantine rate and task accuracy under attack and without attack (the cost of the defence) |

Preconditions for all rows: a task where the single strong agent is **not** near ceiling at the given budget, verified in a pilot before anything else; exact or programmatically checked ground truth, not an LLM judge; and trial counts set by a power calculation. Pressure fields' 30 trials per cell could not detect a 10-point difference.

### (b) Reuse shortlist (at most four) and what we must build

Ranked by fit to the lab's question, which is mechanisms against one strong agent and an orchestrator at matched cost.

| Rank | Environment | Why | Limits | Licence |
|---|---|---|---|---|
| 1 | **Silo-Bench** (arXiv:2603.01045; github.com/jwyjohn/acl26-silo-bench) | input split across agents, exact answers, 30 tasks graded by communication complexity, scales past 50 agents; already used by Waggle as a swarm testbed | read only at abstract level here; licence and harness quality UNVERIFIED; static tasks; an agent given all shards is a trivial upper bound, so a context-size constraint has to be made real (shards larger than one window) | UNVERIFIED |
| 2 | **AgentsNet** (arXiv:2507.08616; github.com/floriangroetschla/AgentsNet) | exact ground truth, known optimal distributed algorithms as a reference, consensus and leader election map onto quorum and symmetry breaking, 4 to 100 agents, small code base | no failures, no dynamics, no cost ledger; a centralised solver trivially solves every task, so it measures coordination ability under imposed locality, not advantage | MIT |
| 3 | **SwarmBench** (arXiv:2505.04364; github.com/x66ccff/swarmbench) | the only LLM environment with the classical tasks (foraging, transport, flocking), a centralised variant, rule-based and human baselines, sweeps in N and view size; Foraging can host pheromone, evaporation and recruitment directly | spatial toy; scores near the floor for most models; one LLM call per agent per round is expensive; five runs per cell in the paper; locality is imposed, and the centralised variant already wins | MIT |
| 4 | **Pressure-field experiment** (github.com/Govcraft/pressure-field-experiment) | a complete harness with decay and inhibition switches, baselines, token logging and analysis scripts; runs on local small models, so repeating the decay ablation with adequate power costs only compute time | one task (room scheduling) where the artefact fits in context; Rust; no saturated single-agent arm; a static problem, so decay has nothing to adapt to | MIT OR Apache-2.0 |

Not on the list, with reasons: ScaleMAS's Contradiction Audit is the best-matching task design but no code or data was found; SwarmWorld, MusicSwarm and Waggle have no code found; LLM2Swarm needs ARGoS and has no metrics; NetLogo `swarm_gpt` has an unverified licence and one call per ant per step.

What we would have to build ourselves:

1. **A corpus-scale task with a controlled change schedule**: a contradiction or defect audit over a corpus several times the context window, with injected ground truth and scripted mid-run edits. Nothing found offers a dynamic environment with a known change time.
2. **A best-of-n task with unequal option quality and noisy evaluation**, with the number of options above two. The literature (robotic and LLM) is almost entirely binary, and the LLM consensus work uses options of equal quality.
3. **A token and wall-clock ledger common to all arms**, and the saturated single-agent arm. No reusable harness provides it; AgentRoom matches wall-clock only, ScaleMAS tokens only.
4. **Fault injection**: agent removal, and partial failure (an agent that keeps answering wrongly), which Bjerknes and Winfield identify as the damaging case and which only MeshHeal's abstract addresses for LLMs.
5. **Mechanism switches as parameters**, so that each row of table (a) is a sweep, not a different code path.
6. **An adversarial-input variant** for the danger-signal row.

### (c) Metrics swarm robotics reports and LLM papers usually omit

| Metric | Definition to use | Why it matters for us |
|---|---|---|
| Scaling curve in N | performance at five or more values of N at fixed task, with total tokens and wall-clock reported at each N; report Milner's S = %ΔP / %ΔN between adjacent points and the N at which performance peaks | two points cannot show the interference peak (Hamann). Most LLM curves found are flat or falling |
| Per-agent efficiency | performance divided by N, and performance per million tokens | separates "more agents" from "more budget"; equivalent to Γ when the single agent gets the same budget |
| Collaboration gain Γ | Φ_M / Φ_S with Φ_S the best single-agent result at the same total budget (Fan et al.) | the headline number; Γ ≤ 1 means resource accumulation only |
| Robustness to agent loss | Milner's R = %ΔP + m/N after removing m of N agents mid-run; report for the orchestrator arm with the orchestrator itself among the removed | the property swarms are supposed to have. Only ScaleMAS and one section of Drop the Hierarchy test it |
| Fault tolerance to partial failure | Milner's FT: performance with m faulty-but-active agents minus performance with those m removed | a wrong-but-confident LLM agent is the realistic failure; FT < 0 is the expected sign |
| Adaptation time after a change | steps or tokens from a scripted environment change until performance returns to a set fraction (say 90%) of its pre-change level; plus the fraction of runs that never recover | the only metric that can show a benefit of decay, cross-inhibition or constrained communication. None of the LLM papers read reports it |
| Speed–accuracy curve | accuracy against tokens or time to commitment as the quorum or stopping threshold is swept | a single operating point hides the trade-off; this is the standard figure of best-of-n work |
| Parameter sensitivity of the mechanism | performance against the mechanism's parameter (decay rate, quorum, threshold spread, range), including the "off" values | the accepted form of evidence that a mechanism matters; on/off ablations with n = 30 are not |
| Redundancy and coverage | share of work units done more than once; share of the artefact never visited | the LLM form of interference; explains falling curves |
| Idle fraction and cost of idleness | share of agents making no calls per interval, and tokens spent by agents that contributed nothing | Drop the Hierarchy reports 45% idle at N = 256; whether idleness is free decides whether a reserve can pay |
| Variance across seeds | full distribution, not the mean; AgentRoom's reduction of solo abandonment is a variance result | swarm benefits in SwarmWorld and AgentRoom are about spread and resilience, not the best case |
| Environmental condition as a factor | each result reported with and without the condition that is supposed to make the mechanism pay (patchy against even resources; changing against static; noisy against clean) | Dornhaus-style interaction is the strongest evidence available, and it also tells us where the mechanism should be switched off |

---

## 5. Cautions

- Verification depth is uneven. Abstract-level entries [A] should not be cited for numbers. HTML pages were truncated; ScaleMAS, Waggle, SwarmWorld, AgentRoom and MusicSwarm were each read only in their first 100,000 characters.
- Several 2026 items are single-author or single-group preprints without code (ScaleMAS, Waggle, Cognitive Cells, Drop the Hierarchy). The strongest positive result in this document (ScaleMAS) is unreplicated and its code was not found.
- One catalogued paper was withdrawn (2603.03555). Check withdrawal status before citing any 2026 preprint.
- Name collisions: two different "SwarmBench" papers (2505.04364 and 2608.30661); "GPTSwarm" and "SwarmAgentic" are not swarm systems in the sense used here.
- The library's mechanism labels are keyword-based. "Quorum", "recruitment" and "response-threshold" rows mostly denote consensus protocols, routing and escalation, not the biological mechanisms.
- The classical section relies on reviews and abstracts. The individual robot studies under aggregation, coverage and transport were not opened. Krieger et al. (2000), Bjerknes and Winfield (2013), Talamali et al. (2021), Hamann (2013), Valentini et al. (2016) and Dorigo et al. (2021) were read at abstract level only.
- No search was made of ACL Anthology, OpenReview or Google Scholar directly; coverage of non-arXiv venues is thin. The note in `tasks/L2-RELATED-WORK-TO-READ.md` about a paper titled "Bio-Inspired Agentic Swarms" remains open: it was not found here either.

## 6. Sources opened in this session

Classical: Brambilla et al. 2013 (TR PDF, https://doi.org/10.1007/s11721-012-0075-2) · Valentini, Ferrante, Dorigo 2017 (https://www.frontiersin.org/articles/10.3389/frobt.2017.00009/full) · Milner et al. 2023 (https://arxiv.org/abs/2311.01944) · search-level: Dorigo et al. 2021 (doi:10.1109/JPROC.2021.3072740), Talamali et al. 2021 (doi:10.1126/scirobotics.abf1416), Bjerknes and Winfield 2013 (doi:10.1007/978-3-642-32723-0_31), Hamann 2013 (https://arxiv.org/abs/1210.6539), Valentini et al. 2016 (doi:10.1007/s10458-015-9323-3), Krieger et al. 2000 (https://www.nature.com/articles/35023164).

LLM: 2505.04364 · 2507.08616 · 2603.01045 · 2512.13713 · 2608.30661 · 2603.03555 · 2601.08129 · 2610.16120 · 2608.26081 · 2606.30668 · 2509.11973 · 2608.23740 · 2510.01285 · 2507.01701 · 2608.28606 · 2410.11387 · 2503.03800 · 2506.14496 · 2605.01461 · 2609.34136 · 2603.12933 · 2506.15672 · 2402.16823 · 2409.02822 · 2603.28990 · 2510.05174 · 2411.00114 · 2308.10848 · 2609.12748 · 2609.04217 · 2512.08296 · 2602.05289 (all at https://arxiv.org/abs/<id>).

Repositories: https://github.com/x66ccff/swarmbench (MIT) · https://github.com/RUC-GSAI/YuLan-SwarmIntell (MIT) · https://github.com/floriangroetschla/AgentsNet (MIT) · https://github.com/Govcraft/pressure-field-experiment (MIT OR Apache-2.0) · https://github.com/Pold87/LLM2Swarm (MIT) · https://github.com/crjimene/swarm_gpt (licence not checked) · https://github.com/jwyjohn/acl26-silo-bench (not opened).

Local: `research/literature/lit-swarmbench-2025.md`, `lit-swarmsys.md`, `lit-gptswarm.md`; `research/nature/nat-*.md` (recruitment conditions, inactive reserve, stop signal, speed–accuracy quorum, response threshold, stigmergy, evaporation); `tasks/L2-RELATED-WORK-TO-READ.md`; `library/by-program/mechanisms.csv`; `library/catalog.csv`.
