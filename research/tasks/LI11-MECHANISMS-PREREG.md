# LI11 preregistration: two natural mechanisms in isolation against a manager agent, at 40 and 80 modules (2026-11-17)

**Status:** registered 2026-11-17 by the research lead after LI9 and while LI10 (k = 80) was running; after LI10's k = 40 result was seen (router 8 of 8 by wave 5, manager 8 of 8 by wave 12, one agent 8 of 8), before any LI11 result. On the owner's direction every study from here isolates mechanisms that natural collectives use (map: `docs/NATURE-MECHANISMS.md`). Claude **Haiku 5.5** (default adaptive thinking), Message Batches API, shared ledger (cap [US$ redacted]). Domain `observatory/batch2/rc/code.mjs` (adds rules `threshold` and `pheromone` to `plan` and a `need` field on directed checks; instances of LI7 to LI10 verified unchanged), runner `run-rc3.mjs`, configs `li11-k40.json` (study cap [US$ redacted]) and `li11-k80.json` ([US$ redacted]), analysis `analyze-rc.mjs` per size on the strict check and `analyze-li11.mjs` for the verdicts.

## Why

LI9: at 5 and 12 modules a manager agent that sees every specification beat the router (19 against 17 of 20) and was cheaper; the router's losses were callers working around a wrong helper. The router bundles three mechanisms (one-side turn, recruitment by messages, both sides acting on directed edges). LI11 takes two mechanisms apart, each **without messages**, so that what works can be named:

- **Response threshold with noise** (ants, wasps): no coordinator and no turn-taking; on a failing symmetric edge each side acts independently with probability 1/2. Ties are broken by chance (about half the time exactly one side acts). Question: is a central or hashed arbiter needed at all?
- **Stigmergy with polarity** (pheromone trails, morphogen gradients): the caller's requirement is written into the field as a trace on the failing check and the check goes **only to the helper's owner**, who can change the helper; the caller is not woken, so it cannot work around the helper. Symmetric edges: one side holds the turn (hash), as in `routed`. Question: does putting the information in the field replace messages, and does polarity remove LI9's workarounds?

## Arms (equal N: one Haiku member per module)

| Arm | Symmetric failing edge | Directed failing edge | Messages |
|---|---|---|---|
| `routed` (LI7 to LI10 router) | one side (hash per round) | both sides | yes |
| `manager` (market: hierarchical orchestration) | whom the manager assigns | whom the manager assigns | manager instructions |
| `threshold` (bio: response threshold) | each side with probability 1/2 | both sides | no |
| `pheromone` (bio: stigmergy with polarity) | one side (hash per round) | helper owner only, with the caller's requirement on the check | no |

Local failures go to their owner. Cases: 8 per size, seeds 11400 to 11407 (k = 40) and 11800 to 11807 (k = 80); k directed and 3k/4 symmetric edges; 8 tests per check; shared round 0; 8 act rounds (manager alternates plan and act). Scoring: strict check.

## Hypotheses (16 cases pooled)

- **H-LI32 (noise breaks symmetry).** `threshold` ends with at most 10% of the symmetric edges that ever failed in it still failing. Refuted if more than 25% remain; otherwise inconclusive. (Simultaneous action without an arbiter left 90 to 100% in LI7, LI8 and LI10.)
- **H-LI33 (information in the field replaces messages).** `pheromone` resolves no fewer directed edges than `routed` (paired McNemar not favouring `routed` at p < 0.05) **and** ends with fewer strict directed failures in total. Refuted if `routed` resolves more directed edges with p < 0.05.
- **H-LI34 (bio at scale against the manager).** `pheromone` ends with fewer failing checks than `manager` in more cases than the reverse (sign test p < 0.05), or, if both solve every case, solves them in fewer waves in more cases (sign test p < 0.05). Refuted if `manager` is lower in more cases.
- **H-LI35 (cost).** `pheromone` uses fewer output tokens per solved case than `routed` and than `manager`.

Secondary: waves to solve per arm; failing checks by kind and wave; oscillation; strict against registered scoring; hold-out of solved cases; `threshold` against `routed` on symmetric edges.

## Stopping and disclosure

The runner stops before a wave whose reserve would pass the study cap; k = 40 runs before k = 80; no retries of uncertain submissions; every deviation is written in the report.
