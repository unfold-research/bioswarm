# Classical reference for the LI colouring cases (2026-11-17, free, no model)

Asked for by the independent review (`docs/reviews/LI-REVIEW-2026-11-17.md`). Script `observatory/batch2/ne/classical.mjs`, output `classical.json`. Same 36 LI1 cases, same territories and rules (`experiments/fold-field/field.mjs`), with deterministic greedy members (each recolours its conflicted nodes to the least-used colour among neighbours, ties random) from a random start; plus a central min-conflicts search.

Median final conflicts (60 / 120 / 240 nodes):

| Rule | 8 rounds | 100 rounds |
|---|---|---|
| sync | 36 / 88 / 167 | 39 / 88 / 161 |
| inhibit | 23 / 46 / 78 | 6 / 13 / 18 |
| random (p = 0.5) | 15 / 43 / 80 | 3 / 7 / 15 |

Central min-conflicts solved 12 / 12 / 11 of 12 (median 866, 2,588 and 68,485 steps; milliseconds).

- Simultaneous repair does not converge even with 100 rounds: the pathology is structural.
- The Haiku members of LI1 under `inhibit` ended at 5.5 / 18 / 42 after 8 rounds, below greedy members at 8 rounds; starts differ (LLM territorial round 0 against random), so this is indicative only.
- A classical centralised search solves these graphs. Colouring is a proxy for coupled work, not a task that needs LLM members; no claim in LI1 to LI5 is a claim about colouring.
