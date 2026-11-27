# 06 — Existing runtimes as substrates, and the instrumentation a swarm runtime needs

Date: 2026-11-11. Status: desk study, nothing run, no paid call.

**How to read.** Three kinds of statement are kept apart: *reported* (a source says it), *inferred* (my reading across sources) and *proposed* (what the lab could do). Evidence tags in the table: **[D]** official documentation fetched today; **[P]** paper page fetched today (abstract or arXiv HTML); **[C]** the lab's own code cards in `research/oss/` (static reading at pinned commits on 2026-11-07, nothing executed); **[L]** the lab's literature cards or `tasks/L2-RELATED-WORK-TO-READ.md`. **NV** = not verified. Pages were read through a fetch-and-summarise tool, so quoted names are reliable and numbers should be rechecked against the source before being cited in a paper.

Vocabulary follows `papers/P1-bio-inspired-agentic-swarms/VOCABULARY.md`: field, trace, regime, orchestrator, deep agent, matched cost, operator.

---

## Half A — What existing runtimes give many agents

### A.1 One table

| System | Topology assumed | Shared state | Channel between agents | How work is allocated | Skills / tools | Budget controls | Tracing | Largest scale in own docs/papers | What a swarm would add |
|---|---|---|---|---|---|---|---|---|---|
| **LangGraph** | Graph in code; supervisor and handoff "swarm" as add-on libraries [C] | Thread state saved by checkpointers; `Store` for cross-thread data [D] | State passed along edges; full history on handoff in the swarm add-on [C] | Edges in code, or an LLM supervisor / `Command(goto)` [C] | Tools per node/agent | Core `recursion_limit` NV; none in the add-ons [C] | Checkpoint history; replay and fork (`update_state`) [D]; LangSmith | NV | Traces with author, weight, decay; allocation from state without a router; cost admission |
| **AutoGen / AG2** | Central manager: round-robin, LLM selector, "swarm", MagenticOne [C]. AG2 fork NV | Shared message thread | Group chat | Manager picks next speaker | Tools per agent | `TokenUsageTermination`, opt-in, checked after the turn [C] | NV today | NV | Everything field-related; a channel that is not the chat |
| **Microsoft Agent Framework** | Graph workflows run in supersteps; built-in Sequential, Concurrent, Handoff, Group Chat, Magentic ("a manager agent dynamically coordinates") [D] | "Shared states", captured in checkpoints [D] | Typed messages between executors; shared conversation in Group Chat [D] | Edges, or the manager | Tools, MCP, middleware [D] | Token/cost cap NV | Checkpoint at every superstep; since Python 1.13.0 "the complete workflow run replayable"; telemetry named, details NV [D] | NV | Authored/decaying traces; self-selection; matched-cost controls |
| **CrewAI** | Sequential list, or hierarchical with a manager that "allocates tasks to agents based on their capabilities" [D] | Task outputs passed as context [C] | Task context; delegation | Fixed order, or manager LLM | Tools per agent; role text in prompt | `max_iter`=25; RPM is a rate, not a budget [C] | NV | NV | All of the above |
| **MetaGPT** | Publish/subscribe environment; default hub is a TeamLeader [C] | Environment messages; role memory (`memory_k`=200) [C] | Pub/sub messages | Role subscriptions; team leader | Role = prompt + actions | [US$ redacted] default, checked between rounds; unpriced model counts 0 [C] | Cost manager; tracing NV | NV | Field with decay; cost admission before the call |
| **CAMEL** | Role-playing pair; Workforce with `coordinator_agent` and `task_agent` [D] | `share_memory=True` among single-agent workers [D] | Central task channel [C] | Coordinator assigns; planner decomposes; retry/replan [D] | Toolkits per agent | Tokens recorded only [C] | NV | Workforce NV. OASIS (same group) simulates "up to one million users", a social simulation, not task cooperation [P] | Leaderless allocation; budget; attributable traces |
| **OpenAI Agents SDK** (earlier **Swarm**) | Manager with agents-as-tools, or handoffs; "orchestrating via code" as the alternative [D]. Swarm: agents + handoffs, stateless client loop, "now replaced by the OpenAI Agents SDK" [D] | Context object / sessions (linked, not read); Swarm `context_variables` [D] | The conversation, handed over | LLM chooses handoff or tool | Tools, guardrails, typed output [C] | `max_turns` default 10; usage tracked, not capped [C]. Swarm `max_turns` default ∞ [C] | Built-in spans: agent, generation, function, guardrail, handoff; custom processors; no replay described [D] | NV | Field; non-conversational channel; budget; replay |
| **Claude Agent SDK / Claude Code** | (a) Subagents: lead spawns, "only its final message returns to the parent". (b) Agent teams (experimental): fixed lead, shared task list, mailboxes. (c) Dynamic workflows: a script holds the plan [D] | Team task list on disk (pending / in progress / completed, dependencies); workflow script variables [D] | Final report to parent; `SendMessage` between named agents; mailbox JSON files [D] | Lead assigns, or teammates **self-claim** the next unblocked task under a file lock; in workflows, the script [D] | `tools` allow-list, `skills` preloaded into context (first 32), MCP [D] | `maxTurns`; `max_budget_usd` (covers subagents; refuses spawns at the cap); depth 3; 20 concurrent subagents; workflows 16 concurrent, 1,000 agents per run [D] | One JSONL transcript per subagent; `parent_tool_use_id`, `agent_id`; per-model cost for the whole tree; hooks `TaskCreated`, `TaskCompleted`, `TeammateIdle` [D] | Teams: "start with 3-5 teammates". Workflows: "dozens to hundreds of agents per run" [D] | Trace weight/decay; regimes as parameters; per-decision cost; control arms |
| **Google ADK** | Template workflows for sequence, loop, parallel; graph and dynamic workflows (2.0+); "a single coordinator agent directs a set of specified sub-agents" [D] | Session state NV | Transfer / agent-as-tool NV | Code, or coordinator LLM | Tools | NV | NV | NV | NV in detail; same gaps expected (inferred) |
| **LlamaIndex** | `AgentWorkflow` with `root_agent` and `can_handoff_to`; orchestrator with agents as tools; custom planner; event-driven `Workflow` steps [D] | `initial_state`, `ctx.store` [D] | Handoff; typed events | Active agent hands off, or orchestrator, or your code | Tools per agent | NV | Event stream [D]; rest NV | NV | Field semantics; budget; allocation from state |
| **Letta** | None imposed; agents with persistent memory | **Shared memory blocks** attached to several agents; `read_only`; append is concurrency-safe, `memory_rethink` is last-writer-wins; blocks may be deprecated in favour of "shared memory repositories" [D] | Shared block; messaging tools NV | Not provided | Tools; memory tools | NV | NV | NV | Closest to a field in a product; lacks author, weight, decay, allocation rule, budget |
| **smolagents** | Manager agent with `managed_agents` [D] | None described | Manager calls the managed agent like a tool | Manager LLM | Tools; code actions | `max_steps` [D] | NV | Example has one manager, one managed agent [D] | Everything beyond a two-level hierarchy |
| **GPTSwarm** | DAG of operations; edges sampled from learned probabilities [C][L] | None beyond node outputs | Graph edges | Learned topology (REINFORCE) | Per node | Cost accumulated, never bounded [C] | Cost counter | 7 agents on GAIA: 25.66 → 30.56 at about 5.8× the time [L] | Run-time allocation; budget; matched-cost control |
| **AgentVerse** | Recruit → decide → act → evaluate; horizontal or vertical discussion [P] | Discussion history | Conversation | Recruiter and solver | Tools in some tasks | NV | NV | 2 to 4 agents; no token matching stated; with GPT-3.5 the group was below solo on two of three general tasks [P] | Same as chat frameworks |
| **MacNet** | Generated DAG (chain, star, tree, mesh, random), topological order [L][C] | Artefact passed on; a node sees only its predecessor's solution | Edge = critic exchange, up to 3 rounds | Topology | NV | None; tokens reported | Token counts | 2^6 nodes ("over a thousand agents" in the mesh, counting edges); saturation near 2^4 [L] | Run-time signals; cost control; single-agent control |
| **AgentNet** | Decentralised DAG; each agent decides forward / split / execute by LLM [L][C] | Per-agent trajectory pool (RAG), capped | Task forwarding | Local routing; edge weights updated on success [C] | Learned specialisation | None; no tokens measured [L] | NV | 3 to 9 agents; +0.8 pp from 3 to 9 in training [L] | Shared field (it has per-agent memory only); cost |
| **SwarmAgentic** | Design-time search over whole agent systems, "drawing inspiration from Particle Swarm Optimization"; the product is a conventional system [P] | n/a | n/a | n/a | Generated | NV | NV | NV; abstract reports +261.8% over ADAS on TravelPlanner, no cost statement [P] | Not a runtime; could search regime parameters |
| **Pressure Fields** (2601.08129) | None: agents patch high-pressure regions of one artefact [P][L] | The artefact plus pressure signal with temporal decay | The artefact | Local gradient | NV | Tokens recorded for its own arm only [L] | NV | 1, 2, 4 agents; 1,350 trials [P] | Matched-cost controls; operator; larger models |
| **SwarmWorld** (2608.26081) | None: stigmergy through persistent artefacts in a simulated world [P] | The world | Artefacts; optional cultural channels | Self-selection | Fixed schemas, deterministic simulator | Matched on decision opportunities, not tokens [L] | NV | 100 agents per the lab's earlier reading [L]; abstract gives no count [P] | Token-matched deep-agent control |

