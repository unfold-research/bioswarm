# LI19 report: harder tasks, equal wave budget (2026-11-18)

Preregistration: `tasks/LI19-HARDER-TASKS-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI19.json` (sweep 2, run in parallel with LI21, LI22 and LI23). Data: `results/li19-k80/`, `-k120/`. Verdicts: `results/li19/verdicts.json` (`verdict.mjs`). Review: `docs/reviews/LI19-REVIEW-2026-11-18.md`. Haiku 5.5, 16 cases (8 at 80 modules, 8 at 120), 6 waves for every arm with manager plan waves included, [US$ redacted]

| Arm | Solved | Pass on fresh inputs | Waves to solve (mean, solved cases) | Final failing checks (k80 / k120) | Output tokens |
|---|---|---|---|---|---|
| `stigwait` (helper owner acts only once the caller's trace is on the check) | 16 | **16 of 16** | 3.75 | 0 / 0 | 6.90M |
| `manager` (market) | 0 | 0 of 16 | — (2.1 act rounds per case) | 278 / 449 | 8.10M |
| `routed` (geometry router, messages) | 15 | 8 of 16 | 5.40 | 0 / 2 | 11.11M |
| `oracle` (harness-written trace, reference) | 16 | 16 of 16 | 2.19 | 0 / 0 | 4.41M |

Output tokens include the shared round 0 in every arm.

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI58 (primary) waiting ends with fewer failing checks than the manager, equal wave budget | **supported** (a design result, see below) | 16 to 0, p = 3.1e-5 |
| H-LI59 waiting leaves fewer checks failing on fresh inputs than the manager | **supported** (follows from H-LI58) | 16 to 0, Holm p = 6.1e-5 |
| H-LI60 waiting ends below the geometry router | inconclusive | 1 to 0, Holm p = 1 |

## What it shows

1. **The manager's loss is a design result, not a coordination result.** Under an equal wave budget every second wave is a plan wave, so the manager gets at most 3 act rounds of 6. 21 of its 62 plans hit the 48,000-token output limit, returned no assignments and cost a further wave; it acted 2.1 rounds per case on average. At equal act rounds the comparison is mixed: after 1 round the manager is ahead in 16 of 16 cases (stigwait spends wave 1 waiting for traces), after 2 stigwait is ahead 9 to 3, after 3 stigwait is ahead 6 to 0, but only 6 cases ever got 3 manager act rounds. LI24 is the preregistered control at equal act rounds. H-LI59 adds no independent evidence: an unsolved arm's fresh-input failures are its leftover failing checks.
2. **Waiting for the trace again never fails on fresh inputs; the router does.** The router solved 15 of 16 in the run but only 8 pass on fresh inputs. All 7 failures are directed checks, and 6 passed the strict check in wave 1, before any requirement could reach the helper owner (in 4 cases "distinct letters that occur more than once" was written as `s.length - distinctCount(s)`). No stigwait helper owner had a trace in wave 1, so none could guess blindly; 546 and 831 requests carried one in wave 2. This is the LI16 and LI18 mechanism on harder tasks.
3. **Most of the manager's leftover failures are symmetric checks** (267 of 278 and 354 of 449). It assigns both sides of an encoder/decoder pair and they move past each other: 948 of 1,019 and 709 of 734 both-sides changes left the check failing.

## Limits

One model family (Haiku 5.5), synthetic string-function tasks, 8 cases per size, a Claude reviewer. The headline depends on a lockstep wave budget and an output cap that the manager's reasoning overflows; a larger cap or another effort setting could change H-LI58. The hold-out uses the same narrow input generator as the run. The stored `configHash` does not reproduce, although instances, round 0, final failing ids, analysis, hold-out and verdicts do.

## Second review outside the Claude family

`docs/reviews/LI19-REVIEW-LUNA-2026-11-18.md`: gpt-6-luna, run as a Colony agent on the lab fleet (rule 6, first reviewer of the line outside the Claude family). It re-derived every solved count, hold-out and verdict byte for byte, but did not flag the equal wave budget that halves the manager's act rounds (the Claude review did; LI24 is the control).
