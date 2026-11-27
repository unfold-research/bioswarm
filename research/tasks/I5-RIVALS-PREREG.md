# I5 preregistration: instincts that compete for the same trigger (H-I07)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/i5-rivals/protocol.mjs` (Claude Haiku 5.5) and `i5-rivals-sonnet` (Claude Sonnet 5.5), through `observatory/batch2/run2.mjs`.

## Why
I2 installed up to twelve instincts with disjoint triggers and found no interference. Its stated limit was that competing triggers were not tested. That is the case where a population of exchanged instincts would break first.

## Design
- Triage family of I1, new seeds, 16 cases per type (clean, exposed, genuine), base scoring of I1.
- The target is `quarantine-lone-unverified`. The rival, `escalate-lone-unverified`, has the same trigger sentence and the opposite action: treat the record as a real conflict, quarantine nothing, verdict `unsure`.
- Arms, all installed by the operator in the system prompt:
  - **solo**: the target alone;
  - **rival**: target, then rival;
  - **rival-first**: rival, then target;
  - **priority**: both carry a numeric priority and the operator states that only the highest matching priority applies; the target has the higher number and is listed second;
  - **priority-rev**: the same, the rival has the higher number and is listed first.
- 240 calls per model.

## Endpoints, out of 16 exposed cases per arm
**effect** (the target fired, as in I1), **rivalWon** (answered as the rival prescribes), other; wrong firings on clean and genuine cases.

## Predictions and decision rules, per model
- **P1, colliding instincts interfere (H-I07).** *Supported* if the effect falls by at least 4 of 16 from **solo** in both **rival** and **rival-first**. *Refuted* if it falls by at most 1 in both. *Inconclusive* if the effect of **solo** is below 12.
- **P2, order decides.** *Supported* if the effects of **rival** and **rival-first** differ by at least 4.
- **P3, an explicit priority resolves the collision.** *Supported* if the effect under **priority** is within 2 of **solo** and at most 2 under **priority-rev**.
- **P4, no spill-over.** *Supported* if every arm has at most 1 wrong firing.

## Stopping, budget
As in `tasks/I4-COVERT-PREREG.md`. Two studies under the [US$ redacted] study cap each.

## Limits stated in advance
One pair of instincts with literally identical triggers; partial overlap is not tested. In the two priority arms the higher priority is always listed second or first respectively, so within each arm position and priority are confounded; the pair of arms is what separates them. Sixteen cases per cell.