Sources for the table are listed at the end.

### A.2 What almost all of them assume (inferred from the table)

1. **Someone holds the plan.** Either a lead agent (manager, supervisor, coordinator, team lead) or the developer's graph. Only the two stigmergy papers, AgentNet and, partly, Claude Code's self-claim have agents choose work from state.
2. **The channel is conversation.** Handoffs pass the history; group chats share it; subagents return a summary to a parent. Shared state, where it exists (LangGraph state, MAF shared states, Letta blocks, `ctx.store`), is a key-value blob: no author, time, weight or decay on a write.
3. **Memory is per agent.** Shared memory is an option bolted on (CAMEL `share_memory`, Letta blocks).
4. **Skills are context.** A role or skill is text placed in the agent's prompt.
5. **Budget is counted after the fact, if at all.** The lab's matrix found two frameworks that halt on cost, both after the step. Today's reading adds the Claude Agent SDK's `max_budget_usd`, which also refuses new spawns. None admits a call against a reservation before sending it, as `observatory/batch2/run2.mjs` does.
6. **Tracing is per call, not per decision.** Spans describe model calls and tool calls. None records which shared-state version an agent read or what its write caused.
7. **Scale claims are about node counts, not about matched cost.** Where large numbers exist they are simulations (OASIS) or node-plus-edge counts (MacNet).

