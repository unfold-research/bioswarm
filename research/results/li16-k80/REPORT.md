# LI16 report: act on the signal, not on the symptom (2026-11-18)

Preregistration: `tasks/LI16-SIGNAL-NOT-SYMPTOM-PREREG.md`; spec `observatory/batch2/rc/sweeps/LI16.json` (sweep 1, run in parallel with LI17 and LI18). Data: `results/li16-k40/`, `-k80/` (raw in releases). Verdicts: `results/li16/verdicts.json` (`verdict.mjs`). Review: `docs/reviews/LI16-REVIEW-2026-11-18.md`. Haiku 5.5, 16 cases, [US$ redacted]

| Arm | Solved | Pass on fresh inputs | Waves to solve (mean) | Output tokens | US$ |
|---|---|---|---|---|---|
| `stigwait` (helper owner acts only once the caller's trace is on the check) | 16 | **16 of 16** | 3.44 | 3.05M | [redacted] |
| `stig` (acts on the failing examples) | 16 | 7 of 16 | 3.19 | 3.37M | [redacted] |
| `oracle` (harness-written trace, reference) | 16 | 16 of 16 | 1.81 | 2.14M | [redacted] |
| `manager` (market) | 15 | 15 of 15 | 9.20 (4.75 act waves) | 4.14M | [redacted] |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI50 (primary) waiting generalises better than acting on the symptom | **supported** | 9 cases to 0, p = 0.004 |
| H-LI51 waiting generalises at least as well as the manager | inconclusive (a tie) | 1 to 0; among cases both solved, 15 against 15 with zero failures |
| H-LI52 waiting finishes in fewer act rounds than the manager | **supported** | registered 16 to 0; with manager plan waves excluded (review) 10 to 1, p = 0.012, Holm 0.023 |
| H-LI53 waiting uses fewer tokens than the manager | **supported** | 16 to 0, Holm p = 0.0001 (also on input tokens and dollars) |

## What it shows

1. **The fix is behavioural, not more machinery.** No helper owner acted before its trace (952 of 952 requests carried one), and every check passes on fresh inputs. All 17 hold-out failures of `stig` come from checks fixed before a trace arrived; none of the 295 fixed after one fails. Replicated on fresh seeds in LI17 (16 of 16, 0 failures).
2. **Against the market, at equal correctness, the bio arm is cheaper and needs fewer act rounds.** About 30% fewer output tokens and fewer act waves in 10 of 11 non-tied cases. Waiting costs a little time against acting on the symptom (one wave, on average a quarter).
3. **What the traces are.** 42% quote the caller's specification verbatim, which only the caller's team holds: the agents write, one wave late, what the oracle wrote at once. Nothing is handed to them by the harness.

## Limits

One model family (Haiku 5.5), synthetic code tasks, 16 cases, a Claude reviewer; the manager's only unsolved case is an artefact of truncated plans and the wave cap.
