# BSH1-R1 · completed Hermes and Luna freight pilot

The BSH1 recovery amendment reached main at 2bf8cf8 before the first new request. On benchhost, the same real Hermes adapter and gpt-6-luna completed both arms for seven volumes at 375 cents each. Both invoices were exactly 2,625 cents. The model identified itself as gpt-6-luna on all five delivered turns. Flex was requested on every attempt. The gateway omitted the returned tier.

| Arm | Invoice | Logical turns | HTTP attempts | Input tokens | Output tokens | Gateway USD | End-to-end seconds |
|---|---:|---:|---:|---:|---:|---:|---:|
| Manager | 2625 | 3 | 4 | 1575 | 189 | [redacted] | 66.966 |
| Unfold stigwait | 2625 | 2 | 2 | 1065 | 92 | [redacted] | 30.293 |

The original invoice failure was an OpenAI InternalServerError with a provider request ID, propagated by LiteLLM. In the fresh run the first attempt at the manager invoice again returned HTTP 500. The gate retried the identical request body after backoff. It succeeded without changing model, prompt, routing or token limit. The private transport journal contains the attempt sequence. The provider's internal cause remains unknown.

The recovery used [US$ redacted] Read-only reconciliation of the gateway spend log found one matching entry per forwarding timestamp and model across all nine attempts, with zero gateway spend on both errors. The seven successful replies total [US$ redacted] across the original and recovery. The shared ledger closed at this amount, releasing the balance of the original [US$ redacted] reservation. These are gateway records, not an upstream invoice.

The engineering acceptance gate passed. The shorter route cost about 39.5% less on this pair. Wall time includes the manager retry and backoff. Input, arm order and role count were fixed, so the single result cannot establish general quality, speed or cost superiority. The R2 manifest was verified for all 18 recovery objects, including the forwarding gate, responses and accounting.