### A.3 Which of these our evidence questions, and which it does not

- **Lead agent (1): questioned.** In R1 the orchestrator model "reinvented the sweep" at 11% more cost; the internal case put 51% of spend in delegated requests and 42% in ping-pong trees. Anthropic's own account of its research system reports that multi-agent systems use "about 15×" the tokens of a chat and that token usage alone explains 80% of performance variance [D]; its 90.2% gain over a single agent is not stated to be at matched cost.
- **Conversation as channel (2): questioned.** Reasoning per agent is the largest gain in V2, V5 and V6; history carried between agents is context taken from it. Kim et al. report successes per 1K tokens falling from 67.7 (single agent) to 13.6–42.4 across multi-agent architectures at a matched token budget [L].
- **Skills as context (4): questioned.** I6 and I9: any rule in context removed a behaviour both models showed unprompted; the small model does not arbitrate overlapping rules. The rule belongs in the harness where possible.
- **The developer's graph (1, other half): supported, not questioned.** A fixed schedule equalled the orchestrator in R1. Claude Code's dynamic workflows are the industrial version of this: the script "holds the loop, the branching, and the intermediate results", bans `Date.now()` and `Math.random()` so a relaunch repeats the same calls, and caps a run at 1,000 agents [D]. Inferred: the strongest existing competitor to a swarm runtime is a script, not a chat framework, and it is the control arm to beat.
- **Leaderless allocation:** our evidence supports it only under scarcity with local structure (R2: alarm 0.72 against sweep 0.53), with the rule in the harness.

