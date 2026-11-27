# M8 a verifier behind a deep agent: nothing left to add at this difficulty

Preregistration `tasks/M8-DEEP-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, thinking disabled: 180 + 180 requests, all succeeded and valid, none truncated. Usage estimate [US$ redacted] `summary.json` in this folder.

## Result

| Records | deep (d0) | second sample (d1) | verify40 | verify150 | either sample right |
|---|---|---|---|---|---|
| 96 | 0.97 | 0.90 | 0.97 | 0.97 | 0.97 |
| 144 | 1.00 | 0.87 | 1.00 | 1.00 | 1.00 |
| 192 | 0.87 | 0.83 | 0.90 | 0.93 | 0.97 |
| all | 0.94 | 0.87 | 0.96 | 0.97 | 0.98 |

| Test | Verdict |
|---|---|
| P1 a verifier adds to a deep agent | **not supported**: +0.01, interval 0.00 to 0.03 |
| P2 a deep verifier adds to a deep agent | **not supported**: +0.02, interval 0.00 to 0.06 |
| P3 the deeper verifier is the better one | **not supported**: +0.01 |

The deep agent was wrong on 5 of 90 tasks. The verifiers rejected 2 and 3 of those and accepted 84 and 85 of the 85 correct answers. The two deep samples gave different answers on 14% of tasks.

## Reading

- The task did not get hard enough. Doubling the records to 192 left the deep agent at 0.87 there and 0.94 overall, so five errors are all a verifier had to work with.
- On those five, the verifiers caught about half. Against shallow searchers (V3, M7) the same kind of verifier caught 0.82 to 0.85 of errors. The errors a deep agent still makes are harder to catch for a verifier of the same model, which is what one would expect if they share the cause.
- The sequence V2, V3, M7, M8 now reads as one curve: the value of a collective shrinks as the reasoning of each agent grows, and at 150 words of working on this task it is inside the noise.

## Limits

One model, one synthetic task whose difficulty saturates under working space. Ninety tasks and five errors: no claim about verifier quality on deep errors can rest on this. The fallback is a second sample of the same agent.
