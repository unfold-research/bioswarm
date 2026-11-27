---
id: arch-05-allocation-budget-verification
title: "Work allocation, budget and verification in a swarm runtime: a design study"
area: architecture
evidence: hypothesis
updated: 2026-11-11
related: [H-06, H-24, H-26, H-16, H-20, H-27, allocator, oss-patterns, lit-frugalgpt, lit-routellm, lit-snell-test-time-compute, lit-scaling-agent-systems, lit-sas-equal-thinking-budget]
summary: "The allocator should be code, not an agent: a budget ledger, a board of claimed units, and a per-unit ladder (one reasoning agent, a verifier that reads the sources, escalation to a stronger model). Collectives and orchestrator calls are exceptions that a measured trigger must justify."
---

# Work allocation, budget and verification in a swarm runtime

The question: when there is no lead agent, or the lead agent is one option among several, what decides which agent does what, with how much reasoning, on which model, and who checks it?

Four labels are used throughout. **Reported** is what a source says. **Lab** is what this repository's runs found. **Inferred** is my reading. **Proposed** is a design choice not yet tested.

How sources were read. Repository cards (`research/literature/`, `research/nature/`, `research/oss/`) were read as cards; I did not reopen their papers. For sources without a card I read the arXiv abstract page or a search-result summary through a fetch-and-summarise tool, never a PDF. Each is marked. Numbers from those should be checked against the paper before being cited in P1.

## 1. Landscape