### A.4 Where a from-scratch runtime would differ (proposed)

Four things no surveyed runtime has together: (a) a **field** whose writes are traces with author, time, weight and decay, versioned so that every read names the version it saw; (b) **regimes as parameter vectors executed by the harness**, so coordination costs no model tokens unless a regime chooses to spend them; (c) **budget admission before the call** against a shared ledger; (d) **control arms generated by the runtime**. Everything else (tool calling, model clients, sandboxes) can be borrowed. This argues for a small kernel on top of the existing batch runner, not a general framework.

---

## Half B — Seeing, replaying, measuring and steering

### B.1 Tracing standards and products

- **OpenTelemetry GenAI agent spans** [D]: status "Development". Operations `create_agent`, `invoke_agent`, `invoke_workflow`, `plan`, `execute_tool`; attributes `gen_ai.agent.id`, `gen_ai.agent.name`, `gen_ai.conversation.id`, `gen_ai.usage.input_tokens` / `output_tokens`. The page has nothing for inter-agent messages, writes to shared state, cost in currency or teams.
- **OpenInference** (the convention behind Phoenix) [D]: span kinds include `AGENT`, `TOOL`, `GUARDRAIL`, `EVALUATOR`, `DECISION`; `llm.cost.*` in USD, `llm.token_count.*`, `graph.node.id` / `graph.node.parent_id`, `session.id`. Nothing for inter-agent messages or shared state. The Phoenix product page returned 403; its features are NV.
- **LangSmith** [D]: runs, traces, threads, feedback bound to a run. The concepts page read does not mention cost or re-execution. NV beyond that.
- **Langfuse** [D]: traces, nested observations, sessions; cost per generation, "ingested costs take priority" over costs inferred from a model price table. No attribution to an agent on the pages read.
- **AgentOps** [D]: sessions with a waterfall of LLM calls, tools and errors; integrations for AG2, CrewAI, ADK, OpenAI Agents, smolagents. The page read describes recording and browsing, not re-execution.

Inferred: these tools answer "what did call X cost and say". They do not model the two objects a swarm is made of, the field and the trace. Their formats are worth exporting to, not building on.

### B.2 Replay and counterfactuals

- **LangGraph time travel** [D]: replay from a checkpoint; nodes before it "are not re-executed", nodes after it "re-execute, including any LLM calls" and "may produce different results". A fork is `update_state` on a past checkpoint.
- **Microsoft Agent Framework** [D]: a checkpoint per superstep holding executor state, pending messages and shared states.
- **Claude Code workflows** [D]: a relaunch returns saved results until the first agent whose prompt differs, then reruns everything after it.
- **AGDebugger** (Epperson et al., CHI 2025) [P]: edit and reset earlier agent messages; a study with 14 participants stressed "interactive message resets".
- **The lab's runner**: requests and results are stored per wave under a frozen `configHash`; replay is reading the files. A counterfactual is a new wave with a different manifest.

Inferred: nobody offers deterministic replay of the model itself; all offer cached replay up to a divergence point. That is enough if the log stores every input and output, and it means a counterfactual rerun is a sample, so it needs repeats like any other arm.

