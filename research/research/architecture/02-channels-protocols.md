# 02. Channels and protocols for a swarm

Design study, 2026-11-11. Status: proposal; nothing here has been run. Vocabulary follows `papers/P1-bio-inspired-agentic-swarms/VOCABULARY.md` (field, trace, deposit, decay, threshold, quorum, recognition and inhibition, operator, orchestrator).

Three kinds of statement are kept apart: **[S]** a source reports it (linked, with what was read in section 7), **[I]** my inference, **[P]** my proposal. Results of this lab are cited by batch id; they are single runs on synthetic tasks.

## The question

Today's agent channels were built for one assistant (request and response), for a fixed pipeline (handoff) or for a small team (chat). A swarm of hundreds needs something else. Our own runs set the terms:

- Free text from a peer is a control input. It is never formally adopted (0 of 112 across I1, I3, I4), yet on Haiku it moved verdicts in one family, and any rule placed in context removed the quarantine both models do unprompted; a note with no rule roughly halved it (I4, I6).
- One unverified record turned 12 of 12 verdicts into `unsure` and none into the attacker's label; injected orders did nothing (B1, B4).
- Relay format did not matter at the loads tested (B2, B5).
- A simple alarm on a shared board beat the best fixed schedule only under a scarce budget with local structure, and an orchestrator given the same board did what the local rule does (R2; its P3 is confounded).
- Tokens spent on messages are taken from working space, which was the largest single gain we measured (V2, V5, V6).
- Small models follow one action per trigger and do not arbitrate overlapping rules (I5, I7, I12, I13).

## 1. Landscape

### 1.1 Agent frameworks

| System | Addressing | Typed or free text | Timing | What enters the receiver's context | Provenance | Back-pressure |
|---|---|---|---|---|---|---|
| AutoGen Core | Direct by agent ID, or publish to a topic `(type, source)` that subscriptions map to agents [S] | Application-defined | Asynchronous | Whatever the handler passes on | Not stated on the page read | Not stated |
| AutoGen SelectorGroupChat | Everyone: each response "is then broadcasted to all other participants"; a model call picks the next speaker [S] | Free text | Turn-based | The whole conversation | Speaker name | Termination conditions only |
| CrewAI | Named coworker through two tools, `Delegate work` and `Ask question`, each taking `task`/`question`, `context`, `coworker` strings; or task `context=[...]` [S] | Free text in string fields | Synchronous tool call | The delegated text and the reply | Not described on the page read | Advice to forbid re-delegation |
| LangGraph | No messages between nodes: nodes read and write named channels of a shared state, merged by reducers, in Pregel-style super-steps; `Send` fans out, `Command` updates and routes [S] | Typed state schema | Super-steps | The state keys the node reads | Not in the model | None stated |
| MetaGPT | Shared message pool; roles subscribe by role profile; an agent acts once its prerequisites have arrived [S] | Structured documents; the paper argues free dialogue distorts "like the telephone game" [S] | Asynchronous | Subscribed documents | Author role | Subscription is the filter |
| OpenAI Agents SDK | Handoff exposed as a tool `transfer_to_<agent>`; the receiver "gets to see the entire previous conversation history" unless an `input_filter` trims it [S] | Free text; `input_type` adds typed metadata only | Synchronous transfer of control | By default, everything | None beyond the history | `max_turns` |
| Claude subagents | Parent to child; a child starts with a fresh context and returns a summary; nesting up to three layers by default; named agents can message each other [S] | Free text | Call and return, or background | The delegation prompt; the summary on return | Parent composed the prompt | Depth limit |
| Claude agent teams (experimental) | Any teammate by name through a per-agent mailbox file; no broadcast ("send one message per recipient"); shared task list with file-lock claiming [S] | Free text plus a few structured protocol messages | Asynchronous, delivered automatically | Each message, in full | The receiver is told the message came from another Claude session, not from the user; a teammate cannot supply consent [S] | Docs advise 3 to 5 teammates; cost scales with team size [S] |

[I] Three patterns sit under the product names: transfer of the whole context (handoff), a private text channel between named agents (mailbox, delegation tools) and shared state (LangGraph channels, MetaGPT pool, the teams task list). Only the third does not grow with the number of pairs. Agent teams is the one system read here that states a structural rule about peer text, and it concerns consent, not influence on judgement, which is what I6 measured.

### 1.2 Inter-agent protocols

