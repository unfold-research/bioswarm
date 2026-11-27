# LI14 report: clonal selection on top of agent-written traces (2026-11-18)

Preregistration: `tasks/LI14-CLONAL-PREREG.md` (amended before data: trace parser fixed). Data: `results/li14-clonal-k40/`, `-k80/` (raw in releases). Verdicts: `observatory/batch2/rc/analyze-li14.mjs`. Review: `docs/reviews/LI14-REVIEW-2026-11-18.md`. Haiku 5.5, 16 cases, [US$ redacted]

| Arm | Solved | Pass on fresh inputs | Output tokens per solved case |
|---|---|---|---|
| `stig` | 16 | 3 of 16 | 214,360 |
| `clonal` (3 helper variants, the strict check keeps the best) | 16 | 3 of 16 | 426,578 |
| `manager` | 12 | 12 of 12 | 372,255 |

**Verdicts.** H-LI44 (clonal beats stig) **refuted** (16 against 16, no room: ceiling); H-LI45 (clonal ends below the manager) **inconclusive** (4 to 0, p = 0.125, all at 80 modules where the manager left 4 unsolved); H-LI46 (clonal cheaper than the manager) **refuted**.

**What it shows.** Selecting among three helper variants costs twice the tokens and adds nothing, because the variants are drawn from the same symptom: all 42 checks that fail on fresh inputs were fixed in wave 1 from the failing examples, before the caller's (correct) trace arrived. This is the mechanism LI16 removes.