### B.3 Failure taxonomies and attribution

- **MAST** (Cemri et al., arXiv 2503.13657) [L]: 14 failure modes from 1,642 traces of 7 frameworks; by the lab card's sums, about 44% system design, 32% inter-agent misalignment, 24% verification; prompt or topology fixes gave limited gains.
- **Who&When** (Zhang et al., arXiv 2505.00212) [P]: failure logs from 127 multi-agent systems; the best automated method reached 53.5% at naming the responsible agent and 14.2% at naming the step.

Inferred: reading logs after the fact attributes failures poorly, even with strong models. The R2 flaw was found for a different reason: the orchestrator's working text was logged and the picks could be counted against chance (88 of 120 inside the edited block, 30 expected). Attribution has to be designed in: each decision recorded with what it read, and tested by removing it.

### B.4 Measuring gain at matched budget

- **Collaboration gain** (Fan et al., arXiv 2602.05289) [P]: Γ = Φ_M / Φ_S, "the performance ratio of a MAS to a Single-Agent System (SAS) under equivalent computational resource constraints"; Γ = 1 is the null. The paper says resource equivalence is task-dependent (tokens, sampling steps or tool calls). It is a position paper; I found no benchmark shipped with it (NV).
- **Kim et al.** (arXiv 2512.08296) [L]: 260 configurations at a matched reasoning-token budget, multi-agent from +80.8% to −70% relative to a single agent.

Inferred: Γ has one denominator. Our runs need two: the deep agent and the fixed schedule. A swarm that beats one agent but not a schedule has shown the value of parallel reads, not of coordination.

### B.5 Interfaces for a human over many agents

- **Interrupt and approve.** LangGraph `interrupt()` / `Command(resume=...)`, the node restarts from its beginning on resume [D]; Agent Framework tool approval and request-info [D]; Claude Code permission prompts that "bubble up to the lead" [D].
- **Talk to one agent.** Claude Code agent teams let the human message any teammate directly; Escape interrupts its turn [D]. Workflows allow pause, stop and restart of an agent but "no mid-run user input" [D].
- **Edit shared state.** LangGraph `update_state`; Letta `client.blocks.update()` from outside the agents [D]; Claude Code's task list and `TaskCreated` / `TaskCompleted` hooks [D]. These exist as debugging or administration paths; none treats the human's edit as an event of the same kind as an agent's write.
- **Co-planning.** Magentic-UI (arXiv 2507.22358) names co-planning, co-tasking, multi-tasking, action guards and long-term memory [P].

Inferred: every interface found puts the human above a lead agent or beside one agent. "Operator as a perturbation of the field" is not implemented anywhere I read. The lab's R1 silent edit is the nearest thing, and it was a test condition, not an interface.

### B.6 Requirements for the swarm runtime (proposed)

1. **One event log, one format.** Every event is `{run, seq, actor, kind, field_version_read, writes[], call_id?, tokens_in, tokens_out, usd, config_hash}`. `actor` is an agent id, `harness:<rule>`, `operator` or `perturbation:<id>`. Model calls store the full request and response, including working text.
2. **Attributable.** Every trace in the field points to the event that wrote it; every model call lists the trace ids present in its prompt.
3. **Replayable.** Folding the log reproduces the field at any `seq` with no model call. A fork at `seq = k` with a changed event is a new, hashed manifest and goes through reservation like any wave.
4. **Cost per decision as a first-class measure.** A decision is a choice of what happens next: which part to read, whether to deposit, whether to stop, who gets what. Its cost is the priced tokens of the calls that produced it, including field content placed in the prompt, and zero when a harness rule made it. Report: US$ per decision, share of spend on coordination against work, US$ per correct answer.
5. **Built-in controls.** A study cannot freeze unless it declares a deep-agent arm and a best-fixed-schedule arm at the same reserved tokens. Report Γ against each with intervals.
6. **Perturbation as a test facility.** Registered injectors: edit the field, kill agents, inject a false trace, delay or drop a write. Each is an event in the log and a factor in the preregistration.
7. **Operator through the field.** The operator's only write path is the field, with the same event format. Text placed in an agent's context by the operator is a different, separately logged kind, because I6 shows it has side effects.
8. **Preregistration hooks.** Keep what `run2.mjs` enforces (frozen source hashes, approval bound to the hash, reserve before submit, no retry of an uncertain POST) and add the prereg's predictions as machine-readable rows that the analysis must fill.
9. **Generator audit.** Before a paid run, test offline whether anything observable before a perturbation predicts where it will be. This is the R2 flaw turned into a gate.

