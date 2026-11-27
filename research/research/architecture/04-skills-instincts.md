---
id: arch-04-skills-instincts
title: Skills and instincts for a swarm — packaging, admission, exchange and retirement
area: architecture
evidence: design-study
tags: [instinct, skill, admission, regression-gate, exchange, provenance, expiry]
sources:
  - "Lab runs I1, I2, I5–I14 (results/batch2-i*/REPORT.md), programs/historical/instincts.md, H-I01 to H-I07"
  - "External documentation and papers listed in section 8, fetched 2026-11-11"
related: [H-I01, H-I02, H-I03, H-I04, H-I05, H-I06, H-I07]
updated: 2026-11-11
summary: Existing skill systems select by description and resolve conflicts by source precedence or not at all; the lab's runs say a mixed-capability swarm needs collision checks on triggers, resolution limited to refuse, drop or a one-attribute partition, and a regression gate run in the weakest executor.
---

# Skills and instincts for a swarm

**Evidence level:** design study. Nothing here was run. Each statement is tagged: **[S]** a source reports it, **[L]** a lab run found it, **[I]** my inference, **[P]** my proposal. Lab results are single runs on synthetic tasks, 16 to 32 cases per cell, two models (Haiku 5.5, Sonnet 5.5); I treat them as constraints to design for, not as settled facts.

## 1. Landscape

| System | Unit | Selected into context by | Versioning | Conflict handling | Who installs | Provenance | Context cost |
|---|---|---|---|---|---|---|---|
| Agent Skills (Anthropic; open spec) | Directory with `SKILL.md` (name ≤ 64 chars, description ≤ 1,024) plus scripts, references, assets | Name and description sit in the system prompt; the model reads the body when a request matches the description | Spec: none beyond a free-form `metadata` map. API exposes skill versions | None stated | API: workspace-wide. claude.ai: upload. Claude Code: files | "Use Skills only from trusted sources"; audit advice; no signature field in the spec | ~100 tokens per skill always; body recommended under 5k tokens; bundled files zero until read |
| Claude Code skills | Same, with extra frontmatter (`paths`, `disable-model-invocation`, `allowed-tools`, `context: fork`) | Listing of descriptions; budget of 1% of the context window; on overflow the least-invoked skills lose their descriptions | Via git or plugin | Name clash only: enterprise over personal over project; plugin skills namespaced | User, repository, organisation | Where the file came from | Description capped at 1,536 chars; after compaction 5,000 tokens per skill, 25,000 combined |
| CLAUDE.md, `.claude/rules` | Markdown file | Always loaded; path-scoped rules load on matching files | git | "If two instructions contradict each other, Claude may pick one arbitrarily"; between user and project rules "Claude may follow either one" | Organisation (managed), user, project | File location | Target under 200 lines per file; "context, not enforced configuration" |
| Claude Code plugins and marketplaces | Bundle of skills, agents, hooks, MCP servers listed in `marketplace.json` | As its components | `version`; git `ref`/`sha` pin; `sha256` for archives | Unique names; reserved names against impersonation | User; administrators allow or block marketplaces | Marketplace source; no signing on the page read | As its components |
| Cursor rules | `.mdc` file with `description`, `globs`, `alwaysApply` | Always, by file glob, by the agent from the description, or manual mention | git | "Team Rules → Project Rules → User Rules … earlier sources take precedence" | Team admin, project, user | Scope | Under 500 lines recommended |
| OpenAI Agents SDK | `Agent` object: instructions (string or function), tools, handoffs, guardrails, MCP servers | Fixed by the developer per agent | Only hosted prompt templates carry a version | None on the page read | Developer | None | Whole instruction each call |
| MCP servers | Tool: name, description, input schema, annotations | Client lists tools; all definitions are usually loaded | Registry entries versioned; `list_changed` notification | Unique name per server | User or host | Registry authenticates the namespace (GitHub or DNS) and delegates security scanning; annotations "untrusted unless they come from trusted servers" | Anthropic: five common servers ≈ 55k tokens; tool selection "degrades once you exceed 30–50 available tools"; searching deferred tools cuts the cost "by over 85 percent" |
| Voyager skill library | Executable program | Embedding of its description; top-5 retrieval | None | None | The agent itself, only after a critic verifies the task was completed | Self | Retrieved programs only |
| Agent Workflow Memory; SkillX; Trace2Skill; MASkills | Text workflow or skill induced from trajectories | Selected or retrieved per task | Refinement rounds | Consolidation and pruning named, mechanics not in the abstracts | A pipeline | Trajectories | Varies |
| A2A Agent Card | JSON card listing `AgentSkill` entries (id, name, description, tags, examples) | Read by a client to choose an agent | `version` string | – | Agent owner | Optional JWS signature over a canonicalised card | Not in the worker's context |
| Policy documents (Anthropic constitution, OpenAI Model Spec) | One prose document, trained in | Always | Dated releases | Ordered authority; in the Model Spec a later instruction at the same level supersedes | Model provider | Provider | None at run time |

