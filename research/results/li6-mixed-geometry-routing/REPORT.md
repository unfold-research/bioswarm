# LI6 report: routing each conflict by its geometry (2026-11-17)

Preregistration: `tasks/LI6-GEOMETRY-ROUTING-PREREG.md`. **Stopped at its cost cap after 5 repair rounds, not 8** (`CAP-STOP.md`): [US$ redacted] of [US$ redacted] Analysis: `analysis.json` plus the sign tests below. Haiku 5.5, 0 failed requests.

24 schedule cases with shared machines (symmetric cross-team constraints) and dependencies (directed), 96 and 192 items, shared round 0, final violations after round 5:

| Arm | Median final (96 / 192) | Mean violations, rounds 0→5 | Output tokens per case | Truncated calls |
|---|---|---|---|---|
| sync | 34 / 63.5 | 100.6 → 49.2 | 358,257 | 17 |
| inhibit | 23 / 56 | 100.6 → 41.0 | 264,080 | 16 |
| chat | 22 / 37 | 100.6 → 31.8 | 472,523 | 156 |
| routed | 22 / 43 | 100.6 → 32.6 | 471,387 | 150 |
| routedsilent | 34 / 58 | 100.6 → 48.1 | 358,028 | 12 |

Paired final violations (wins/losses, sign test): routed vs chat 13/11 (p = 0.84); routed vs inhibit 19/5 (p = 0.007); routed vs routedsilent 21/3 (p = 0.0003); chat vs inhibit 15/9 (p = 0.31); chat vs sync 18/5 (p = 0.011); inhibit vs sync 18/5 (p = 0.011); routedsilent vs sync 12/12.

## Verdicts (as registered)

| Hypothesis | Verdict |
|---|---|
| H-LI14 the router beats both pure protocols (15 of 24 against each) | **inconclusive**: 19 against inhibit, 13 against chat |
| H-LI15 messages carry the directed part (routed below routedsilent in 15 of 24) | **supported**: 21 of 24 |
| H-LI16 the router costs no more than chat (at most 1.1 times) | **supported**: 1.00 times |

## Reading

- With symmetric conflicts present, inhibition again beats simultaneous repair (18 of 23), as on colouring and unlike the pure schedule (LI2, LI5): the geometry of the conflicts predicts where inhibition matters.
- Messaging again beats simultaneous repair (18 of 23), as in LI2 and LI5.
- Routing symmetric conflicts to one side **added nothing measurable on top of messaging** (13/11). When members can talk, they appear to settle machine overlaps themselves; the router's value over silent inhibition comes from its messages (21 of 24 against the same router without them).
- Chat and routed truncated about 6% of calls at the 12,000-token member limit, which counts against them.
