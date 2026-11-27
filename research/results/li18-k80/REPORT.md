# LI18 report: do weak test suites explain the generalisation gap? (2026-11-18)

Preregistration: `tasks/LI18-STRONGER-TESTS-PREREG.md`; spec `sweeps/LI18.json`. Data: `results/li18-k40/`, `-k80/`. Verdicts: `results/li18/verdicts.json`. Review: `docs/reviews/LI18-REVIEW-2026-11-18.md`. Haiku 5.5, 16 cases, 16 test inputs per check, [US$ redacted]

| Arm | Solved | Pass on fresh inputs | Failing hold-out checks |
|---|---|---|---|
| `manager` | 16 | 16 of 16 | 0 |
| `routed` | 16 | 14 of 16 | 2 |
| `stig` | 16 | 13 of 16 | 3 |

H-LI56 (the manager still generalises better than stig) **inconclusive** (3 to 0, p = 0.25); H-LI57 (than the router) **inconclusive** (2 to 0). Against the same-day 8-input control (LI14 stig: 3 of 16, 19 failing checks) stig with 16 inputs passes 13 of 16 (Fisher p = 0.001, a between-study comparison): weak test suites were the main cause of the earlier gap. The 3 remaining stig failures are the same mechanism, fixed before the trace arrived.