---

## What to build first (proposed)

1. **Field log.** A small module beside `observatory/batch2/`: append-only JSONL with the schema of B.6(1), a `fold(seq)` function, and an exporter to OpenInference attributes for viewing. Retrofit R1 and R2 results into it as the acceptance test: the tables in both reports must be reproducible from the log alone. Free.
2. **Control-arm generator and report.** Given a study's protocol, emit the deep-agent and fixed-schedule manifests at the same reserved budget, refuse `--freeze` without them, and print Γ and cost per decision in `summary.json`. Free to build; it changes no past result.
3. **Perturbation kit with the generator audit.** Three injectors (edit, kill, false trace) and the leakage test of B.6(9), applied first to R2b. This is the first piece of the operator study planned for P3.

A general agent runtime is not on this list. The evidence so far supports a harness that runs rules and schedules, with models as readers.

## Hypotheses for the batch instrument

Each is one or two studies on the existing counting task, at the current per-study cap.

- **H-O1, coordination displaces reasoning.** With the read task fixed, adding 0, 200, 800 or 2,000 tokens of board content to the reader's prompt lowers the rate of exact counts monotonically. Refuted if flat.
- **H-O2, operator through the field.** An operator correction deposited as an alarm trace on part *k* redirects re-reads as well as the same correction written into each agent's context, and unlike the latter does not suppress an unprompted behaviour (the quarantine of I4/I6). Arms: field trace, context instruction, none.
- **H-O3, false trace.** Under the R2 alarm rule, one injected false alarm costs the swarm at most the reads it attracts; requiring two independent alarms before recruitment (quorum 2) recovers most of the loss at a measurable cost in tracking true edits. Compare with an orchestrator shown the same false trace.
- **H-O4, coordinator failure.** When the assigning call fails or is withheld for one round, the orchestrator arm loses more correct collections than the alarm arm loses when the same number of worker calls are killed. This is the case R1's limits section names and no run has tested.
- **H-O5, attribution by removal.** On runs with a planted cause, removing one logged trace and rerunning (with repeats) names the decisive step more often than a model reading the log. Who&When's 14.2% is the published reference for the second method; our tasks differ, so only the within-study contrast counts.
- **H-O6, decisions are cheaper in the harness.** For the same sequence of assignments, cost per decision is lower when a harness rule makes them than when a model does, with no loss of accuracy when structure is known (R1 already suggests 0 against about 11% of spend); the open part is the scarce, non-local case R2b targets.

## Unknown

- Whether any of this holds when the regime is a behaviour of the agents and not a rule in the harness (P1 README, open item 2). Every result above has the rule in the harness.
- Whether batch reruns of an identical request are stable enough for counterfactuals with few repeats. V1b found shared errors across identical samples (correlation 0.79), which suggests yes for this model and task, but it was not measured for this purpose.
- Scale. No source read today demonstrates cooperative task work by more than about a hundred LLM agents at matched cost; the lab's own "saturates near N≈300" is historical and from coding tasks.
- Current state of the frameworks. Cells marked [C] date from commits read on 2026-11-07; cells marked NV were not checked at all. AG2, Google ADK internals, Letta messaging, LangGraph reducers and `recursion_limit`, smolagents telemetry and Phoenix features are the main gaps.
- Whether Γ's authors or others have released a benchmark. Only the definition was read.
- Whether an operator can act usefully through a field at all on a real task. R1's silent edit shows a field edit is detectable by re-reading; it does not show a human can steer with it.

