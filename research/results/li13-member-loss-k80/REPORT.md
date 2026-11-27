# LI13 report: losing members, bio coordination against a manager agent (2026-11-17)

Preregistration: `tasks/LI13-MEMBER-LOSS-PREREG.md` (amended before data). Data: `results/li13-member-loss-k40/`, `-k80/` (strict live check; `holdout.json` strict; raw in releases `data-li13-member-loss-k40`/`-k80`). Verdicts: `observatory/batch2/rc/analyze-li13.mjs`. Review: `docs/reviews/LI13-REVIEW-2026-11-17.md`. Haiku 5.5, 16 cases (same instances as LI12), 20% of members and the manager's plan down in each wave, [US$ redacted]

| Arm | Solved (40 + 80) | Lost against LI12 (no loss) | Pass on fresh inputs |
|---|---|---|---|
| `oracle` | 8 + 8 | 0 | 16 of 16 |
| `stig` | 8 + 8 | (not comparable: LI12's stig was broken) | **2 of 16** |
| `manager` | 7 + 8 | 1 | 14 of 15 |
| `routed` | 7 + 4 | 5 | 2 of 11 |

## Verdicts

H-LI41 (primary: under loss the router ends below the manager) **refuted** (router lower in 1 case, manager in 5; p = 0.22). H-LI42 (loss costs the manager more than the router) **refuted** (1 against 5). H-LI43 (under loss stig ends below the manager) **inconclusive** (1 to 0).

## What it shows, and what it does not

1. **The router is fragile to loss; traces are not.** A message to a member who is down that wave is gone (176 of 843 and 313 of 1,703 messages), while a trace stays on the check; agent traces and the oracle solved every case.
2. **The manager looked robust because the design let it be.** Lost plans and act waves with every assigned member down were retried without spending act rounds, and time was not scored, so the manager's single point of failure was never tested (review). A loss study must score time or fix a wave budget before saying a manager survives loss.
3. **Agent traces fail on fresh inputs for the same reason as LI12R:** all 21 failing checks were fixed in waves 1 and 2 before a trace arrived; 0 of 381 checks fixed after a delivered trace fail.
4. **Runner bug:** at 40 modules the run ended early when a wave was emptied by loss (the manager's only unsolved case, stopped at 4 of 8 act rounds). Verdicts hold either way; the runner must be fixed before another loss study.
