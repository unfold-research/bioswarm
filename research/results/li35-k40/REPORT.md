# LI35 report: waiting for the trace versus a manager with Sonnet 5.5 (2026-11-19)

Preregistration: `tasks/LI35-SONNET-RERUN-PREREG.md`. Code: `observatory/batch2/rc/sweeps/LI35.json`. Data: `results/li35-k40/`. Analysis: `results/li35/verdicts.json`. Review: `docs/reviews/LI35-REVIEW-LUNA-2026-11-19.md`. The design compares `stigwait` with `manager` on 12 paired 40-module cases, using Sonnet 5.5 at low effort, strict live checks, and up to 8 act rounds. In `stigwait`, members request traces as part of their work; the manager arm first asks a manager to plan assignments and then requests member work, with the registered 6,000-token member and 24,000-token plan limits.

| Arm | Solved | Pass on fresh inputs | Mean output tokens | Mean US$ |
|---|---:|---:|---:|---:|
| `stigwait` | 12 of 12 | 12 of 12 | 46,505 | [redacted] |
| `manager` | 11 of 12 | 11 of 12 | 71,844 | [redacted] |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI105 (primary): With Sonnet, waiting for the trace leaves fewer checks failing on fresh inputs than a manager agent | inconclusive | 1 better, 0 worse; p = 1 |
| H-LI106: With Sonnet, waiting for the trace uses fewer tokens than a manager agent | supported | 12 to 0; p = 0.00048828125; Holm p = 0.0009765625 |
| H-LI107: With Sonnet, waiting for the trace finishes in fewer act rounds than a manager agent | supported | 12 to 0; p = 0.00048828125; Holm p = 0.0009765625 |

## What it shows

1. **The primary result is not evidence of a hold-out advantage.** Fresh checks pass in 12/12 `stigwait` cases and 11/12 manager cases. The sole differing case is 35401: its manager run leaves three failures, while the other 11 paired cases tie; the registered sign test gives p = 1.
2. **The secondary outcomes favor `stigwait` in these cases.** It uses a mean 46,505 output tokens versus 71,844 for manager (about 35% fewer), and wins the registered act-round comparison 12–0. Act rounds exclude manager plan-only waves. The preregistered exact paired sign tests and Holm adjustment are reported above; these outcomes are secondary, not evidence that the primary improved.
3. **The remaining errors are concentrated in symmetric interfaces.** The holdout data show three failing checks in manager case 35401 and zero elsewhere: `M33.encodeRoute~M20.decodeRoute`, `M33.encodeRelease~M5.decodeRelease`, and `M20.encodeVendor~M16.decodeVendor`. All directed checks are fixed. This is consistent with incompatible endpoint formats, but that mechanism is an interpretation, not a separately tested causal result. Across waves, this manager case falls from 69 failures to 23 after its first act, then 17, 15, 11, 8, 6, 4, and 3; `stigwait` reaches 12/12 solved by wave 4.

## Limits

Twelve synthetic seeded cases, one model family/version, and one size limit external validity. Eleven primary paired ties leave little information; the one-case difference is inconclusive. Both arms use Sonnet 5.5 at low effort, but the manager's plan requests have a 24,000-token limit while member/trace requests have 6,000, a relevant design difference when interpreting cost and rounds. The three residual symmetric checks in manager case 35401 suggest incompatible endpoint formats, not a broad inability to solve. The mechanism description was checked in sampled requests; it does not establish that the request difference caused the outcome. The review found round-0 history marked shared, both arms using seeds 35400–35411 and all 40 actors, and every batch part complete with no failed calls. Study spend was [US$ redacted] against the [US$ redacted] study cap and [US$ redacted] ledger cap; every batch reserve was below the ledger's [US$ redacted]-per-batch cap. The exact paired sign tests and Holm correction match registration; Holm applies only to the two secondary hypotheses. Their outcomes are correlated, and small n plus the primary's low information still limit inference.
