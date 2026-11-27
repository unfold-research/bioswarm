---
id: arch-01-field-shared-memory
title: The field — shared memory designed for a swarm rather than for one agent
area: architecture
evidence: design-study
tags: [field, trace, shared-state, blackboard, tuple-space, crdt, event-log, stigmergy, alarm, provenance]
related: [nat-stigmergy, oss-stigmergic, oss-matrix, batch2-r1-regimes, batch2-r2-regimes, L2-RELATED-WORK-TO-READ]
updated: 2026-11-11
verification: "Web pages read through a fetch-and-summarise tool, not from PDFs; each row says what was read. Framework rows for AutoGen, MetaGPT, OpenAI Swarm and Agents SDK rest on the lab's own code cards in research/oss/, not on a new reading. No model call was made; every token figure in sections 3 and 4 is an unmeasured estimate."
summary: Existing shared state for agents is either a growing text that every agent rereads or a store that agents must query in words. None computes a small, local, versioned summary for the reader. The proposal is a field where the harness aggregates traces per cell and hands each agent one fixed-shape card.
---

# The field: shared memory designed for a swarm

Vocabulary follows `papers/P1-bio-inspired-agentic-swarms/VOCABULARY.md`: the **field** is the artefact plus the traces on it; a **trace** is a write with an author, a time and a weight.

Three labels are used throughout: **[source]** what a source reports, **[inference]** what I conclude from it, **[proposal]** what I suggest.

## 1. What existing systems give as shared state

| System | Data model | Read / write | Concurrency | What a trace would be | Weight · age · author · provenance | Context cost per read |
|---|---|---|---|---|---|---|
| Blackboard (Hearsay-II, BB1) | One shared store of partial solutions; knowledge sources; a control shell | A source fires when the board satisfies its condition; the control shell picks which acts [source: Wikipedia] | Serialised by the control shell | A hypothesis on the board | Not stated in what I read | Classical systems are not LLMs; not applicable |
| LLM blackboard, LbMAS (arXiv 2507.01701) | Public space plus private spaces for debates | "Each selected agent receives the full blackboard contents as its prompt"; an LLM control unit picks agents; a cleaner agent deletes messages [source] | Rounds (K = 4) | A message | Attribution format not described [source] | **Whole board, every call.** Removing the control unit raised MATH tokens from 4.72M to 13.86M at similar accuracy [source] |
| Tuple space (Linda) | Bag of typed tuples | `out` writes, `rd` copies a tuple matching a template, `in` removes it; `in`/`rd` block [source: Wikipedia] | `in` consumes, so two takers cannot get the same tuple | A tuple | None built in; fields must be added by convention [inference] | One tuple per read: small, but the reader must know the template |
| CRDTs (Shapiro et al. 2011) | Replicated counters, sets, registers with a merge that is commutative, associative, idempotent | Local update, merge later | No locks; replicas converge. Remove-sets (tombstones) "can grow without bound" [source: Wikipedia] | An increment or an add with a unique tag | OR-Set tags give identity; LWW gives time; no weight | Not an agent interface; cost depends on the view built on top |
| Event log / event sourcing | Append-only ordered records; state is a fold over the log | Append; read a derived view | Total order by the log | An event | Author and time by convention; immutable | Raw log grows without limit; a derived view is as small as you make it [not fetched; general knowledge] |
| LangGraph state | Typed keys, each a channel with a reducer | A node gets state, returns a partial update; reducers merge [source: docs] | Parallel nodes share a super-step; checkpoints at super-step boundaries [source] | A state update | None unless put in the schema | Whatever keys the node is given; `messages` grows by default |
| AutoGen group chat | One message thread broadcast over a topic | Every participant buffers the others' messages; a manager picks the speaker [lab card `oss-autogen`] | Manager serialises turns | A chat message | Author yes; no weight; unbounded by default [lab card] | Whole thread |
| MetaGPT | Publish/subscribe message pool; a role keeps messages whose `cause_by` it watches [lab card `oss-metagpt`] | Publish; filtered observe | Rounds | A typed message | Author and causing action; window `memory_k=200` in RoleZero [lab card] | Filtered by type, not by place |
| CrewAI memory | One vector store (LanceDB) with a scope tree | `recall` ranks by 0.5·similarity + 0.3·recency (half-life 30 days) + 0.2·importance; `remember` lets an LLM merge with records above 0.85 similarity [source: docs] | Background writes, drained before each recall; a shared lock [source] | A memory record | Importance and age yes; no author rule; LLM may rewrite or delete on write | Top 10 records by default [lab card]; deep recall adds LLM calls |
| Letta shared blocks | Labelled text block with a character limit, attached to several agents | Always in each agent's context; `memory_insert`, `memory_replace`, `memory_rethink` [source: docs] | Append is safe; rethink is last-writer-wins and "leads to lost updates" [source] | A line in a block | None | Whole block, every call |
| Claude Code subagents and agent teams | Subagents: isolated contexts, a summary returns. Teams: a shared task list plus a JSON mailbox per agent [source: docs] | Task tools; `SendMessage` | "Task claiming uses file locking"; same-file edits overwrite [source] | A task state change or a message | Task state and owner; no weight | Task list plus messages |
| OpenAI Swarm / Agents SDK | One linear history; `context_variables` dict; optional sessions [lab cards] | Active agent gets the whole history | One active agent at a time | A message | None | Whole history, resent every call |
| Pressure Fields (arXiv 2601.08129) | Artefact in regions; each region has content and auxiliary state ("confidence, fitness, and history"); pressure is a weighted sum of hand-written signal functions [source] | The prompt shows **one region** (time block, rooms, assignments, candidates), not other regions and not pressure values; up to 3 negative hints per region [source] | Patches are validated on a fork; one patch per region per tick, best first [source] | An accepted patch; a failed-patch hint | Fitness decays; **no author or timestamp**: the paper says the mechanism "does not inherently provide" that logging [source] | One region. No per-call token count reported [source] |
| SwarmWorld (arXiv 2608.26081) | A spatial world; artefacts at coordinates with author, events, fork and parent references, tick stamps; programs are content-addressed [source: first 100k characters of the HTML] | "Only a local observation and retrieved memory"; a deterministic simulator decides what works [source] | Staggered decision turns; actions resolved transactionally | An artefact | Author, time, lineage, validation gate | Radius and prompt size not stated in what I read |
| Emergent Culture (arXiv 2606.30668) | Key-value store of strings; appended elements age separately | Agents must list keys and read by key; about 8 keys read per cycle out of 100 to 150 [source] | Decay applied after all agents act in a cycle | A stored string or a message | Age only; characters corrupt with age and the element is deleted | Chosen by the agent; write budget 5k characters per cycle |