| Protocol | What it is | Addressing | Payload | Provenance | Limits found |
|---|---|---|---|---|---|
| A2A 1.0.0 | Client to remote agent over JSON-RPC, gRPC or HTTP+JSON; a `Task` with states, `Message`, `Artifact`, streaming and webhooks [S] | One endpoint, found through an Agent Card. No topic or group addressing in the part read [S] | `Part` = text, raw bytes, url or JSON data [S] | API key, OAuth 2, OIDC, mTLS; Agent Cards "MAY" be signed with JWS over JCS [S] | No rate limit or back-pressure rule found; no guidance on treating a peer's content as untrusted found (200k of 255k characters read) |
| MCP 2025-06-18 | Host and client to server over JSON-RPC: tools, resources, prompts. A tool channel, not an agent channel [S] | Client to its server | Tool results as content blocks or `structuredContent` checked against an `outputSchema` [S] | OAuth-based authorization for HTTP; clients "MUST consider tool annotations to be untrusted unless they come from trusted servers" [S] | Servers MUST rate limit; clients SHOULD validate results "before passing to LLM" [S] |
| ACP (IBM) | REST, MIME-typed parts, async first; its site says it "is now part of A2A under the Linux Foundation" [S] | One endpoint | Any MIME type | Not read | Not read |
| ANP 1.2 | Identity by W3C DID (`did:wba`), agent description, discovery through `.well-known`; meta-protocol negotiation is still a draft [S] | Open internet, by DID | Negotiated | DID-based authentication [S] | Not read |
| AGNTCY SLIM | gRPC over HTTP/2 messaging layer: point to point, group multicast, RPC; MLS end-to-end encryption; hierarchical names `org/namespace/service/id` [S] | Agent or group channel | Opaque to the layer | SPIRE-federated identity [S] | Not read |
| Agora | Meta-protocol: fixed routines for frequent exchanges, natural language for rare ones, model-written routines between [S, abstract] | Peer to peer | Mixed | Not read | Not read |

[I] These solve interoperability between organisations: identity, discovery, long-running tasks. All assume an addressable counterpart and a payload the receiver's model will read. None read here specifies what a receiving model should be shown, or bounds it. Inside one swarm run by one operator, the identity work is mostly unnecessary and the unspecified part is the whole problem.

### 1.3 Classical agent communication languages

FIPA ACL and KQML come from speech-act theory: each message carries a performative that states the act, and the content language is separate and "varies from system to system" [S, Wikipedia; the FIPA specifications returned HTTP 403 and the KQML paper 404, so neither was read]. The contract net (Smith 1980; FIPA SC00029) is a task auction: a manager sends a call for proposals, contractors propose or refuse, the manager accepts one, the contractor reports the result [S, Wikipedia].

[I] Two things carry over. A small closed set of act types, read by the infrastructure rather than argued about by the agent, is what section 3 asks for. And the contract net is a ready pattern for a *request* that does not name a recipient. What does not carry over is the assumption that the content is a formal expression; with language models the content is free text and can itself act on the receiver.

### 1.4 Distributed-systems channels

| Channel | Property that matters here | Source |
|---|---|---|
| Publish/subscribe | Sender does not know the receivers; filtering by topic | AutoGen Core and MetaGPT above |
| Gossip and epidemic protocols | Each node contacts a random peer per round; a rumour reaches all nodes "within logarithmic time in the size of the network" | Wikipedia (article flagged as lacking inline citations); Demers et al. 1987 cited there, not read |
| SWIM | Membership updates ride on pings already being sent, "equivalent to gossip dissemination" | Wikipedia; Das et al. 2002 not read |
| Actor mailboxes | Akka's default mailbox is unbounded; a bounded one passes overflow to dead letters | Akka docs |
| Reactive Streams | Back-pressure exists "to allow the queues which mediate between threads to be bounded" | reactive-streams.org |

[I] For an LLM receiver the bounded queue is the context window, and every message is paid for twice: in money and in working space. An unbounded mailbox is therefore not a neutral default. Gossip's logarithmic spread is a count of rounds; in a swarm each round is a model call, so it is cheap only if the substrate, not the model, carries the rumour.

### 1.5 What happens at N in the hundreds

[I] Arithmetic, not measurement. In a group chat every message is read by N−1 agents, so a round in which each agent speaks once costs on the order of N² message-reads; at N = 300 and 100 tokens a message that is about 9 million input tokens a round. A mailbox avoids this only while fan-in per agent stays small, which someone has to enforce. Shared state costs each reader what it chooses to read, independent of N, if the view is local. [S] Reported figures point the same way: AgentPrune reports 28.1% to 72.8% fewer tokens after pruning message graphs (abstract); a blackboard system reports spending fewer tokens than static and dynamic alternatives (abstract); the Claude docs advise 3 to 5 teammates. In this repository a board beat independent agents at N = 300, was matched by a central dispatcher, and saturated at N = 1,000 (`research/FLAGS.md`, LAB-004).

