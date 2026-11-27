# LI21 report: the LI16 comparison with Sonnet 5.5 (2026-11-18)

Preregistration: `tasks/LI21-SONNET-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI21.json` (sweep 2, run in parallel with LI19, LI22 and LI23). Data: `results/li21-k40/`. Verdicts: `results/li21/verdicts.json` (`verdict.mjs`). Review: `docs/reviews/LI21-REVIEW-2026-11-18.md`. Claude Sonnet 5.5 at effort low, 8 cases at 40 modules, [US$ redacted]

**Aborted at the study cap after wave 1. No verdict is interpretable.**

| Arm | Solved | Pass on fresh inputs | Waves applied | Failing checks after wave 1 (sum; directed / symmetric) | Output tokens per case (with shared round 0) |
|---|---|---|---|---|---|
| `stigwait` | 0 | 0 of 8 | 0, 1 | 325 (320 / 5) | 23k to 32k |
| `manager` | 0 | 0 of 8 | 0, 1 (8 plans, 0 act rounds) | 552 (320 / 232) | 16k to 20k |

## What happened

The study cap gate counts reserved cost, not spend. Each Sonnet member call reserves about [US$ redacted] (6,000 max tokens), so wave 2 needed a reserve of [US$ redacted] for 529 requests, more than the [US$ redacted] cap on its own, while actual spend ran 6 to 11 times below the reserve. The run stopped before wave 2, the first wave in which either mechanism could finish anything. By then stigwait had fixed the symmetric checks and written 320 traces, but by design it acts on directed checks only once a trace is there; the manager had planned and not yet acted.

The pipeline treated the cap stop as a finished run and computed verdicts: H-LI61 (tokens) "refuted" 0 to 8, H-LI62 (act rounds) "inconclusive" 0 to 0, H-LI63 (fresh inputs) "refuted" 0 to 8. All three are artefacts of the stop. Cutting LI16-k40 and LI17-k40 at wave 1 gives the same 0 to 8 on tokens, where the full runs read 8 to 0 for stigwait; H-LI63 compares partly repaired code with untouched round-0 code. They are recorded as **aborted**.

The early trajectory matches Haiku (69 to 40 failing checks per case after wave 1; LI16 Haiku 65 to 39), which is structural and says nothing about the model.

## Fixes before a rerun

A stop at the study cap now ends the run as incomplete (exit 3, no summary, no verdicts), from sweep 4 (LI27) on. A rerun needs a cap at or above spend plus the largest wave reserve (about [US$ redacted] here) or a lower member output limit.

## Limits

One run of 8 cases, stopped after one wave; nothing here bears on Sonnet against Haiku. A reviewer outside the Claude family is still owed.