### What the table shows

1. **[inference] Two read models dominate, and both fail our first constraint.** Either every agent rereads a growing whole (blackboard as built for LLMs, group chat, shared block, linear history), or the agent must spend a call deciding what to query (vector recall, key-value store). The first spends context on the board; the second spends a decision on memory and puts free text chosen by similarity in front of the model.
2. **[inference] Only the stigmergy systems read by place.** Pressure Fields shows one region; SwarmWorld shows a local observation. Pressure Fields is also the only one where the substrate computes the signal (pressure) and the model never sees it. That is the pattern closest to what our runs ask for, and it is the one with no provenance.
3. **[inference] Nothing ties a trace to a version of the artefact.** In R1 the failure was a stale count on the board after a silent edit. No system above marks a trace as "about a version that no longer exists". Time decay is the usual substitute, and it is weakly supported (Pressure Fields: 29 against 26 of 30; Emergent Culture: the authors say decay is not isolated; our R1: no difference).
4. **[inference] Concurrency is a solved problem and not the interesting one.** Append-only writes with commutative merges (CRDT counters and sets, LangGraph reducers, Letta's insert) need no locks; exclusive work needs a claim with a lease (Linda's `in`, `oss-stigmergic`, Claude Code's file lock). Our batch instrument runs in waves, which is the same model as LangGraph's super-step: all writes of a wave merge before the next wave reads.

## 2. Requirements for a swarm-native field

Each requirement is a **[proposal]**; the reason given is one of our constraints.

| # | Requirement | Reason |
|---|---|---|
| R1 | **Trace schema**: `id, cell, kind, value, weight, author, wave, artefact_version, evidence, expires, status` | Vocabulary definition, plus the two fields nobody has: version and evidence |
| R2 | **Locality**: an agent reads one cell and a bounded neighbourhood. The neighbourhood relation belongs to the artefact (adjacent parts, files that import each other), not to similarity of text | Context goes to the task; R2's gain came from neighbour recruitment |
| R3 | **Aggregation by the substrate**: the agent reads a summary of fixed shape (count of readings, agreed value, disagreement flag, alarm flag), never the raw log | Cheap reads; small models need one unambiguous trigger |
| R4 | **A closed set of kinds**, each with one meaning, and at most one trigger shown per card | One action per trigger; no precedence between overlapping rules |
| R5 | **State, not instruction**: the card states facts about the cell ("two readings disagree"); what to do about them is in the fixed task prompt or in the harness | Injected instructions displace unprompted behaviour |
| R6 | **Staleness by version before decay by time**: a trace carries the hash or version of the part it was made on; when the part changes, the trace is marked stale and leaves the aggregate. Time decay stays as an optional parameter, off by default | R1; decay made no measurable difference |
| R7 | **Alarm as a first-class kind**, raised by the substrate when a new reading differs from the aggregate, not by the agent's judgement; cleared by the substrate when k fresh readings agree | R2: the signal accounted for the gain; a substrate-raised alarm cannot be forgotten or over-used |
| R8 | **Provenance and trust lanes**: every trace has an author and an evidence pointer (the span or check output it rests on). A trace is `unverified` until a check or a second independent author confirms it; aggregates are computed per lane | `oss-stigmergic` showed a quorum of one model with three framings adds nothing; poisoning is a test surface |
| R9 | **Garbage collection**: stale and expired traces leave the read view but stay in the log | Audit; CRDT tombstone growth is a storage problem, not a context problem |
| R10 | **No unintended regularity in what a chooser sees**: canonical order or seeded shuffle of cells; values the task does not need for choosing are withheld | R2: the orchestrator located the edit from the first counts |

## 3. Three candidate designs

Token figures are estimates from field counts, not measurements. The instrument reports provider tokens, so each can be checked in the first run.

### A. Card over a table (thin layer over SQLite or Postgres)

- **Schema.** `traces(id, cell, kind, value, weight, author, wave, artefact_version, evidence, status)`, append-only. A view `cell_card(cell)` gives: `n_readings, agreed_value, disagree (bool), alarm (bool), stale (bool)`.
- **API.**
  - `read(cell) → card` (five fields)
  - `deposit(cell, kind, value, evidence)`; the harness fills author, wave and version
- **Harness computes**: aggregation, alarm on disagreement, staleness, and which cell each agent visits (a seeded rule, as in R1 and R2). **Model decides**: the reading it deposits, nothing else.
- **Cost.** One card, roughly 30 to 60 tokens, independent of field size.
- **Failure modes.** The choice rule is in the harness, so this tests the field as a signal, not agents as choosers (the limit already stated in R1 and R2). Aggregation hides a minority reading that was right. A wrong reading raises an alarm and pulls a visit (R2 saw no false alarm with 0.99 exact counts; R1's counts were 0.84 exact, so expect them there).

### B. Neighbourhood card with a gradient

- **Schema.** A plus `cells(id, neighbours[])` and a per-cell scalar `need`, computed by the substrate from the lane-weighted alarm flag, staleness and visits since the last change.
- **API.**
  - `look(cell) → {here: card, next: [≤3 neighbour ids, ordered by need]}`
  - `deposit(...)` as in A
  - `move(cell_id)`: the model picks one of the offered ids
- **Harness computes**: `need`, the ordering, tie-breaking by seed, withholding of raw values. **Model decides**: which of at most three neighbours to visit, on one stated attribute ("go to the first that is marked").
- **Cost.** Card plus three one-line neighbours: roughly 80 to 150 tokens. One extra short decision per step unless it is folded into the reading call.
- **Failure modes.** Small models may pick the first option whatever the marks say, which makes the model's choice equal to the harness's order (testable, H3). Agents cluster on one alarm and coverage falls; a claim with a lease or a cap on agents per cell is then needed. If `need` shows values, an orchestrator or a worker can exploit a regularity as in R2.

### C. Versioned field in the artefact (from scratch)

- **Schema.** The artefact is a set of content-addressed parts. A trace is an immutable record bound to a part hash: `{id, part_hash, kind, value, weight, author, wave, evidence: {span | check_id}, lane}`. The log is the source of truth; the cards of A and B are folds over it. When a part is edited its hash changes; traces on the old hash are not deleted, they stop matching. Counters and sets merge commutatively, so waves need no locks. Two lanes: `unverified` and `verified` (a deterministic check passed, or two authors from different model families agree).
- **API.** As B, plus:
  - `why(cell) → ≤2 evidence spans` (pull only, never pushed into context)
  - `claim(cell, lease_waves)` for work that must not be duplicated
- **Harness computes**: hashing, lanes, aggregates, gradients, leases, expiry. **Model decides**: its reading, its move, and whether to open the evidence.
- **Cost.** As B on the default path; `why` adds the length of the spans when used.
- **Failure modes.** Most of the mechanism is ordinary engineering that no result of ours yet requires. An edit that keeps the hash's scope but changes meaning elsewhere (a dependency) is not caught, so staleness must spread along the neighbourhood relation, at a cost in re-reads. The verified lane is only as independent as its checkers.

**[proposal] Recommendation.** Build A, with the version field from C from the start, because it is a column and it is the one property no existing system has. Add B's model-side choice only as an experimental arm. Build the rest of C when a task with real edits (Void, code) needs it.

## 4. Testable hypotheses for the batch instrument

All use the R2 setting unless stated (12 parts, 6 reads after the edit, `claude-haiku-5-5`, thinking disabled), with enough collections to see 0.15. Baselines at matched provider tokens: best fixed schedule, and one deep agent where the artefact fits.

| # | Variable | Endpoint | Conventional baseline | Prediction and refutation |
|---|---|---|---|---|
| H1 Card against board | What the worker sees: its cell's card, or the whole board | Correct answer under edit; exact-count rate; tokens per call | Whole board (the LbMAS and Letta read model) | Card is no worse on correctness and cheaper per call. Refuted if the whole board gives better answers at equal total tokens |
| H2 Aggregate against log | Card with aggregate, or the raw list of traces for the cell | Exact-count rate; rate of copying the board value instead of counting | Raw log (event-log read model) | Raw log raises copying. Refuted if no difference |
| H3 Who chooses | Next cell picked by harness rule, or by the worker among 3 offered neighbours (design B) | Edited parts re-read; share of picks equal to the first offered | R2 alarm rule | Model choice does not beat the rule; if picks track position rather than marks, the choice is not the model's |
| H4 Version against decay | Stale-by-version, time decay, both, neither (2 × 2) on R1's silent edit below full coverage | Correct under edit; re-reads of the edited part | Fixed schedule | Version marking helps; decay adds nothing on top. Refuted if decay alone matches version marking |
| H5 State against instruction | Card says "readings disagree", or "re-count this part carefully" | Exact-count rate on unmarked parts; behaviour in the stable condition | Card with no alarm text | The instruction changes behaviour on parts it does not concern. Refuted if no difference in the stable condition |
| H6 Poisoned trace | A fraction of deposits replaced by false alarms or false values; lanes on or off | Correct under edit; reads wasted on false alarms | Fixed schedule (immune by construction) | There is a poisoning rate above which the alarm rule falls below the schedule; lanes move that rate. This locates the boundary of the R2 result |
| H7 Scattered edits | Edits adjacent (as R2) or scattered | Alarm rule minus best schedule | Best fixed schedule | The advantage disappears when edits are scattered, because the neighbourhood carries no information. Refuted if it survives |
| H8 Regularity | Orchestrator sees the board in canonical order with values, or shuffled with values withheld | Share of first-round picks inside the edited block (R2: 88 of 120 against 30 by chance) | R2 router | Withholding removes the advantage. Overlaps with the registered R2b |

H1, H2 and H5 need one wave each and fit the current runner. H3, H4, H6 and H7 need several waves, as R1 and R2 did.

## 5. What is unknown

- Whether any of this matters for a model that can hold the whole artefact. Every design here assumes the artefact exceeds one context; the deep-agent control decides (`tasks/L2-RELATED-WORK-TO-READ.md`).
- What a "cell" and a "neighbour" are in a real artefact. In R1 and R2 parts were given. In code the candidates are files, functions or the import graph, and the choice is itself a design decision that may carry all the effect.
- Whether models can be choosers at all (H3). So far the rule has been in the harness and the models only read and deposited.
- The token size of a card and of the R1 and R2 boards. I did not find it in the reports and did not measure it.
- How aggregation should treat a correct minority. A majority aggregate would have hidden the edit in R1 if the alarm had not been separate.
- Whether evidence pointers are ever opened, and whether opening them pays for its tokens.
- Trust between authors from the same model. Our own and `oss-stigmergic`'s evidence says agreement between copies is weak confirmation; how to weight it is open.
- Details I could not verify: SwarmWorld's observation radius, prompt and model (not in the part read); Pressure Fields' per-call tokens (not reported); how LbMAS attributes entries; the Linda and event-sourcing primary texts (Gelernter 1985; Fowler; Kreps), which I cite from general knowledge and did not open.

## Sources and what was read

| Source | Read |
|---|---|
| Rodriguez, *Emergent Coordination in Multi-Agent Systems via Pressure Fields and Temporal Decay*, [arXiv 2601.08129](https://arxiv.org/abs/2601.08129) | Abstract page and [HTML v2](https://arxiv.org/html/2601.08129v2), through a summarising fetch |
| Pal, Wang, Buehler, *SwarmWorld*, [arXiv 2608.26081](https://arxiv.org/abs/2608.26081) | Abstract page; first 100,000 characters of the [HTML](https://arxiv.org/html/2608.26081) (methods sections cut off) |
| Jones, Hauert, *Emergent Culture in Minimal LLM Systems*, [arXiv 2606.30668](https://arxiv.org/abs/2606.30668) | Abstract page and [HTML](https://arxiv.org/html/2606.30668) |
| Han, Zhang, *Exploring Advanced LLM Multi-Agent Systems Based on Blackboard Architecture*, [arXiv 2507.01701](https://arxiv.org/html/2507.01701v1) | HTML v1 |
| Salemi et al., blackboard for data discovery, [arXiv 2510.01285](https://arxiv.org/abs/2510.01285); Terrarium, [arXiv 2510.14312](https://arxiv.org/abs/2510.14312) | Search result snippets only; not used for any claim above |
| [Blackboard system](https://en.wikipedia.org/wiki/Blackboard_system), [Linda](https://en.wikipedia.org/wiki/Linda_(coordination_language)), [CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) | Wikipedia articles; primary papers (Erman et al. 1980, Hayes-Roth 1985, Shapiro et al. 2011) not opened |
| [LangGraph graph API](https://docs.langchain.com/oss/python/langgraph/graph-api) | Docs page. Behaviour of two parallel writes to a key without a reducer was not on the page and is not claimed |
| [Letta shared memory](https://docs.letta.com/guides/agents/multi-agent-shared-memory) | Docs page; it notes blocks may be deprecated in favour of shared memory repositories |
| [CrewAI memory](https://docs.crewai.com/concepts/memory) | Docs page, plus lab card `research/oss/oss-crewai.md` |
| Claude Code [subagents](https://code.claude.com/docs/en/sub-agents) and [agent teams](https://code.claude.com/docs/en/agent-teams) | Docs pages (subagents: first 100,000 characters) |
| AutoGen, MetaGPT, OpenAI Swarm, OpenAI Agents SDK | Lab cards `research/oss/oss-autogen.md`, `oss-metagpt.md`, `oss-openai-swarm.md`, `oss-openai-agents-sdk.md` (code at pinned commits, read by the lab on 2026-11-07); MetaGPT [abstract](https://arxiv.org/abs/2308.00352) only |
| Park et al., *Generative Agents*, [arXiv 2304.03442](https://arxiv.org/abs/2304.03442) | Abstract only; it does not state the retrieval rule, so the paper is not used above |
| Lab results | `results/batch2-r1-regimes/REPORT.md`, `results/batch2-r2-regimes/REPORT.md`, `research/oss/oss-stigmergic.md` |