## 2. Biology as a source of channel designs

Every engineering analogue below is an **analogy**: it suggests a design to test and is no evidence that the design works.

| In nature | Source and level | Engineering analogue (analogy) | Caution |
|---|---|---|---|
| **Signal or cue.** A signal evolved because it changes the receiver's behaviour; a cue is a by-product the receiver exploits | Wikipedia, *Signalling theory*, citing Bradbury & Vehrencamp 1998 | A signal is a deliberate deposit; a cue is the work product itself (a failing test, a changed count). Prefer cues: they cost the sender nothing and cannot be phrased persuasively | The open point in the vocabulary, whether the work product counts as a trace, is this distinction |
| **Honest signalling.** Signals need only be reliable on average; shared interest supports reliability; the same article calls the handicap principle obsolete | Same article | Reliability comes from checkability, not from cost: a claim carries a pointer the receiver can open | Agents of one operator share interests until one is compromised; cost-based honesty should not be assumed |
| **Broadcast or local.** Volatile alarm substances act on nearby nestmates; trail pheromone "requires continuous renewal because it evaporates quickly" | Wikipedia, *Pheromone* (second sentence uncited there) | Scope and lifetime are properties of the medium, set by the substrate per message type | R1 found decay made no difference; R2's gain came from locality we built in |
| **Stop signal.** Scouts for one site inhibit dancers for rival sites, which prevents deadlock | `research/nature/nat-stop-signal-cross-inhibition.md` (Seeley et al. 2012, abstract level) | A stop is a typed message that lowers the weight of a named trace and must point to a verified counterexample | H-27 is untested here |
| **Alarm.** A volatile release triggers flight or aggression in conspecifics | Wikipedia, *Pheromone* | A short-lived mark at a place that raises the chance a neighbour re-reads it (the R2 rule) | Alarms cost the readers; false alarms are the obvious attack |
| **Quorum sensing.** Collective action only above a signal concentration | `research/nature/nat-bacterial-quorum-sensing.md` (review abstracts) | The substrate counts independent signals and releases a trigger only above a threshold | Null on real models in LAB-005; quorum predictions failed in simulation |

## 3. Requirements for a swarm-native channel [P]

1. **A small closed set of message types**: `signal` (a mark with a weight), `claim` (a value with an evidence pointer), `request` (work wanted at a place), `alarm` (a disagreement at a place), `stop` (inhibition of a named trace, with a pointer to a verified counterexample). The substrate validates the type; anything else is rejected at write time.
2. **No free text from peers in the default view.** Fields are enumerations, numbers, identifiers and pointers. Text lives behind a pointer and is opened by a deliberate read, where it is rendered as quoted data. This follows I6 (any note moves behaviour) and the separation of control flow from untrusted data in CaMeL [S, abstract].
3. **Operator instructions and peer data arrive by different structural routes** (system prompt versus a fixed data block), never mixed in one string. The channel carries no imperative type: agents cannot send orders, so I5-style collisions between peer rules cannot start.
4. **Provenance is a field set by the substrate**, not written by the sender: author, time, verified or not. B1 and D1 suggest marking works when it is structural.
5. **Unverified records get their own treatment**, because one of them forces abstention (B1). The default is open: withhold, count, or show marked (hypothesis C2).
6. **Addressing by place or topic**, never by agent identity. An agent reads the part of the field it is working on. Identity is kept for audit and quotas.
7. **Budgets and rate limits per agent, enforced on write and on read**: a quota of deposits per round and a hard token cap on the view. The receiver's cap is the back-pressure; overflow is aggregated, not queued.
8. **Aggregation by the substrate**, in code: counts, maxima, quorum tests, deduplication. No model call summarises peers for peers; a model summary is another free-text note.
9. **Expiry on every trace**, set by type. A stop outlives the alarm it answers.
10. **At most one trigger per turn**, chosen by a fixed priority in the substrate (stop, alarm, request, signal), because small models do not arbitrate.

## 4. Candidate designs [P]

Token figures are estimates from field counts at about 1.3 tokens per word. None is measured.

### A. Marks only (the field is the channel)