Notes on the rows **[S]**:

- Voyager adds a skill only when self-verification passes; removing self-verification cut discovered items by 73%. That is an admission test, but it tests that the skill achieves its task, not that it leaves other behaviour intact.
- Trace2Skill's abstract claims skills evolved from a smaller model's trajectories improve a larger one ("up to 57.65 percentage points" on one benchmark, labelled work in progress); SkillX claims a library built with a stronger model helps weaker agents. Neither abstract reports the reverse failure the lab saw: a card written by the stronger model that the weaker one cannot follow.
- A2A advertises skills and delegates tasks; it does not move a skill from one agent to another.
- Both policy documents say instructions inside tool results or documents are information, not commands; in the Anthropic one an orchestrator acts as operator or user for its subagents.
- Prompt Baking (abstract) moves a prompt into the weights. Not usable with models reached through an API **[I]**.
- Marketplaces: one study analysed 31,132 skills and reports 26.1% with at least one vulnerability and 5.2% with patterns suggesting malicious intent. A second confirmed 157 malicious skills among 98,380, by two routes: credential theft through code, and manipulation through instructions in the documentation.
- MCP tool poisoning (Invariant Labs, 2025): instructions hidden in a tool description; a "rug pull" changes it after approval. Recommended: pin and hash.
- IFScale: with 500 simultaneous instructions the best models reach 68% accuracy.
- OpenAI GPTs: the help page returned 403; I do not describe them.

What the landscape has in common **[I]**:

1. Selection is by a description the model matches, or a glob the harness matches. No system compares the triggers of two units at install time.
2. Conflicts are settled by precedence of source, or openly left to the model. Precedence is exactly the device the lab found a small model does not apply (I5, I7, I12).
3. Admission is per installation, never per model. No system records that a unit was verified on one model and not another.
4. Nothing expires. The closest thing is Claude Code dropping descriptions of the least-invoked skills when the listing overflows.
5. All assume one assistant and a human who chose what to install.

## 2. What changes in a swarm

- **Mixed capability.** A card that works in Sonnet can fail in Haiku, and a card written by Sonnet for precision was less usable by Haiku than one Haiku wrote (I11: 1 of 16 against 12 of 16) **[L]**. The author's model is not the executor's model.
- **Peer arrival.** A card in a peer note was never formally adopted (0 of 24 in I1, 0 of 32 in I3, 0 of 96 in I4, as recorded in H-I04) **[L]**, yet on Haiku the verdict followed the note in 30 of 56 exposed cases against 3 of 24 without it (I1, I3) **[L]**. I4 confined that effect to the triage family. Stated refusal is not evidence of non-adoption.
- **Replacement, not addition.** Any installed instinct removed quarantining the agents did unprompted (about half the cases, down to 0), from peer or operator; a sentence preserving judgement restored nothing (I6, I9) **[L]**. Written as a card, the same behaviour fired on 16 of 16 and survived other cards (I10) **[L]**.
- **Collisions, not count.** Twelve disjoint instincts did not interfere (I2); two on the same trigger did, and only inside the overlap (I5, I7) **[L]**.
- **Context budget.** Every agent pays for every card on every call, at about 100 tokens of metadata per skill in the existing format **[S]**.
- **Selection.** With no human curating, cards accumulate; survival has to follow measured use, not how often a card is offered **[I]**.
- **Attack surface.** A hostile card needs no code: the lab's own result is that a rule in context silently removes behaviour for the actions it names. A card can do harm by what it displaces **[I]**.

## 3. Requirements

