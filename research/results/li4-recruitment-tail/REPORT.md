# LI4 report: does a windowed repairer finish the work in 16 rounds? (2026-11-17)

Preregistration: `tasks/LI4-RECRUITMENT-TAIL-PREREG.md`. Analysis: `analysis.json`. Haiku 5.5, 17 waves, 0 failed requests. As the LI review established (`docs/reviews/LI-REVIEW-2026-11-17.md`), `patch` and `patch2` act as about one agent per round on a window of at most 40 nodes around conflicts; read them as windowed repairers, not as recruited swarms.

24 colouring cases (120 and 240 nodes), shared round 0, 16 rounds:

| Arm | Solved | Median final (120 / 240) | Output tokens per case | Mean conflicts, rounds 0, 4, 8, 12, 16 |
|---|---|---|---|---|
| patch (radius 1) | 0 | 8 / 20 | 104,529 | 104.3, 30.6, 22.5, 18.9, 15.5 |
| patch2 (radius 2) | 0 | 9 / 26 | 104,873 | 104.3, 32.3, 23.3, 20.1, 18.0 |
| central | 1 | 7 / 40 | 124,371 | 104.3, 51.3, 38.0, 32.4, 27.8 |

| Hypothesis | Verdict |
|---|---|
| H-LI8 recruitment finishes (at least 8 of 24 solved) | **refuted**: 0 of 24 |
| H-LI9 windowed repairer below central at 240 nodes in at least 9 of 12 | **supported**: 10 of 12, 1 higher, 1 tie (sign test p = 0.012); replicates LI1 |
| H-LI10 radius 2 solves more than radius 1 | **refuted**: 0 against 0; radius 2 ended below radius 1 in 7 cases and above in 15 (p = 0.13) |

Reading: local repair converges quickly and then stalls at a few conflicts per hundred nodes; doubling the horizon roughly halved the residual but solved nothing. A wider window did not help. At 240 nodes a 40-node window around the conflicts keeps beating the agent given the whole graph; at 120 they are level (central median 7 against 8).
