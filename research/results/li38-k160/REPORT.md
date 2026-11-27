# LI38 report: waiting for the trace versus a manager at 160 modules (2026-11-20)

Preregistration: `tasks/LI38-LATENCY-SCALE-PREREG.md`. Code: `observatory/batch2/rc/sweeps/LI38.json`. Data: `results/li38-k160/`. Analysis: `results/li38/verdicts.json`. Review: `docs/reviews/LI38-REVIEW-LUNA-2026-11-20.md`. The study compares `stigwait` with `manager` on 12 cases, using Haiku 5.5, strict feedback, and up to 12 act rounds per arm. 160 modules is not a new size: it is the largest size already tested in LI26, LI27 and LI33. What changes from those studies is LI36's directed-edge density (320 directed and 80 symmetric edges) and the 12 act rounds per arm.

| Arm | Solved (strict check) | Pass on fresh inputs | Mean output tokens/case | Mean reported cost/case |
|---|---:|---:|---:|---:|
| `stigwait` (waits for the trace before acting) | 12/12 | 12/12 | 614,254 | [US$ redacted] |
| `manager` | 12/12 | 11/12 | 680,407 | [US$ redacted] |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI115 (primary), fewer `wavesToSolve` | supported | `stigwait` better in 12 cases, manager in 0; p = 0.00048828125 |
| H-LI116, fewer final failing checks | inconclusive | 0 to 0; p = 1 |
| H-LI117, fewer holdout failing checks | inconclusive | 1 to 0; p = 1; Holm p = 1 |
| H-LI118, fewer output tokens | supported | 11 to 1; p = 0.00634765625; Holm p = 0.01904296875 |

## What it shows

1. **The waiting arm solved the live checks sooner by the registered wave measure.** Both arms solved all 12 cases, but `stigwait` reached zero failing checks around wave 4–5, while manager reached zero as late as wave 18. Manager plan waves count as real waves in the primary measure; its 68 total plan waves are part of this protocol comparison, not act rounds.
2. **Final live-check results did not separate; fresh-input results nearly tied.** Both arms ended with zero failing checks in every case. `stigwait` passed holdouts 12/12; manager passed 11/12. Its sole failure was case 38408, `D:M57.driftSpan>M117.countToken`, an edge-case generalization defect, not evidence of a coordination failure.
3. **Output tokens were lower for `stigwait`.** Mean per case was 614,254 versus 680,407. These results concern this sample and protocol; they do not establish the cause of the difference.

## Limits

The review finds that latency is evidence for this task and protocol, not a final-quality advantage: all 24 arm-case outcomes solved live checks, and the primary counts manager plan waves, so it is not a finding about fewer act rounds. Holdout separation is only one case, and that failure reflects a fresh-input behavior mismatch rather than demonstrated coordination failure. Sampled requests support the intended mechanisms and shared starting point: wave-1 `stigwait` jobs request traces, manager starts with assigned plans, and both arms' case 38408 begin at 401 failing checks; this is a sampled check, not a full audit. All 12 cases ran, no truncation was reported, manager used 4–9 act waves and `stigwait` 3–4, and recorded spending was [US$ redacted] against the [US$ redacted] cap (largest batch commitment [US$ redacted]). These are review-checked records, not an independent replay of every output. Generalization is limited by 12 cases, one Haiku model family/version, synthetic generated tasks, correlated outcomes, and prior LI33–LI37 findings disclosed before preregistration. The plan output limit (128,000) also differs from LI36 (96,000); the preregistration documents why.
