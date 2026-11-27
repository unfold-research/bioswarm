# LI23 report: losing members with an equal wave budget (2026-11-18)

Preregistration: `tasks/LI23-LOSS-TIME-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI23.json` (sweep 2, run in parallel with LI19, LI21 and LI22). Data: `results/li23-k40/`, `-k80/`. Verdicts: `results/li23/verdicts.json` (`verdict.mjs`). Review: `docs/reviews/LI23-REVIEW-2026-11-18.md`. Haiku 5.5, 16 cases (8 at 40 modules, 8 at 80), 20% of members and the manager's plan down each wave, 8 waves for every arm with plan waves included, [US$ redacted]

| Arm | Solved | Pass on fresh inputs | Waves to solve (mean, solved cases) | Final failing checks (k40 / k80) | Output tokens |
|---|---|---|---|---|---|
| `stigwait` | 15 | **15 of 16** | 6.27 | 0 / 1 | 3.11M |
| `manager` | 0 | 0 of 16 | — (2 to 4 act rounds per case) | 40 / 100 | 3.77M |
| `routed` | 12 | 4 of 16 | 6.00 | 2 / 4 | 4.54M |

Output tokens include the shared round 0 in every arm.

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI66 (primary) under loss and an equal wave budget, waiting ends below the manager | **supported** (a design result, see below) | 16 to 0, p = 3.1e-5 |
| H-LI67 under loss, waiting ends below the router | inconclusive | 4 to 1, Holm p = 0.375 |

## What it shows

1. **The manager's loss is a design result.** With one wave to plan and the next to act, 8 waves give it at most 4 act rounds against 8 for the other arms. Lost plans (10 of 40 and 9 of 43) cost it more, and at 80 modules 11 of 34 sent plans hit the 32,000-token limit and returned no assignments. Exploratory, not preregistered: with act rounds matched the manager is ahead in 13 cases and behind in 2 (p ≈ 0.007). Read H-LI66 as "plan overhead loses under an equal wall clock", not "the manager coordinates worse". LI24 is the preregistered control.
2. **Waiting for the trace is robust to member loss and never fails on fresh inputs; the router does.** stigwait solved 15 of 16 and every solve holds on fresh inputs. The router solved 12 in the run but only 4 hold. All 13 fresh-input failures are directed checks that passed with no message from the caller, 12 of them in wave 1 (for example a helper returning `floor(len/8)` where the spec asks for the count of "e"); 0 of 331 checks that passed after a message fail. Post hoc, on fresh-input failures stigwait is better than the router in 12 cases and worse in 0 (p ≈ 0.0005); H-LI67 was registered on `final`, so this is not a verdict.
3. **Part of the router's loss is lost messages.** 152 of 791 and 309 of 1,747 messages went to a member who was down in the next wave and were cleared; traces persist. Loss hit the arms equally (about 19% of member-waves down in every arm).

## Limits

One model family (Haiku 5.5), synthetic tasks, 8 cases per size, one loss rate, an 8-wave horizon, a Claude reviewer.