| # | Requirement | Basis |
|---|---|---|
| R1 | A card has a trigger a program can evaluate, in a fixed vocabulary of observables, alongside the sentence the model reads | I7: interference is local to the overlap, so it can be computed on triggers **[L]**; I14: a pattern-match template passed cards that did not partition **[L]** |
| R2 | A card declares the action it governs (the output field or decision) | I9: agents treat installed instincts as the whole policy "for the actions those instincts name" **[L]** |
| R3 | Collision detection at admission against every card the target agent holds on the same action | I5, I7, I11 (an admission agent found every real collision) **[L]** |
| R4 | Resolution is one of: refuse the newcomer; drop the installed card; one card whose branches are positive values of one stated attribute. No priorities, exclusions, "otherwise" or negated conditions | I5, I7, I12, I13, I14 **[L]** |
| R5 | A regression gate runs the candidate set in the weakest executor that will hold it, on cases, and admits or refuses | I11 (reading the card is not enough), I14 (same six sets admitted on both admission models, all six narrow ones refused) **[L]** |
| R6 | The gate also checks that the newcomer does something | I14: the newcomer's action outside the collision was kept in 12 of 48 cases **[L]** |
| R7 | Held-out cases, unseen by the author and the admission agent | I14: 1 of 12 admitted sets slipped on held-out cases **[L]** |
| R8 | Enough cases for a stable decision | I12: the solo baseline moved between 11 and 13 of 16 and made the run inconclusive **[L]** |
| R9 | Behaviour worth keeping is captured as a card before the first card is installed | I6, I9, I10 **[L]** |
| R10 | Two channels. Only the operator channel writes to an agent's context. Peer offers go to a store the working agent does not read | I1, I3, I4, I6 **[L]**; both policy documents **[S]** |
| R11 | Admission is recorded per model tier and model version; a card admitted for a large model is not admitted for a small one | I5, I7, I11 **[L]** |
| R12 | Content hash, author, signature, and the gate runs as evidence | Rug pull and marketplace studies **[S]** |
| R13 | Expiry and telemetry: did it fire, was the firing right | H-I05 (untested); usage-ranked listing in Claude Code **[S]** |

## 4. Candidate designs

### Card schema (shared by all three) **[P]**

```yaml
id: quarantine-lone-unverified
version: 3
hash: sha256:…                 # over the canonical card; any edit is a new version
kind: instinct                 # instinct (standing rule) | capability (on-demand procedure)
governs: [quarantined, verdict]      # actions/fields this card names (R2)
observables: [n_unverified, contradicts_verified, verified_disagree]
trigger:
  text: "exactly one record is unverified and it contradicts the verified records on the same indicator"
  predicate: "n_unverified == 1 and contradicts_verified"       # evaluated by code (R1)
action:
  text: "leave it out of claims, list its id in quarantined, decide from verified records"
partition:                     # optional; at most one attribute, positive values only (R4)
  attribute: indicator_class
  branches: {critical: "<action text>", other: "<action text>"}
not_applicable:
  predicate: "verified_disagree"
cases:
  fire: cases/qlu-fire.jsonl          # author's examples; held-out cases stay with the admitter
  no_fire: cases/qlu-clean.jsonl
provenance:
  author: agent:murmur-7@operator-a
  parents: []                  # cards this one replaces or was derived from
  channel: operator            # operator | peer
  signature: <JWS over hash>
admission:                     # one record per tier; absence means not admitted (R11)
  - {model: claude-haiku-5-5, gate_run: g-0412, installed_kept: 61/64,
     own_effect: 58/64, wrong_firings: 0/64, held_out: pass, date: 2026-11-11}
expiry: {ttl_days: 30, renew_on: confirmed_firing}
telemetry: {fired: 0, confirmed: 0, contested: 0}
status: offered                # offered | quarantined | shadow | admitted | retired
cost_tokens: 74
```

The counts in the example are placeholders for the format, not results.

### Design A — registry with an admission pipeline

One registry per operator. Agents do not install; the harness composes each agent's context from admitted cards for its role and tier.

