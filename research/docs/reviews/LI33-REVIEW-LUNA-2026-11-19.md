# LI33 independent review

**Reviewer:** openai-codex/gpt-6-luna (Colony bench, research bench automatic review); read-only.

| Severity | Finding | Response |
|---|---|---|
| High | **The decisive contrast is not just “trace.”** `stigwait` provides directed-failure examples plus a caller trace; `polarity` gives the helper-owner examples without trace. That changes information, coordination, and possibly assignment policy together, so supports the bundle, not trace alone. | — |
| Medium | **Statistical rule:** the verdicts apply paired per-case sign tests; p-values match 28 untied wins (two-sided 2^-27). Holm is applied only to secondary hypotheses as disclosed; broader LI-line multiplicity is uncontrolled. | — |
| Medium | **Arms and execution:** `mechanisms.mjs` defines `stigwait` as stig + symmetric tie-break and directed helper action only after a caller trace; `polarity` sends directed failures only to helper owners, no trace. Wave-0 logs show 1,280/1,920 shared `start` requests (80×16; 160×12); instance keys/seeds align across arms. | — |
| Medium | **Caps/ledger:** ledger reconciles 16 batches per size: [US$ redacted] (k80, cap [US$ redacted]) and [US$ redacted] (k160, cap [US$ redacted]), all complete; max global committed [US$ redacted] < [US$ redacted] cap. Run logs differ only by rounding/estimated tracking ([US$ redacted]/[US$ redacted]). | — |
| Medium | **Holdout is strong but synthetic and structurally coupled.** `stigwait` and oracle pass 28/28 fresh-input checks; oracle is a harness-written reference, not a feasible agent treatment. | — |
| Low | n=28, one model family (Haiku 5.5), synthetic tasks, one seed set. | — |

## Re-derived numbers

Across 28 cases: solved/fresh holdout — `stigwait` 28/28, 28/28; `polarity` 0/28, 0/28; `oracle` 28/28, 28/28; manager 20/28, 19/28. Final failing-check totals from size analyses: polarity 475 (k80)+350 (k160)=825; manager 34+3=37. Per-case win counts in `verdicts.json` are not failure totals.

| Hypothesis | Wins (a:b) | p (Holm if reported) | Verdict |
|---|---:|---:|---|
| LI98 final | 28:0 | 7.45e-9 | supported |
| LI99 holdout | 28:0 | 7.45e-9 (2.24e-8) | supported |
| LI100 final | 0:28 | 7.45e-9 (2.24e-8) | refuted |
| LI101 tokens | 27:1 | 2.16e-7 (same) | supported |

Mean output tokens, k80/k160: `stigwait` 369,433/448,591; manager 504,977/537,955. Example k80 seed 33800 manager retains directed failure `D:M9.labelHandle>M52.siftSlug`. Manager residual failures are symmetric (34 k80, 3 k160); polarity’s 825 are predominantly directed (427 k80, 331 k160); stigwait ends at zero. Mean trajectory falls from about 240 failing checks to zero by wave 4 for stigwait, while polarity plateaus around 29.

**Independent check:** ran `verdict.mjs` on a temporary copy of the inputs (no repository writes); it reproduced all four verdicts and exact p-values. The exact two-sided sign test agrees with the preregistered more-wins/p<.05 rule; ties count neither way; Holm adjusts the three secondary hypotheses. Fresh holdout is reported as counts, not per-input explanations, so causal failure diagnoses for individual holdout inputs cannot be reconstructed here. The primary result supports the combined trace-plus-feedback policy, not trace as an isolated causal factor. Word count: under 500.
