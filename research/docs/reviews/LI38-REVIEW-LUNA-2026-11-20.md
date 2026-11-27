# LI38 independent review: latency at k=160

**Reviewer/model:** openai-codex/gpt-6-luna (Colony bench, research bench automatic review); independent, read-only.

| Severity | Finding | Response |
|---|---|---|
| Medium | **The latency result is strong for this protocol/task, not a final-quality advantage.** All 24 arm-case outcomes solve the live checks. `stigwait` reaches zero around wave 4–5; manager needs its alternating plan/action sequence, up to wave 18. Plans count as real wall-clock waves exactly as preregistered, so the primary supports faster convergence, not fewer act rounds. | — |
| Medium | **Fresh-input result is a near-tie, not separation.** Only manager case 38408 fails holdout: `D:M57.driftSpan>M117.countToken`. The failing directed edge shows that the dependency’s behavior works on registered inputs but disagrees on a fresh input; this is a generalization/edge-case defect, not proof of a coordination mechanism failure. `stigwait` passes all holdouts. | — |
| Medium | **Mechanisms and shared starting conditions check out in sampled files.** Wave-1 `stigwait` requests are member jobs with a `traces` schema; manager wave-1 includes explicit `-plan` jobs with assignments, followed by module acts. Both arms’ seed 38408 begin at 401 failing checks; round 0 is the common 1,920-request start batch. | — |
| Low | **Caps and ledger respected.** All 12 cases ran; 12 act rounds were a maximum, not a per-case guarantee: observed stigwait used 3–4 act waves and manager 4–9 (stopping on solve); manager also had 68 plan waves total. No truncation. `run.log` totals [US$ redacted] versus the [US$ redacted] study cap. LI38 ledger commitments reconcile; the largest individual batch commit is [US$ redacted] under its [US$ redacted] cap; global committed total is about [US$ redacted]/[US$ redacted] | — |
| Medium | **Interpretation limits:** n=12, one Haiku family/version, synthetic generated code and tests, multiple correlated outcomes, and prior LI33–LI37 findings disclosed before preregistration. Generalization beyond these conditions is unsupported. | — |

## Re-derived numbers

`state.json`/`holdout.json` and `analysis.json` agree: **solved 12/12 in both arms**; final failing checks 0 in both; strict fresh-input pass **stigwait 12/12, manager 11/12** (manager case 38408 has one failing check). Mean output tokens/case: **614,254** vs **680,407**; mean reported USD/case: **[US$ redacted]** vs **[US$ redacted]**. Mean live trajectory (total failing checks, waves 0–4): stigwait **399 → 318.17 → 37.5 → 0.25 → 0**; manager **399 → 399 → 143 → 143 → 40.08**, then keeps declining to zero at wave 18. In sample 38408: stigwait 401→320→36→1→0, manager 401→283→82→24→9→4→1→0, with manager plan waves between action waves. Thus solve speed is materially protocol- and wall-wave-dependent.

| Hypothesis | Wins (stigwait:manager) | Exact two-sided sign p | Holm (secondaries) | Verdict |
|---|---:|---:|---:|---|
| H-LI115 wavesToSolve (primary) | 12:0 | 0.0004883 | — | supported |
| H-LI116 final | 0:0 (12 ties) | 1 | 1 | inconclusive |
| H-LI117 holdoutFailing | 1:0 (11 ties) | 1 | 1 | inconclusive |
| H-LI118 tokens | 11:1 | 0.0063477 | 0.019043 | supported |

The verdict code’s exact sign test and directional labels follow the preregistration wording, including its unusual rule that a comparator win-majority is “refuted” even without p<.05; no such refutation occurs here. Holm adjustment matches the three secondary tests. The primary’s nominal p is not adjusted for the overall hypothesis family, as registered.

**Verification scope:** inspected preregistration, spec, verdict logic, state/analysis/holdout, run log, request batches and shared ledger; did not re-score all raw model outputs or independently replay every holdout input. No repository files other than this review were written.
