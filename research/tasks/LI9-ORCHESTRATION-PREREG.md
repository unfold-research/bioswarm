# LI9 preregistration: the bio-inspired router against a manager agent at equal N (2026-11-17)

**Status:** registered 2026-11-17 by the research lead after LI7 and LI8 (k = 12), before any LI9 result. It replaces a capacity-sweep draft (router against one agent at 40 and 80 modules) that was withdrawn unrun on the owner's direction: the lab's question is N agents with bio-inspired coordination against N agents with the coordination people ship, not swarm against one agent. Claude **Haiku 5.5** (default adaptive thinking), Message Batches API, shared ledger. Domain `observatory/batch2/rc/code.mjs` (adds only `managerRequest` and an instruction line in `memberRequest`; instances unchanged), runner `run-rc2.mjs`, configs `li9-k5.json` and `li9-k12.json` (study caps [US$ redacted] and [US$ redacted]; the ledger's [US$ redacted] cap also binds), analysis `analyze-rc.mjs` per size and `analyze-li9.mjs` for the verdicts.

## Why

LI7 and LI8: at equal N, the geometry router (on a symmetric failing edge one side holds the turn; on a directed one both act; everyone may message) solved 12 of 12 and 10 of 10 codebases, where free conversation among the same members solved none, because both sides of a symmetric edge adopted each other's format in the same round (600 of 600 occasions). Conversation is one non-bio baseline; the pattern most multi-agent frameworks ship is hierarchical: a **manager** (tech lead) that sees the whole specification and the failures and tells each worker what to do. A manager is a central arbiter: it can break symmetry and carry requirements. If the router beats it, the bio-inspired field rule beats the shipped orchestration pattern at equal N; if not, the router's gain is only over leaderless conversation.

## Task and arms

As LI8 (8 tests per check; k = 5: 5 directed, 4 symmetric edges; k = 12: 12 directed, 10 symmetric). 10 cases per size, seeds 9600 to 9609 (k = 5) and 9700 to 9709 (k = 12), shared round 0, 6 act rounds.

| Arm | Who acts on a failing check | Communication |
|---|---|---|
| `routed` | symmetric edge: one side (hash priority per round); directed: both; local: owner | members may message (at most 3, 40 words) |
| `chat` | every member touched | members may message |
| `manager` | whoever the manager assigns (members not assigned keep their module) | one manager call per act round sees every specification and every failing check and writes each assigned member an instruction (at most 60 words); members do not message. Plan and act alternate, so the arm takes 12 waves for its 6 act rounds |

Members of every arm see their own specification, the failing checks that involve them and the partner modules' code. Scoring: the strict directed check (`recheck-strict.mjs`, a helper must itself be correct), which LI7's review showed is needed.

## Hypotheses (20 cases pooled over both sizes)

- **H-LI25 (router against manager).** `routed` solves at least 4 more cases than `manager`, and ends with fewer failing checks in more cases than the reverse (sign test p < 0.05). Refuted if it solves no more than `manager`. Otherwise inconclusive.
- **H-LI26 (cost).** `routed` uses fewer output tokens per case than `manager` (manager calls included). Refuted if it uses more.
- **H-LI27 (a manager beats leaderless conversation).** `manager` solves more cases than `chat`. Refuted if it does not.

Secondary: failing checks by kind (does the manager resolve symmetric edges, as an arbiter should, and directed ones, which it can describe from the specification?), oscillation, messages, hold-out of solved cases.
