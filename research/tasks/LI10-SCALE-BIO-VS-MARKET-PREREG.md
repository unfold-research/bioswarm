# LI10 preregistration: bio-inspired coordination against market coordination on codebases that need many agents (2026-11-17)

**Status:** registered 2026-11-17 by the research lead after LI7 and LI8, while LI9 (same arms, 5 and 12 modules) was running and before any LI10 result. The owner approved a further [US$ redacted] for research on 2026-11-17 (shared ledger cap [US$ redacted] → [US$ redacted] raised only after LI9 ended). Claude **Haiku 5.5** (default adaptive thinking), Message Batches API. Domain `observatory/batch2/rc/code.mjs` (adds a second pool of record names used only past 12 symmetric edges; instances of LI7 to LI9 verified unchanged), runner `run-rc3.mjs` (run-rc2 with a wave split across several batches under the [US$ redacted] per-batch cap), configs `li10-k40.json` (study cap [US$ redacted]) and `li10-k80.json` ([US$ redacted]), analysis `analyze-rc.mjs` per size on the strict check and `analyze-li10.mjs` for the verdicts.

## Question

The lab's claim is about **N agents with bio-inspired coordination against N agents with the coordination the market ships**, on work that needs N agents. At 5 and 12 modules one agent with every specification still solved everything (LI7, LI8), so those sizes do not need a team. LI10 grows each codebase to 40 and 80 modules (about 160 and 320 functions, 300 checks at 80), where one call cannot comfortably hold the work, and compares at equal N:

| Arm | Kind | Who acts on a failing check | Communication |
|---|---|---|---|
| `routed` | **bio-inspired** (stop signal / lateral inhibition on symmetric conflicts, recruitment of both sides on directed ones) | symmetric edge: one side holds the turn; directed: both; local: owner | messages (at most 3, 40 words) |
| `manager` | **market: hierarchical orchestration** (lead agent assigns work, as in CrewAI or AutoGen) | whom one manager call, seeing every specification and failing check, assigns, with an instruction each | instructions from the manager only |
| `chat` | **market: leaderless conversation** (group chat) | every member touched | messages |
| `solo` | reference: one agent, all specifications, 64,000 output tokens per call | | |

Members see only their own specification, their failing checks and the partner modules' code. 8 cases per size (seeds 10400 to 10407 at k = 40, 10800 to 10807 at k = 80); k directed and 3k/4 symmetric edges; 8 tests per check; shared round 0; 8 act rounds (the manager alternates plan and act waves). Scoring: strict directed check (a helper must itself be correct).

## Hypotheses (16 cases pooled unless stated)

- **H-LI28 (bio beats hierarchical orchestration).** `routed` solves at least 4 more cases than `manager` and ends with fewer failing checks in more cases than the reverse (sign test p < 0.05). Refuted if it solves no more than `manager`. Otherwise inconclusive.
- **H-LI29 (bio beats conversation).** The same rule against `chat`.
- **H-LI30 (the task needs a team).** At k = 80, `solo` solves at most 4 of 8. Refuted if it solves 6 or more (then the task did not need N agents at this size and H-LI28/29 are read as equal-N comparisons only).
- **H-LI31 (cost).** `routed` uses fewer output tokens per solved case than `manager` and than `chat` (an arm that solves nothing has infinite cost per solved case).

Secondary: failing checks by kind and round; oscillation; messages and manager instruction length; truncations (an unparsed reply leaves code unchanged); hold-out on solved cases; wall-clock waves to solve.