- **Schema.** `{type: signal|alarm|stop, place, weight: int, ttl, author, t}`. No text field, no claims.
- **Delivery.** Write to the field; no recipient. The substrate applies decay and per-author quotas. Loss is tolerable: a mark is a hint.
- **Receiver's context.** A fixed table for the agent's place and its k neighbours: per place, the counts of live signals, alarms and stops; then the one trigger selected by priority.
- **Cost.** About 10 tokens per place; 80 to 120 tokens for k = 8, constant in N.
- **Failure modes.** Cannot carry a finding, so it suits allocation (where to look), not synthesis. False alarms drain read budget; quotas and a required disagreement between two recorded readings limit it. Injection surface is close to nil: there is no string to inject into. The residual risk is I6's: even a table may shift unprompted behaviour.

### B. Claim ledger with evidence by pull

- **Schema.** A adds `claim` and `request`: `{type: claim, place, key, value, evidence: pointer, author, t, verified: bool, ttl}` with `key` and `value` from a per-task vocabulary; `{type: request, place, kind, ttl}`, claimed by lock as in contract net and the teams task list.
- **Delivery.** Append-only log per place; the substrate deduplicates identical `(place, key, value)`, counts independent authors and sets `verified` only when a check it runs passes.
- **Receiver's context.** At most m rows for its place: `key, value, support count, verified`, with pointers. Unverified claims appear per C2. Evidence enters only when the agent opens a pointer, in a block marked as quoted source material.
- **Cost.** About 25 to 40 tokens a row; with m = 5, under 200 tokens. Opening evidence costs its length and is the agent's choice. M3 suggests the choice matters: a verifier that read sources caught 48 of 48 planted errors, one that read only the report was close to useless.
- **Failure modes.** A closed vocabulary cannot express a surprise; an escape field brings free text back. Injection moves to the evidence behind the pointer, which is ordinary indirect injection and takes the known partial defences (delimiting and marking, as in Spotlighting [S, abstract]). A flood of unverified claims is a denial of verdict if they are shown (B1). Colluding authors can fake support counts unless independence is defined by evidence, not by author.

### C. Typed mailbox (the conventional design, as baseline)

- **Schema.** `{type: request|inform, to: agent, from, text, reply_to}`: what A2A, agent teams and CrewAI delegation roughly give today.
- **Delivery.** Per-agent queue, bounded at q; overflow is dropped oldest first and counted.
- **Receiver's context.** Each message in full inside a block labelled as peer data, with the sender's name.
- **Cost.** About 120 tokens per message at B2's 90-word limit; q = 5 gives about 600 tokens a turn, and fan-in grows with N unless routing is restricted.
- **Failure modes.** Everything I4 and I6 found: verdicts moved, unprompted behaviour suppressed, even by irrelevant notes. Self-replicating injection between agents has been reported for this kind of channel [S, Prompt Infection, abstract]. Labelling helped only partly here: the operator warning in I4 lowered the effect from 12 to 7 of 16.

[I] A is R2's alarm rule made general. B is A plus what Murmur needs. C is the control every hypothesis below is compared against.

## 5. Hypotheses for the batch instrument [P]

Each arm is matched on provider-returned tokens. Baselines are the conventional choice a practitioner would make.

| id | Variable | Endpoint | Baseline at matched cost | Instrument |
|---|---|---|---|---|
| C1 | Peer content as a typed table (A) or as a note of equal token length | Rate of unprompted quarantine; verdict agreement with the no-channel arm | Free-text note (I6 `chatter` arm) | I6 review family |
| C2 | Unverified claim withheld, shown as a count only, or shown marked | Abstention on exposed cases; wrong verdicts; benign utility | Source allow-list | B1 factuality suite |
| C3 | Addressing by place (A) or by identity (C) at N = 12, 48, 192 | Correct collections under edit; channel tokens per agent | Best fixed schedule; orchestrator sending direct messages | R2b (edit not locatable from first counts) |
| C4 | One trigger per turn chosen by the substrate, or all pending messages delivered | Correct action when a stop and an alarm are both live | All messages plus a written priority sentence (I5) | New, built on I5 and I13 cases |
| C5 | Stop with a verified counterexample, or decay alone, under planted false alarms | Reads wasted on false alarms; correct collections | Decay only; a fixed cap on alarms per round | R2 with false alarms |
| C6 | Share of a fixed token budget given to the channel view against working space (0, 10, 25, 50%) | Accuracy | No channel, all budget as working space (V2) | V6 counting task |
| C7 | Evidence pulled by pointer (B) or pushed in the message (C) | Verifier sensitivity and specificity; tokens read | Pushed prose briefing (B2) | M3 and M6 |