1. **Verify.** Schema, hash, signature, known author. Otherwise refuse.
2. **Lint.** Predicate parses over the declared observables. One action, or a partition on one attribute with positive values. Reject cards whose text contains priority, exclusion, "otherwise" or a negated branch.
3. **Collide.** For each installed card sharing a `governs` entry, compute whether both predicates can hold on one case (enumerate the case generator; ask an admission agent as a second, conservative opinion). I11's control shows that "no overlap on our cases" is not "no overlap".
4. **Resolve.** Disjoint: continue. Overlap: refuse the newcomer by default; replacing the installed card or writing a partition needs the operator.
5. **Capture.** Run the executor with no cards on the gate cases. Any behaviour on the `governs` actions that the operator wants is written as a card and admitted first (R9).
6. **Gate, per tier.** In the weakest executor: installed set alone against installed set plus candidate. Admit only if installed cards keep their effect within a margin, there is no wrong firing on clean cases, and the candidate fires on its own cases (R5, R6).
7. **Held-out.** Repeat on cases the author never saw.
8. **Install** with a tier stamp and an expiry. Admission for a higher tier does not propagate downward.
9. **Retire** on expiry without confirmed firings, on contested firings above a bar, and on any model version change (re-gate). Removal goes through the gate as well: removing a card changes what the others do **[I]**.

Strength: a failed merge costs nothing, because the fallback is the installed set (I14). Weakness: a case suite per action; a card with no cases cannot be admitted.

### Design B — peer exchange with quarantine

For swarms under several operators, or with no central registry.

- `OFFER {id, hash, governs, trigger.text, author, signature, admissions}` is sent to the peer's **harness inbox**, never into its work stream. This follows from I1 and I6: the working agent must not see the offer.
- `FETCH` pulls the card into a quarantine store, status `quarantined`.
- The recipient runs steps 1–7 of Design A locally, with its own installed set, its own cases and its own weakest executor. The donor's cases and admission records are hints, not evidence.
- On a pass, the recipient's operator key re-signs the card; from then on it is an operator-channel card. `RECEIPT {hash, tier, result}` is returned and may be gossiped. Independent receipts are the only reputation.
- On a fail: `REFUSE {hash, reason}`. No merge is ever written by a peer.
- `REVOKE {hash}` from an author or an admitter triggers a local re-gate; it never removes a card by itself, because a forged revocation of a protective card is an attack **[I]**.
- **Shadow** (H-I06, untested) cannot mean "put the card in context and ask the agent to report", because presence in context is what changes behaviour (I6). It has to be a duplicated call or a harness-evaluated predicate **[I]**.

Strength: no shared authority. Weakness: every recipient pays for the gate, and colluding peers can inflate receipts.

### Design C — triggers in the harness

The harness evaluates `trigger.predicate` on each input and injects a card's action only when it fires. Collisions become exact (two predicates true on one input) and the context cost of a non-firing card is zero. Whether this avoids the replacement effect is unknown: the rule is absent on the cases where it does not fire, which is where unprompted behaviour was lost **[I]**. It applies only where observables can be computed from structured input.

**Conventional baseline for all three:** one consolidated policy document per agent, written and reviewed by the operator, as in CLAUDE.md or Cursor rules.

## 5. Analogies from biology

Each is an analogy. The biology is textbook knowledge and was not re-read for this study.

- **Innate and learned behaviour.** Innate behaviour arrives with the organism; learned behaviour is acquired and can be lost. *Suggests:* two card classes with different lifetimes: operator-installed cards without expiry but re-gated on model change, exchanged cards with expiry. *Limit:* an LLM's "innate" behaviour is displaced by the first rule (I9); nothing comparable is implied for animals.
- **Social learning.** Animals copy selectively (successful individuals, frequent behaviours). *Suggests:* adoption driven by evidence of outcome (receipts), not by the insistence of the sender; I3 found that three agreeing peers produced no formal adoption **[L]**.
- **Immune tolerance and negative selection.** Lymphocytes that react to the body's own molecules are removed before release; tolerance continues in the periphery. *Suggests:* the regression gate (test the newcomer against "self" before release) plus telemetry afterwards. *Limit:* "self" here is only the behaviour that has been written down and has cases.
- **Horizontal gene transfer.** Bacteria acquire plasmids from others; restriction systems cut unmarked DNA; plasmids cost something to carry and are lost without selection; plasmids that share replication control do not coexist stably. *Suggests:* the re-signature as the mark of what has been admitted, expiry as the carrying cost, and collision as incompatibility: one of the two is lost. *Limit:* bacteria are selected over generations of failures; a swarm cannot afford them.

## 6. Hypotheses for the batch instrument

