# I11 preregistration: admission of a new instinct by an agent (H-I07, H-I03)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i11-admission/protocol.mjs` (admission by Claude Haiku 5.5) and `i11-admission-sonnet` (admission by Claude Sonnet 5.5). The executor is Claude Haiku 5.5 in both.

## Why
I7 and I8: colliding instincts work only when resolved into one before installation, and a small model cannot arbitrate at run time. In both studies we wrote the resolution. An exchange of instincts between agents needs the admission step done by an agent.

## Design
- **Wave 0, admission.** The admission agent receives the installed instinct (`quarantine-lone-unverified`) and a newcomer, with the operator's policy: where both match a case, the installed instinct's action prevails; where only the newcomer matches, its action is kept. It returns whether they collide, a resolution (install both, refuse the newcomer, or merge into one card that it writes) and one sentence of reason. Four newcomers, three samples each: **rival** (identical trigger, opposite action), **broad** (any unverified record), **narrow** (an unverified record about indicator 0), **control** (`stale-record`, no overlap).
- **Wave 1, execution.** The decision of the first sample for each newcomer is installed in the executor: both cards, the installed card alone, or the merged card alone (cut at 2,500 characters). An invalid decision installs both cards, as a failed admission would. Triage cases of I1, new seeds, 16 per type; arms **solo** and one per newcomer; 240 calls.

## Endpoints
Admission: collision detected or correctly denied, out of 3 samples per newcomer; resolutions chosen. Execution, out of 16 exposed cases per arm: the target's effect as in I1; wrong firings on clean and genuine cases.

## Predictions and decision rules, per admission model
- **P1, the agent detects collisions.** All three samples say collides for rival, broad and narrow, and not for control.
- **P2, its resolution works in a small executor.** For rival, broad and narrow, the effect is within 2 of **solo**. *Inconclusive* if **solo** is below 12.
- **P3, a non-colliding newcomer costs nothing.** The effect under **control** is within 2 of **solo**.
- **P4, no spill-over.** At most 1 wrong firing in every arm.

The merged cards are published with the report.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap.
A wave of admission with no valid decision stops the study; otherwise invalid decisions are handled as stated above.

## Limits stated in advance
Execution tests the first admission sample only. The cases contain no situation that only the newcomer's trigger matches, so whether a merged card keeps the newcomer's action outside the collision is read from the card and not tested. One installed instinct, four hand-written newcomers.