C1 decides most: if a typed table suppresses unprompted behaviour as much as a note does, structure does not solve the control problem and the remaining lever is to show less.

## 6. What is unknown

- Whether a non-textual view moves judgement less than text. I6 showed that any added material moves it; no arm tested a table of numbers.
- Whether a closed vocabulary survives a real task. All our instruments have known keys; Void (code) and Murmur (open research) may not.
- The right response to unverified material. Abstention under B1 is correct behaviour by the stated rule and also a denial of service.
- How agents behave when the channel is open to an adaptive attacker. Every injection tried here was fixed in advance; the threat model is not written (`STATE.md`, open item 3).
- Scale. No run here has put more than a handful of model readers on one field with these message types; the N = 300 and 1,000 figures come from coding micro-tasks with another board.
- Whether a swarm needs requests at all, or whether cues from the work product suffice. R1 and R2 used deposits only.
- External facts not verified: A2A's last 55k characters; MCP revisions after 2025-06-18; the FIPA and KQML primary texts; Demers 1987 and SWIM 2002; every paper marked "abstract". The reported 40 to 60% share of tokens spent on natural-language messages reached me through a news summary only and is not used above.

## 7. Sources and what was read

| Source | Read |
|---|---|
| [A2A specification](https://a2a-protocol.org/latest/specification/) | First 200k of 255k characters, through a fetch tool that summarises |
| [MCP 2025-06-18 base protocol](https://modelcontextprotocol.io/specification/2025-06-18/basic), [tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) | Both pages in full |
| [ACP welcome page](https://agentcommunicationprotocol.dev/introduction/welcome) | Page |
| [ANP repository README](https://github.com/agent-network-protocol/AgentNetworkProtocol) | README |
| [SLIM overview](https://slim.agntcy.org/latest/slim/slim-overview/) | Page |
| [AutoGen topics and subscriptions](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/core-concepts/topic-and-subscription.html), [SelectorGroupChat](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html) | Pages |
| [CrewAI collaboration](https://docs.crewai.com/en/concepts/collaboration) | Page |
| [LangGraph graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) | Page |
| [MetaGPT, arXiv 2308.00352](https://arxiv.org/html/2308.00352v7) | First 100k characters of the HTML, including the communication section |
| [OpenAI Agents SDK handoffs](https://openai.github.io/openai-agents-python/handoffs/) | Page |
| [Claude Code agent teams](https://code.claude.com/docs/en/agent-teams), [subagents](https://code.claude.com/docs/en/sub-agents) | Teams in full; subagents first 100k of 117k characters |
| [Agent Communications Language](https://en.wikipedia.org/wiki/Agent_Communications_Language), [Contract Net Protocol](https://en.wikipedia.org/wiki/Contract_Net_Protocol) | Wikipedia only; fipa.org and the KQML paper could not be opened |
| [Gossip protocol](https://en.wikipedia.org/wiki/Gossip_protocol), [SWIM](https://en.wikipedia.org/wiki/SWIM_Protocol) | Wikipedia only |
| [Akka mailboxes](https://doc.akka.io/libraries/akka-core/current/typed/mailboxes.html), [Reactive Streams](https://www.reactive-streams.org/) | Pages |
| [Signalling theory](https://en.wikipedia.org/wiki/Signalling_theory), [Pheromone](https://en.wikipedia.org/wiki/Pheromone) | Wikipedia, first 100k characters each |
| Repository cards `nat-stop-signal-cross-inhibition`, `nat-bacterial-quorum-sensing`, `nat-stigmergy`; `research/FLAGS.md` | In full or in the relevant part; the cards record abstract-level verification |
| [Prompt Infection, arXiv 2410.07283](https://arxiv.org/abs/2410.07283); [CaMeL, 2503.18813](https://arxiv.org/abs/2503.18813); [Spotlighting, 2403.14720](https://arxiv.org/abs/2403.14720); [AgentPrune, 2410.02506](https://arxiv.org/abs/2410.02506); [Agora, 2410.11905](https://arxiv.org/abs/2410.11905); [blackboard LbMAS, 2507.01701](https://arxiv.org/abs/2507.01701); [MAST, 2503.13657](https://arxiv.org/abs/2503.13657); [A Survey of AI Agent Protocols, 2504.16736](https://arxiv.org/abs/2504.16736) | Abstracts only. MAST and the survey were consulted for orientation and support no claim above |
