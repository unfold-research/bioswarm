# LI33 preregistration: does the trace add anything beyond the tie-break? (2026-11-19)

**Status:** registered 2026-11-19 before any LI33 data, after LI27, LI28R and LI30 and their reviews were seen (disclosed). Haiku 5.5, Message Batches API, strict live check for feedback and scoring, run by `observatory/batch2/rc/sweep.mjs` as sweep 6 in parallel with the other sweep 6 studies and LI32 (rule 9), on the automatic bench where available. Verdicts: `verdict.mjs` (per-case sign test, Holm on secondary hypotheses). Review: `docs/reviews/REVIEW-PROMPT.md`. Study cap checked on expected spend. Funded by the owner's +[US$ redacted] on 2026-11-19 (ledger cap 300). Spec: `observatory/batch2/rc/sweeps/LI33.json`.

**Why.** LI27, LI30 and LI28R showed that a one-side tie-break on format pairs is necessary: without it both sides swap formats every wave and nothing converges. Every review then asked the same open question: with the tie-break in place, does the caller's trace on directed checks add anything, or is "only the helper owner edits directed checks" enough? `polarity` is exactly that control: the same one-side tie-break on symmetric checks, and directed failures sent only to the helper owner, with the failing examples but no trace. LI12 found `polarity` 0 of 16 on easier tasks; it was never run on the harder tasks or next to the manager.

**Arms.** `stigwait` (tie-break plus the caller's trace), `polarity` (tie-break, helper owner acts on the examples, no trace), `oracle` (tie-break plus a harness-written requirement: reference), `manager` (`managerSlack` on, default effort). 16 cases at 80 modules (seeds 33800 to 33815) and 12 at 160 (seeds 33600 to 33611); 160 directed and 80 symmetric edges, 16 test inputs per check; 6 act rounds. Caps [US$ redacted] and [US$ redacted]

## Hypotheses (28 cases pooled over both sizes; the case is the unit)

- **H-LI98 (primary).** With the same tie-break, waiting for the caller's trace ends with fewer failing checks than letting the helper owner act on the failing examples alone: `stigwait` against `polarity` on `final`.
- **H-LI99.** `stigwait` against `polarity` on `holdoutFailing`.
- **H-LI100.** The tie-break alone ends with fewer failing checks than a manager: `polarity` against `manager` on `final`.
- **H-LI101.** `stigwait` against `manager` on `tokens` (per case).

Rule: supported if the first arm is better in more cases with p < 0.05; refuted if the second is better in more cases; otherwise inconclusive.