| Family | What it assumes | What it costs | Matched-cost comparison with one agent? |
|---|---|---|---|
| **Orchestrator/worker, planner/executor** (AutoGen, CrewAI, LangGraph supervisor, MetaGPT, Agents SDK: `research/oss/MATRIX.md`; Anthropic's research system) | A model can decompose the job and write task descriptions good enough to prevent overlap | One or more model calls per assignment, plus the lead re-reading every return. Reported by Anthropic: agents use about 4× the tokens of chat and multi-agent systems about 15×; early versions spawned 50 subagents for simple queries and duplicated work ([post](https://www.anthropic.com/engineering/multi-agent-research-system), read through a summariser) | Mostly no. Card `lit-scaling-agent-systems` (matched tokens, 260 configurations): from +80.8% to −70% against one agent, negative once the single agent passes about 45%. Card `lit-sas-equal-thinking-budget`: one agent matches or beats five architectures at equal reasoning tokens. Lab: R1, orchestrator equals a fixed schedule at +11% cost |
| **Routing before generation** (RouteLLM, card; Hybrid LLM, [abstract](https://arxiv.org/abs/2404.14618): "up to 40% fewer calls to the large model", ICLR 2024) | Difficulty can be predicted from the query; a trained router and in-distribution data exist | One small classifier per query; training data | Compared with always-large and always-small, which is the right baseline for routing. Not with one agent given working space |
| **Cascades after generation** (FrugalGPT, card; AutoMix, [abstract](https://arxiv.org/abs/2310.12963): few-shot self-verification plus a POMDP router, "over 50%" cost reduction at comparable performance, NeurIPS 2024; Dekoninck et al., ICML 2025, [arXiv 2410.10347](https://arxiv.org/abs/2410.10347), search summary only: routing and cascading unified, quality estimators named as the critical factor) | A cheap answer is usually right, and something can tell when it is not | The cheap call always; the check; the expensive call on a share | Against always-large, yes. Lab: M6 and V7 are this family with an untrained verifier |
| **Test-time compute allocation** (Snell et al., ACT, s1, inverse scaling: cards) | Difficulty per prompt can be estimated; more reasoning is monotone | Tokens | Snell (card): allocating by difficulty matches best-of-N with up to about 4× less compute; on hard problems a larger model is worth more. Inverse scaling (card): more reasoning can lower accuracy on constructed tasks |
| **Self-consistency with early stopping** (Adaptive-Consistency, ESC: cards) | Samples differ and errors are not shared | 3.2× fewer samples on average (card), far less saving where the model is unreliable | Against fixed-N voting, not against one deeper call. Lab: V1b, error correlation 0.79 among identical samples; V6, a vote hurt when most samples were wrong |
| **Debate** (cards `lit-debate-or-vote`, `lit-stop-overvaluing-mad`, `lit-debate-routing-matched-ceiling`) | Interaction corrects errors | Several rounds × agents | Cards: voting beats the debate variants tested; debate beats CoT in at most about 15 to 20% of scenarios; cheap signals recover 11 to 19% of the oracle gain of choosing a protocol per example because most debate-useful cases have a unanimous wrong vote |
| **Cost-aware evaluation** (Kapoor et al., *AI Agents That Matter*, [abstract](https://arxiv.org/abs/2407.01502)) | — | — | The abstract argues agents are "needlessly complex and costly" and proposes jointly optimising accuracy and cost. Lab (`STATE.md`, machine triage): 16 of 200 full-text library cards compare at matched compute |

Classical distributed scheduling, with the same three questions:

- **Work stealing** (Blumofe and Leiserson, JACM 1999, search summary): idle workers take work from busy ones; expected time T1/P + O(T∞) for fully strict computations. Assumes tasks are cheap to move and workers are interchangeable. Cost: a steal attempt. Useful here as the pull rule: idle agents pull, nobody pushes.
- **Leases** (Gray and Cheriton, SOSP 1989, search summary): a time-limited claim; failures affect performance and not correctness, and short leases are near-optimal. Assumes roughly synchronised clocks. Cost: renewals. Already seen in OSS (`PATTERNS.md` P7: atomic claim, lease, dead-letter).
- **Contract net** (Smith, IEEE Trans. Computers 1980, search summary): announce, bid, award; a contractor may sub-contract. Assumes bidders know their own fitness. Cost: one message per bidder per task. With LLM agents every bid is a paid call.
- **Market and auction allocation** (Gerkey and Matarić, IJRR 2004, search summary): multi-robot task allocation is an instance of optimal assignment when tasks are independent. Assumes utilities can be estimated. I found no study of LLM agents' ability to bid a calibrated utility.
- **Randomised load balancing** (Mitzenmacher, IEEE TPDS 2001, search summary): sampling two queues and picking the shorter gives an exponential improvement over one; three adds a constant factor. A cheap consensus-free rule for choosing among candidates.
- **Token-bucket budgets**: a standard rate limiter (tokens accrue at a rate up to a cap; a request spends them or waits). No source read; used below only as a mechanism.
- **Reserve capacity**: Erlang C is strongly nonlinear near saturation. Lab, in the model: `sims/sim-reserve.mjs`, one reserve agent near saturation cuts p95 wait 92%; no gain below utilisation 0.5. Halfin and Whitt (Operations Research 1981, search summary) give the square-root staffing regime: capacity = load + a multiple of its square root.

None of the classical results was measured on LLM agents. They assume a task's cost is known or cheap to observe; for an LLM agent the cost of *deciding* is the same currency as the work.

## 2. Biology as a source of rules (analogy only)

All five entries are analogies from `research/nature/` cards. None is evidence that the rule works for LLM agents.

| Phenomenon (card) | Engineering rule | Status in the lab |
|---|---|---|
| **Response thresholds** (`nat-response-threshold`): an individual takes a task when its stimulus passes a personal threshold | An agent claims a unit when a *measured* stimulus on that unit passes its threshold; thresholds are staggered so the number of agents grows with the stimulus. The stimulus must be computed by code or by a check, not self-reported | In the model: `sim-response-threshold`, 5 of 5 predictions; beats a dispatcher once messages cost or information is late. H-06 untested on real models. Its own condition: the stimulus must predict difficulty (AUC about 0.75) and cost under 10% of a task |
| **Task switching with quit probability** | An agent releases a claim when the stimulus falls or its lease ends; no agent holds work by default | Model only |
| **Idle reserve** (`nat-inactive-reserve`) | Hold back part of the *budget*, not idle agents: LLM agents cost nothing while idle, money does. The reserve pays for escalations and re-reads | Model only (H-26) |
| **Recruitment proportional to quality** (`nat-waggle-dance-recruitment`; `nat-recruitment-benefit-conditions`: helps when sources are few, poor and variable, can hurt when abundant) | A finding raises the priority of neighbouring units in proportion to a checked score | Lab: R2, alarm rule 0.72 against best fixed schedule 0.53, with locality built into the task |
| **Cross-inhibition** (`nat-stop-signal-cross-inhibition`) | A verified rejection lowers the priority of duplicate or contradicted work and cancels its children | H-27, untested |

Inferred: the biology contributes one idea the engineering literature underuses, which is allocation by a stimulus on the work, read locally, with no message to a coordinator. It contributes nothing on verification or on model choice.

## 3. Requirements derived from the evidence

**R1. Budget is an object, reserved before spending.** Proposed: a ledger with one account per job and sub-accounts per unit. Each call reserves its worst case (input tokens × price + `max_tokens` × price) and settles on return. `PATTERNS.md` P2 found no inspected framework that admits before the call. The lab's own `global-budget.json` and `allocator/` (ceiling checked before every call) already do this at task level. Units: tokens for control, dollars for reporting (VOCABULARY: matched cost is priced tokens).

**R2. Budget is visible to agents as a signal, and enforced by code.** Proposed: the prompt carries the working allowance for this call; the cap is `max_tokens`. Lab: V3's deep arm was probably capped by a 512-token limit (0.63 at 144 records, 0.90 in M7 once lifted), so a hidden cap that truncates is worse than a stated one. Unknown whether showing the *remaining job budget* changes behaviour.

**R3. Default: one reasoning agent per unit of work.** Lab: V2 (0.58 to 0.97 with about twenty words), V6 (0.52 to 0.94), and no collective of copies beat a deep member beyond noise (M8, V7). The first increment of budget on any unit goes to working space for one agent.

**R4. A collective needs a trigger.** Proposed triggers, all computed outside the agent: a verifier rejection; a unit that exceeds one context; independent parts (the `allocator/` v0 rule, split from three parts, from LAB-003). Not a trigger: "the task looks hard" judged by the worker.

**R5. Verification routes; it does not vote.** Lab: verify beats vote at equal calls on two tasks (V3, V6); selection among copies adds nothing once members are deep (V7); escalation of rejected answers took 0.64 to 0.87 with the larger model called on 44% of tasks (V7). The verifier needs working space (M6: 0.61/0.69 to 1.00/0.96) and must read the sources, not the report (Murmur round: 48 of 48 against close to useless). Its quality falls with difficulty (V7: accepts 0.72 of correct, rejects 0.81 of wrong), so the false-accept rate is the ceiling of the cascade (M5).

**R6. Known structure gets a schedule; scarce or unknown structure gets a local rule on a signal.** Lab: R1 and R2 as stated in STATE. The allocator must therefore know, per job, whether parts are enumerable and whether the budget covers them. That is arithmetic.

**R7. Termination and cancellation are code.** Model: `sim-branching`, backlog diverges when children per job × (1 − cleanup) ≥ 1. Internal case (`internal/openbot-case/F1-REPORT.md`): 15% of requests were delegated and cost 51% of spend; 25 ping-pong trees cost 42%, chains up to 34 hops. Proposed: every spawn is charged to the parent's sub-account, depth is bounded, a job ends on the first of accepted / budget / turn ceiling / stagnation (`PATTERNS.md` P1), and cancelling a unit cancels its descendants and releases their reservations.

**R8. Code computes; models produce and check.** Proposed split:

| In code | Asks a model |
|---|---|
| Ledger, reservation, settlement | Doing a unit of work |
| Partition when parts are enumerable; schedule | Checking an answer against sources |
| Claim, lease, expiry, dead-letter | Decomposing a job whose parts are *not* enumerable (once, budgeted, output validated) |
| Stimulus (rejections, disagreement, alarms, size), thresholds, escalation | — |
| Stop, cancel, depth and fan-out limits | — |
| Decision log with reasons | — |

## 4. Candidate designs

Prices below are the lab's batch list prices for the two models used (V7: small deep call [US$ redacted] large call [US$ redacted]). Expected costs are my arithmetic from those, not measurements.

### A. Ladder: one deep agent, a source-reading verifier, escalation

Rules, per unit:
1. Run one small-model agent with working allowance *w*.
2. If a mechanical check exists (tests, schema, arithmetic), use it and skip step 3.
3. Run a small-model verifier with working space on sources + answer. Accept → done.
4. Reject → send the unit to the larger model with working space. Do not resample the small model (M5, V7: resampling and rewording add nothing).
5. If the larger model's answer is also rejected, mark `unverified`; never return a silent fallback (`PATTERNS.md` A9).
6. Skip step 3 when recent accept rate on this unit type is above a set level and stakes are low (M8: a verifier behind a deep agent at 0.94 added +0.01).

Expected cost (inferred from V7): about 0.0004 + 0.0004 + 0.44 × 0.0078 ≈ [US$ redacted] per unit against 0.0078 for always-large, at 0.87 against 0.90.
Failure modes: false accepts set the ceiling; verifier and worker share causes of error when they are the same model (M8: caught about half of a deep agent's errors, on five errors); a task where checking is as hard as doing (V7); escalation share drifts up unnoticed.
Needs from storage: sources addressable by the verifier; the worker's answer and working; per-type accept and escalation rates. From channels: none between agents.

Inferred caveat that the lab should test first: in V7 difficulty tracked size. A code rule "send 144 and 168 records to the large model" would call it on 67% of tasks and, from the V7 table, score about (1.00 + 0.87 + 0.83)/3 = 0.90 with no verifier calls. The verifier cascade got 0.87 at 44%. A verifier earns its place only where no cheap observable predicts difficulty.

### B. Board: claims, leases, response thresholds

State: a table of units `{id, status, stimulus, lease_until, owner, attempts, budget_reserved}`.
Rules:
1. Units enter by partition (code) or by one budgeted decomposition call.
2. If the units are enumerable and budget ≥ full coverage: assign by fixed schedule; skip the rest (R1).
3. Otherwise each idle agent samples two open units and claims the one with the higher stimulus, if stimulus ≥ its threshold; the claim is atomic and carries a lease.
4. Stimulus is code: base priority + alarms on neighbours (R2) + verifier rejections − age-weighted decay. Agents deposit observations; they do not set priority.
5. A lease that expires returns the unit; after *k* returns it goes to dead-letter as an explicit failure.
6. Each unit runs the ladder (A) inside its claim.
7. A fraction of the job budget is held as reserve and released only to escalations and alarm-driven re-reads.

Expected cost: coordination is database writes; model spend equals the units' ladders. Against an orchestrator: R1 measured +11% for the router's calls on a small job; the internal case shows the tail is far worse.
Failure modes: coverage left to chance (R1: undirected stigmergy 17 to 18 of 30); a stimulus that does not predict where work is needed (R2's advantage came from built-in locality); thresholds set by hand; starvation of low-stimulus units; false alarms (none in R2's stable condition, one task).
Needs from storage: atomic compare-and-set, a clock for leases, an append-only decision log. From channels: none; the board is the channel.

### C. Budgeted market

Rules: units are announced with a reserve price (the sub-account); agents bid expected cost and confidence; the award goes to the best ratio; payment is settled on verified acceptance.
Expected cost: one bid call per bidder per unit, before any work. With five bidders and a small-model deep call as the unit of work, bidding alone can exceed the work.
Failure modes: no evidence LLM agents bid calibrated costs (unknown, not negative); bids are a new channel for the ping-pong the internal case measured; copies of one model have nothing to differentiate their bids.
Needs: a messaging channel, bid storage, settlement.

Proposed: keep C's settlement idea (pay on verified acceptance, charge spawns to the parent) and compute "bids" in code from measured per-type accept rates and prices, which turns C into B's stimulus function. A model-bidding market is worth a test only with heterogeneous agents.

## 5. Hypotheses for the batch instrument

| # | Variable | Endpoint | Conventional baseline at matched cost |
|---|---|---|---|
| A1 | Escalation trigger: verifier rejection / input-size rule in code / disagreement of two samples / random at the same share | Accuracy at equal share of large-model calls, and US$ per correct answer | Always-large on a random subset of the same size; always-large on all |
| A2 | Verifier model: same as worker / larger / same model, different sources view | False-accept rate on the worker's own errors | One worker call with the verifier's tokens added to its working allowance |
| A3 | Budget signal: allowance stated / hidden cap / remaining job budget shown | Accuracy, truncation rate, overshoot against reservation | Fixed word limit at the same mean output tokens |
| A4 | Regime under scarce budget with scattered edits and with unknown parts (R2b, R3): fixed schedule / board with thresholds / orchestrator | Correct collections; edited parts re-read; US$ | Best fixed schedule, and one deep agent holding the whole budget |
| A5 | Spawn rule when workers may propose subtasks: free / charged to parent / depth limit | Measured children per job, calls per root, accuracy | One agent, no spawning, same budget |
| A6 | Reserve: 0%, 20%, 40% of budget withheld for escalation | Accuracy at fixed total spend | All budget spent on first-pass working |
| A7 | Verifier skip rule (ladder step 6) by trailing accept rate | Accuracy lost per verifier call saved | Verify everything; verify nothing |

A1 and A4 decide between designs; A5 is the only test of R7 on real models.

## 6. Unknown

- Whether any of this holds off two synthetic tasks that share a record format, single runs of 30 to 90 tasks. Coding and open research tasks are untested on these questions.
- Verification when the answer does not follow from the input (no sources to re-read), and when the verifier shares the worker's blind spot. M8's five errors cannot settle it.
- Whether a cheap stimulus predicts difficulty on real work. The card `lit-debate-routing-matched-ceiling` reports that vote entropy recovers 11 to 19% of the oracle gain; H-06's own AUC condition is unmeasured.
- Written working against the provider's thinking mode. Sonnet's arms mixed both; the small model's had thinking disabled.
- Latency. Every result here is accuracy and dollars; the reserve and work-stealing results are about waiting time, which the batch instrument does not measure.
- Prompt caching changes the price of re-reading, which is the main cost of a verifier and of a vote. Not accounted for in any run.
- Whether agents can bid, estimate their own cost, or respond sensibly to a remaining-budget signal.
- Thresholds: every candidate has hand-set parameters; `allocator/` v0 says the same of itself.
- R2's orchestrator result is confounded; R2b is running and unreported at the time of writing.

## Recommendation

Proposed: build B with A inside it, in code, extending `allocator/` v0 (which already has the split rule, repair of failing parts only, stop on resolution, gate and ceiling) with a reservation ledger, leases, a model ladder and a code-computed stimulus. Treat the orchestrator as one optional decomposition call, not as the runtime. Run A1 before investing in the verifier, because a size rule may do the routing for free.
