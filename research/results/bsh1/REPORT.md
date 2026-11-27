# BSH1 · Hermes and Luna integration pilot

**Stopped on transport error, 2026-11-24.** The acting Research Leader registered the owner-approved [US$ redacted] protocol on main (8b8c09f) before spending. The connector at f756031 ran on benchhost with Hermes 2bd378ed. A localhost forwarding gate enforced the five-call ceiling, injected the registered flex tier (Hermes custom-provider mode omitted it), mapped the output limit to max_completion_tokens and prevented retransmission after an upstream failure. The gateway listed gpt-6-luna before the pilot.

| Manager turn | Outcome | Input tokens | Cached | Output tokens |
|---|---|---:|---:|---:|
| Dispatch | Parsed reply | 516 | 0 | 42 |
| Manager | Parsed reply | 525 | 0 | 53 |
| Invoice | Upstream HTTP 500 | unknown | unknown | unknown |

The two delivered responses identified the model as gpt-6-luna. Both omitted the returned tier. Observed usage was 1,041 input and 95 output tokens. Estimated cost at the requested flex rate was [US$ redacted] The gateway supplied no usage for request three. The full [US$ redacted] remains committed under bsh1-hermes pending reconciliation. It is a reservation, not a charge. The upstream 500 was translated into a terminal local 400 to prevent a Hermes retry. The trace records three upstream requests.

The transport window from first forwarding to failure was 45.78 seconds. The manager arm produced no invoice and the stigwait arm never started. Wall time to a completed answer, exact-match quality and relative cost or speed are unavailable. The acceptance gate requires both arms to finish and remains unmet. No rerun was made.

The private R2 manifest covers ten verified objects, including the request digests, two full replies, the runner and the accounting snapshot. Only the manifest and this aggregate report are tracked here. See `tasks/BSH1-HERMES-PREREG.md`.

Follow-up: the approved recovery completed both arms. Gateway reconciliation subsequently recorded [US$ redacted] on this run's failed attempt and closed the shared reservation. See `results/bsh1-r1/REPORT.md`.
