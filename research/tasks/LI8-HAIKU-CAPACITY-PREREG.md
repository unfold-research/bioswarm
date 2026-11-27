# LI8 preregistration: does the router swarm beat one agent past its capacity, on real code? (2026-11-17)

**Status:** registered 2026-11-17 by the research lead after reading LI7 (`results/li7-real-code-geometry/`), before any LI8 result. Claude **Haiku 5.5** (default adaptive thinking), Message Batches API, shared ledger (about [US$ redacted] committed before this study). Domain, runner and analysis unchanged from LI7 (`observatory/batch2/rc/`); configs `li8-k5.json` and `li8-k12.json`, each with a study cap of [US$ redacted] (the shared ledger's [US$ redacted] cap also binds).

## Why

In LI7 (Sonnet 5.5, 5 modules) the router (symmetric edges to one side, directed edges to both sides with messages) solved 12 of 12 cases, the first swarm arm to finish tasks in the LI series, but one agent writing all five modules also solved 12 of 12 at a quarter of the tokens: the task fit one agent. A swarm earns its place only past one agent's capacity. Haiku 5.5 reaches its capacity at smaller sizes (LI1 to LI4: the whole-problem Haiku agent declined or failed past about 100 items), so LI8 tests the router against one agent at k = 5 and k = 12 modules.

## Task and arms

As LI7, with 8 tests per check (LI7's hold-out showed that 6 tests let a constant stub pass one check). k = 5: 2 local functions per module, 5 directed and 4 symmetric edges; k = 12: 2 local per module, 12 directed and 10 symmetric edges. 10 cases per size (seeds 8500 to 8509 and 9200 to 9209), shared round 0, 6 repair rounds. Arms `sync`, `inhibit`, `chat`, `routed`, `solo` as in LI7; `solo` gets 32,000 output tokens per call.

## Hypotheses

- **H-LI22 (past capacity the router beats one agent).** At k = 12, `routed` solves at least 3 more cases than `solo` (of 10). Refuted if it solves no more than `solo`. Otherwise inconclusive.
- **H-LI23 (below capacity one agent is enough).** At k = 5, `solo` solves at least as many cases as `routed`.
- **H-LI24 (the geometry result transfers to a second model).** Pooled over both sizes, `routed` resolves more symmetric edges than `chat` and more directed edges than `inhibit` (exact McNemar on paired edges, both p < 0.05 in that direction). Refuted if either comparison does not favour `routed`.

Secondary: the LI7 per-arm tables and oscillation counts per size, hold-out pass rate of solved cases (`holdout.mjs` with the config), output tokens per case.
