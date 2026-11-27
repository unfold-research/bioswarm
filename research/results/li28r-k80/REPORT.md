# LI28R report: other mechanisms from nature against a group chat, on harder tasks (rerun) (2026-11-19)

Preregistration: `tasks/LI28-NATURE-BREADTH-HARD-PREREG.md` (design and hypotheses) and `tasks/LI28R-NATURE-BREADTH-RERUN-PREREG.md` (fresh seeds 28900 to 28911, cap checked on expected spend); spec `observatory/batch2/rc/sweeps/LI28R.json` (sweep 5, run in parallel with LI30). Data: `results/li28r-k80/` (raw in releases; `run-part1.log` is the first part). Verdicts: `results/li28r/verdicts.json` (`verdict.mjs`). Review: `docs/reviews/LI28R-REVIEW-2026-11-19.md`. Haiku 5.5, 12 cases at 80 modules (160 directed and 80 symmetric edges, 16 test inputs per check), 6 act rounds, [US$ redacted]

LI28 itself stopped at its study cap before wave 2 ([US$ redacted] data in `results/li28-k80-aborted/`, not analysed) and is recorded as aborted with no verdicts; its hypotheses moved to LI28R unchanged. LI28R stopped once before wave 6 on a false cap alarm (expected [US$ redacted] actual 1.27); the cap was raised from 14 to 16 and the run resumed cleanly (same configuration hash, same wave-6 plan, nothing re-run). Total spend stayed under the registered [US$ redacted]

| Arm | Solved | Pass on fresh inputs | Final failing checks (local / directed / symmetric) | Output tokens (per case) |
|---|---|---|---|---|
| `stigwait` (helper owner acts once the caller's trace is on the check; one side acts on a failing symmetric check) | 12 | 11 of 12 | 0 / 0 / 0 | 368k |
| `chat` (market: leaderless group chat) | 0 | 0 | 0 / 1 / 941 | 928k |
| `threshold` (response thresholds with noise) | 0 | 0 | 60 / 96 / 119 | 802k |
| `inhibit` (lateral inhibition: one module per conflict, by hash) | 0 | 0 | 76 / 301 / 62 | 678k |
| `sync` (everyone touched acts; floor) | 0 | 0 | 51 / 104 / 934 | 1,024k |

`stigwait` solved in 3.50 waves on average.

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI79 (primary) waiting ends with fewer failing checks than a group chat | **supported** | 12 to 0, p = 0.0005 |
| H-LI80 response thresholds end with fewer failing checks than a group chat | **supported** (none solved) | 12 to 0, Holm p = 0.002 |
| H-LI81 lateral inhibition ends with fewer failing checks than a group chat | **supported** (none solved) | 12 to 0, Holm p = 0.002 |
| H-LI82 waiting ends with fewer failing checks than response thresholds | **supported** | 12 to 0, Holm p = 0.002 |
| H-LI83 waiting uses fewer tokens than a group chat | **supported** | 12 to 0, Holm p = 0.002; 368k against 928k per case |

H-LI80 and H-LI81 compare arms that both solved nothing: they show that breaking symmetry clears more checks than a chat, not that either mechanism works.

## Why each mechanism fails

1. **`chat` and `sync` swap formats.** On a symmetric check both sides act, each copies the other's format, and the error moves. A check both sides changed was fixed in 0.7% of cases under `chat` (42 of 5,617) and about the same under `sync`. Messages did not help there (members read each other's code and copy it; inboxes were often empty), but they did help on directed checks: 65% fixed against 42% for `sync`.
2. **`inhibit` hands directed checks to the caller half the time.** The hash picks one module per conflict. On a symmetric check that is right (one side fixes it 98.4% of the time). On a directed check, when only the caller is picked it works around the helper and fixes 0.15% (4 of 2,600); when only the helper is picked it fixes 60%. It ends with 301 failing directed checks.
3. **`threshold` is a coin flip.** On directed checks it behaves like `sync` without a channel (42% fixed). On symmetric checks the noise sends both sides (2% fixed), one side (92%) or neither (9%) by chance, so they never all clear. Its local failures are callers working around helpers.
4. **`stigwait` wins with the tie-break plus the trace on directed checks.** On symmetric checks its one-side rule does what `inhibit` does (99.5% against 98.4% fixed). The difference is directed checks: the caller first writes only a trace, the helper owner acts on it a wave later, and failing directed checks fall from 1,903 to 11 to 0. With no `polarity` arm (tie-break without a trace), the trace's share cannot be separated from "only the helper edits directed checks".

The one `stigwait` fresh-input failure is a test-generation gap: `parseField` must count the letter "r", no test input contains one, and the unimplemented function passes by accident.

## Limits

One model family (Haiku 5.5), synthetic string-function tasks, 12 cases at one size, a Claude reviewer. No `polarity` arm. H-LI83 is partly because `stigwait` stops spending once it solves (allowed by the metric). `analysis.json` carries old LI11 verdict labels (H-LI17 to H-LI19); ignore them.
