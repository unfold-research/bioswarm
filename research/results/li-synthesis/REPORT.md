# LI synthesis: coordination of LLM members on coupled work (2026-11-17, updated through LI11)

**Update after LI11.** The first part of this page (LI1 to LI6) is kept as written; its central negative, "no swarm arm finished a task", held only for LI1 to LI6 and was overturned by LI7. The part "LI7 to LI11" below states what changed. Current one-page view: `FINDINGS.md`. Verdicts: `results/li-verdicts.json` (registered and post hoc readings separately).

## LI7 to LI11: real code, bio against market coordination

Five studies on executed JavaScript codebases (5 to 80 modules, one member per module), [US$ redacted] in the shared ledger (LI7 4.79 + pilot 0.46, LI8 1.37, LI9 0.85, LI10 6.58, LI11 4.70), three independent reviews (LI7, LI10, LI11; LI8 and LI9 reviewed retrospectively).

| Claim | Evidence | Hypotheses |
|---|---|---|
| A swarm can finish coupled work: the geometry router solved 12 of 12 (Sonnet) and 20 of 20 (Haiku) codebases at 5 and 12 modules | LI7, LI8 | H-LI20, H-LI24 |
| Leaderless conversation never finished (0 of 68 codebases): both sides of a format conflict adopt the other's format in the same round | LI7 to LI10 | H-LI29 (router beats chat) |
| A manager agent (the market's hierarchical pattern) matched or beat the router, and was cheaper: 19 against 17 of 20 at 5 and 12 modules; 13 against 5 of 16 at 40 and 80 modules under the strict check | LI9, LI10 | H-LI25, H-LI26, H-LI28, H-LI31 refuted |
| The router's losses were caller workarounds: on a directed edge it woke both sides and the caller coded around a wrong helper; the run fed back a check that accepted this (review) | LI10 review | H-LI28 (post hoc reading) |
| Polarity (requirement delivered only to the helper's owner, caller not woken) removed workarounds: 15 of 16 against the manager's 11, but the requirement was written by the harness (an oracle) | LI11 and review | H-LI33 (post hoc: not as worded), H-LI34 inconclusive, H-LI35 |
| One agent with every specification still solved every case whose reply fit its output limit, up to 80 modules | LI7, LI8, LI10 | H-LI21, H-LI23, H-LI30 refuted |

What this changes: the question is no longer whether a swarm can finish (it can) but which coordination wins at equal N. So far a central manager wins on small exact tasks it can hold in view; the one natural mechanism that beat it (polarity) did so with an oracle trace. LI12 tests polarity alone and agent-written traces with one strict check for feedback and scoring.

## LI1 to LI6 (as written after LI6)

Six preregistered studies (LI1 to LI6), 156 paired cases, about 35,000 Claude Haiku 5.5 calls through the Message Batches API, [US$ redacted] of returned usage (LI1 6.24, LI2 10.86, LI3 5.04, LI4 2.07, LI5 13.16, LI6 11.96, plus about 1 of pilots outside the ledger), an independent methodology and positioning review (`docs/reviews/LI-REVIEW-2026-11-17.md`), a classical non-LLM reference and a model-agnostic kernel (`experiments/fold-field/`). Each study has its own report; this page states what holds across them.

## The search and what it did not find

The aim was an "element X": a bio-inspired coordination mechanism that makes a swarm of small LLM members beat strong alternatives on complex coupled work. Candidates tried, in order: shuffled redundancy against reading error (dropped in pilots: Haiku 5.5 made 0 errors in 960 record reads), lateral inhibition (works, but random activation does as well and both are classical distributed constraint satisfaction), stimulus-centred recruitment (turned out to be one agent on a window), typed requests left on the field (between silent rules and conversation, inconclusive), and routing each conflict by its geometry (beats silent rules, does not beat conversation). **No mechanism made any swarm arm finish a task: 0 cases solved to zero violations by any swarm arm in any study.** The single agent remains best wherever the task fits it.

## What holds (replicated, paired, sign-tested)

1. **Coupling geometry decides the protocol.** No coordination protocol won on every task.
   - **Symmetric conflicts** (either side can fix them: colouring, shared machines): simultaneous repair oscillates, and LLM members inherit this classical pathology. Breaking the symmetry cuts residual conflicts about threefold: LI1 36/36, LI3 24/24, LI6 18/5. Random activation does as well as targeted inhibition, and free conversation does not cure it (silent rule below conversation 24/24 on colouring, LI3).
   - **Directed conflicts** (dependencies: one side should move toward a target): conversation helps (LI2 18/6, LI5 20/3, LI6 18/5 against simultaneous repair). Inhibition adds nothing there (LI2 10/13, LI5 11/12), and forcing one side to hold while talking destroys the gain (LI5 4/20).
   - This bounds the general claim that field coordination beats conversation (arXiv:2601.08129, one domain, 1 to 4 agents). The result depends on the geometry of the coupling.
2. **Past one agent's capacity, a windowed repairer beats a whole-problem agent.** At 240 nodes, an agent given a 40-node window around the conflicts ended below an agent given the whole graph in LI1 12/12 and LI4 10/1. The whole-problem agent often declined or truncated. This is a statement about context, not about swarms.
3. **Below capacity, one agent wins.** The agent planning from scratch solved 12/12 at 60 nodes and 6/12 at 96 items. No swarm arm solved any case.

## What may be said, and how

- Defensible, internally: "Coordination for LLM agents is not one protocol. Conflicts where either side can yield need an arbiter, not a chat. Conflicts with a direction need the parties to talk. Neither rule alone makes a team finish."
- Not defensible: "our swarm beats single agents", "bio-inspired lateral inhibition", "field beats chat", or any figure in public material (plan D-021). All evidence is synthetic, from one model family, with a fixed 5 to 16 round horizon, and the same lab preregistered, ran and reviewed it.
- For Fold: route each conflict by its geometry (`experiments/fold-field/README.md`), and keep one agent when the work fits one context.

## What would raise it

A second model family; a real coupled task (multi-module code change with interface tests, or a multi-author spec with cross-references); a tuned conversation protocol; classical solver baselines where they apply; and a finishing mechanism. The tail is the open problem: residual conflicts stall at a few per hundred parts under every rule. Escalating the residual to one agent with the whole remaining conflict set is the obvious untested hybrid.