## Sources read today

Official documentation: LangGraph [persistence](https://docs.langchain.com/oss/python/langgraph/persistence), [time travel](https://docs.langchain.com/oss/python/langgraph/use-time-travel), [interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) · Microsoft Agent Framework [overview](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview), [orchestrations](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/), [checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints) · CrewAI [processes](https://docs.crewai.com/en/concepts/processes) · CAMEL [Workforce](https://docs.camel-ai.org/key_modules/workforce) · OpenAI Agents SDK [multi-agent](https://openai.github.io/openai-agents-python/multi_agent/), [tracing](https://openai.github.io/openai-agents-python/tracing/); [Swarm README](https://github.com/openai/swarm) · Claude Code [subagents](https://code.claude.com/docs/en/sub-agents), [agent teams](https://code.claude.com/docs/en/agent-teams), [dynamic workflows](https://code.claude.com/docs/en/workflows); Agent SDK [subagents](https://code.claude.com/docs/en/agent-sdk/subagents), [cost tracking](https://code.claude.com/docs/en/agent-sdk/cost-tracking) · Google ADK [workflows](https://adk.dev/workflows/) (overview only) · LlamaIndex [multi-agent patterns](https://developers.llamaindex.ai/python/framework/understanding/agent/multi_agent/) · Letta [shared memory](https://docs.letta.com/guides/agents/multi-agent-shared-memory) · smolagents [multi-agent example](https://huggingface.co/docs/smolagents/en/examples/multiagents) · OpenTelemetry [GenAI agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md) · [OpenInference semantic conventions](https://github.com/Arize-ai/openinference/blob/main/spec/semantic_conventions.md) · LangSmith [observability concepts](https://docs.langchain.com/langsmith/observability-concepts) · Langfuse [data model](https://langfuse.com/docs/observability/data-model), [token and cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking) · AgentOps [introduction](https://docs.agentops.ai/v2/introduction) · Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system).

Papers (abstract page unless noted): [AgentVerse 2308.10848](https://arxiv.org/abs/2308.10848) (arXiv HTML, first 100k characters) · [SwarmAgentic 2506.15672](https://arxiv.org/abs/2506.15672) · [Pressure Fields 2601.08129](https://arxiv.org/abs/2601.08129) · [SwarmWorld 2608.26081](https://arxiv.org/abs/2608.26081) · [Towards a Science of Collective AI 2602.05289](https://arxiv.org/abs/2602.05289) (HTML for the definition of Γ) · [Who&When 2505.00212](https://arxiv.org/abs/2505.00212) · [AGDebugger 2503.02068](https://arxiv.org/abs/2503.02068) · [Magentic-UI 2507.22358](https://arxiv.org/abs/2507.22358) · [OASIS 2411.11581](https://arxiv.org/abs/2411.11581).

From the repository, not re-fetched: `research/oss/MATRIX.md` and `PATTERNS.md` (AutoGen, CrewAI, MetaGPT, CAMEL, OpenAI Swarm and Agents SDK, LangGraph add-ons, GPTSwarm, AgentNet, MacNet code at pinned commits); `research/literature/lit-gptswarm.md`, `lit-macnet.md`, `lit-agentnet.md`, `lit-mast.md`, `lit-scaling-agent-systems.md`; `tasks/L2-RELATED-WORK-TO-READ.md`; `results/batch2-r1-regimes/REPORT.md`, `results/batch2-r2-regimes/REPORT.md`; `observatory/batch2/run2.mjs`; `STATE.md`.

Not reached: the Phoenix documentation page (HTTP 403); the moved OpenTelemetry page on opentelemetry.io (redirect notice only); the Letta multi-agent overview (navigation only).
