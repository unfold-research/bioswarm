# LI33 report: does the trace add beyond the tie-break? (2026-11-19)

Preregistration: `tasks/LI33-TRACE-BEYOND-TIEBREAK-PREREG.md`. Code: spec `observatory/batch2/rc/sweeps/LI33.json`. Data: `results/li33-k80/`, `results/li33-k160/`. Analysis: `results/li33/verdicts.json`. Review: `docs/reviews/LI33-REVIEW-LUNA-2026-11-19.md`. The registered design compares four arms on 28 cases (16 at 80 modules and 12 at 160), with Haiku 5.5 and six act rounds. All arms use the format-pair tie-break; `stigwait` also lets the helper act on directed failures only after a caller trace, while `polarity` acts on examples without a trace; oracle supplies a harness-written reference and manager is the comparison arm.

| Arm | Solved | Fresh-input pass | Final failing checks | Mean output tokens (k80 / k160) |
|---|---:|---:|---:|---:|
| `stigwait` | 28/28 | 28/28 | 0 | 369,433 / 448,591 |
| `polarity` | 0/28 | 0/28 | 825 | 735,855 / 798,469 |
| `oracle` | 28/28 | 28/28 | 0 | 233,940 / 315,332 |
| `manager` | 20/28 | 19/28 | 37 | 504,977 / 537,955 |

## Verdicts

| Hypothesis | Verdict | Numbers |
|---|---|---|
| H-LI98 (primary): waiting for trace versus examples alone, final failures | supported | 28:0 wins; p = 7.450580596923828e-9 |
| H-LI99: fresh-input failures | supported | 28:0; p = 7.450580596923828e-9; Holm p = 2.2351741790771484e-8 |
| H-LI100: tie-break alone versus manager, final failures | refuted | 0:28; p = 7.450580596923828e-9; Holm p = 2.2351741790771484e-8 |
| H-LI101: trace arm versus manager tokens | supported | 27:1; p = 2.1606683731079102e-7; Holm p = 2.1606683731079102e-7 |

## What it shows

1. Across the 28 cases, `stigwait` and oracle solved all cases and passed all fresh-input checks; `polarity` solved none and passed none. Manager solved 20 and passed fresh inputs in 19.
2. Re-derived from the size analyses, `polarity` left 475 + 350 = 825 failing checks (427 + 331 directed); manager left 34 + 3 = 37, all symmetric. `stigwait` and oracle each left zero.
3. Mean output tokens for `stigwait` were lower than manager in both sizes: 369,433 vs 504,977 at k80 and 448,591 vs 537,955 at k160. These are descriptive arm means; the registered token verdict is paired per-case.
4. **Exploratory:** the result is consistent with the trace-enabled policy preventing the directed-failure plateau seen for `polarity`; this does not isolate the trace as its cause.

## Limits

The primary contrast changes more than trace availability: `stigwait` receives directed-failure examples plus a caller trace, while `polarity` sends examples to helper owners without a trace. It therefore supports the combined information/coordination/assignment policy, not trace alone. Verdicts use paired per-case sign tests; the registered p-values reflect 28 untied wins, and Holm applies only to the three secondary hypotheses; multiplicity across the broader LI series is uncontrolled. Mechanism definitions and aligned instance keys/seeds, including 1,280/1,920 shared start requests, support comparability but do not remove that confound. The ledger records 16 batches per size, [US$ redacted] at k80 and [US$ redacted] at k160, under their [US$ redacted]/[US$ redacted] caps; all completed and global committed spend was [US$ redacted] below the [US$ redacted] cap (run logs differ slightly through rounding/estimation). Holdout checks are strong but synthetic and structurally coupled; oracle is a harness reference, not a feasible agent treatment. The study has 28 cases, one model family (Haiku 5.5), and one seed set. Review notes that individual holdout failure diagnoses cannot be reconstructed from the aggregate counts.