| id | Variable | Endpoint | Conventional baseline |
|---|---|---|---|
| S1 Tiered admission | Model in which the gate ran (large / small); executor small | Installed-card effect on held-out cases after admission | One admission for all tiers |
| S2 Cards against a document | Same N rules (12, 24, 48; k planted collisions) as gated cards / as one consolidated policy document | Target effect, wrong firings, input tokens | The document |
| S3 Harness triggers | Card always in context / injected only when the predicate holds | Unprompted behaviour on cases where no card fires (lab baseline about half; 0 with any card installed) | Always in context |
| S4 Capture first | No capture / automatic capture of unprompted behaviour as cards / preserving sentence | Unprompted behaviour kept after an unrelated card is installed | Preserving sentence (0 of 16 in I9) |
| S5 Out-of-band offers | Offer as a note in the work stream / to a harness inbox | Verdict shift and loss of unprompted behaviour on the small model | In-stream note (30 of 56 against 3 of 24) |
| S6 Hostile cards | Planted cards: harmful action; trigger wider than its cases show; card that names an action only to displace it | Share admitted by reading alone / gate / gate plus held-out / plus shadow | Admission agent reading the card |
| S7 Gate size | Gate cases per cell: 16, 32, 64 | Rate at which the admit or refuse decision flips across resamples | 16 (as in I12, I14) |
| S8 Expiry | Permanent / time-to-live renewed by confirmed firings, under a change that makes the card wrong | Wrong firings after the change; effect lost while still valid | Scheduled manual review (H-I05) |

## 7. What is unknown

- Whether any of this holds outside one behaviour (quarantining an unverified record) in three parallel task families. Every lab result above rests on that one instinct.
- Whether the one-action or one-attribute limit is a property of small models or of Haiku 5.5. One small model was tested.
- How disjoint cards behave beyond twelve, and whether progressive disclosure changes it. IFScale suggests degradation at high counts **[S]**, on a different task.
- What a collision is for procedural skills (a `SKILL.md` body), where triggers are descriptions rather than predicates. R1 may not be achievable there.
- Whether a partition written by an agent can ever pass: in I14 both models wrote the second branch as a negation and all six narrow sets were refused.
- Whether replacement happens when the rule is injected just in time (S3), and whether a duplicated-call shadow predicts live behaviour.
- The cost of the gate at realistic case counts, and who writes held-out cases for a situation nobody has cases for.
- Whether receipts resist collusion, and how short-lived agents hold keys.
- Whether agents under one operator need exchange at all once a registry exists.

## 8. Sources and what was read

Read through a fetch tool that returns page text or a summary of it; where only an abstract or a search result was seen, it says so.

- Agent Skills overview, full page: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- Agent Skills specification, full page: https://agentskills.io/specification
- Claude Code skills, summary of the first part and the full troubleshooting section: https://code.claude.com/docs/en/skills
- Claude Code memory (CLAUDE.md), full page, quotes checked in the text: https://code.claude.com/docs/en/memory
- Claude Code marketplaces, both full pages: https://code.claude.com/docs/en/plugin-marketplaces and https://code.claude.com/docs/en/plugins/marketplace-reference.md
- Cursor rules, summary: https://cursor.com/docs/context/rules
- OpenAI Agents SDK, agents page, summary: https://openai.github.io/openai-agents-python/agents/
- OpenAI Model Spec (2025-12-18), summary of the first 100,000 characters: https://model-spec.openai.com/2025-12-18.html
- Anthropic constitution, summary of the first 100,000 characters: https://www.anthropic.com/constitution
- MCP tools specification (2025-06-18), full page: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- MCP Registry, about page, full: https://modelcontextprotocol.io/registry/about
- Invariant Labs, tool poisoning, summary: https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks
- Tool search tool, full page: https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
- A2A specification, summaries of two segments (AgentSkill, card signing): https://a2a-protocol.org/latest/specification/
- Voyager, abstract and summary of the paper body: https://arxiv.org/abs/2305.16291
- Agent Workflow Memory, abstract: https://arxiv.org/abs/2409.07429
- SkillX, abstract: https://arxiv.org/abs/2604.04804
- Trace2Skill, abstract: https://arxiv.org/abs/2603.25158
- MASkills, abstract: https://arxiv.org/abs/2609.02094
- Prompt Baking, abstract: https://arxiv.org/abs/2409.13697
- IFScale, abstract: https://arxiv.org/abs/2507.11538
- Agent Skills in the Wild, abstract: https://arxiv.org/abs/2601.10338
- Malicious Agent Skills in the Wild, abstract: https://arxiv.org/abs/2602.06547
- Not read: OpenAI GPTs help page (HTTP 403). RAG-MCP (https://arxiv.org/abs/2505.03275) appeared only in a search result and is not used.
