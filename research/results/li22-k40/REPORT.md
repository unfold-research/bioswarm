# LI22 report: do traces need to persist? (2026-11-18)

Preregistration: `tasks/LI22-EVAPORATION-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI22.json` (sweep 2, run in parallel with LI19, LI21 and LI23). Data: `results/li22-k40/`. Verdicts: `results/li22/verdicts.json` (`verdict.mjs`). Review: `docs/reviews/LI22-REVIEW-2026-11-18.md`. Haiku 5.5, 8 cases at 40 modules, [US$ redacted]

**The manipulation never engaged: evaporation removed nothing.**

| Arm | Solved | Pass on fresh inputs | Waves to solve (mean) | Output tokens |
|---|---|---|---|---|
| `stigwait` (traces persist until rewritten) | 8 | 8 of 8 | 3.38 | 1.00M |
| `stigwait_evap1` (traces evaporate after one wave) | 8 | 8 of 8 | 3.13 | 1.00M |
| `stigwait_evap3` (after three waves) | 8 | 8 of 8 | 3.00 | 1.00M |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI64 (primary) persistent traces end below one-wave traces | inconclusive (manipulation not engaged) | 0 to 0, p = 1 |
| H-LI65 three-wave traces end below one-wave traces | inconclusive (manipulation not engaged) | 0 to 0, Holm p = 1 |

## What it shows

1. **The three arms ran the same mechanism.** Replaying every arm, case and wave, every trace a helper owner was shown was exactly one wave old (319 of 319 per arm), and evaporation blocked 0 reads. Under `stigwait` the caller is re-prompted every wave its directed check still fails and rewrites the trace each time, and almost all directed checks close by wave 3. So "persistent" meant "refreshed every wave", and `evap3` could not differ from the control by construction (every case ended by wave 4). 303 of 579 paired `evap1`/`evap3` requests are byte-identical.
2. **Nothing is learned about pheromone decay.** This is not evidence that persistence does not matter. A real test needs traces written once with no re-prompt, a helper owner who misses waves (member loss), or directed checks that stay open for several waves, and a registered manipulation check (reads blocked by evaporation above 0) before any verdict is read.
3. **A noise floor.** Arms that were in effect identical differed in waves to solve in up to 3 of 8 cases.

## Limits

One model family (Haiku 5.5), synthetic tasks, 8 cases, one size, at ceiling, a Claude reviewer.
