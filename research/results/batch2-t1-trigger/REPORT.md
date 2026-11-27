# T1 the trigger as a decision: a model that decides when to stop stops too early

Preregistration `tasks/D6-T1-PREREG.md`. Run 2026-11-11: `t1-central-haiku` (212 decision calls, [US$ redacted]) and `t1-central-sonnet` (225 decision calls, [US$ redacted]), no invalid decision. Readers are simulated with exact counts and the place of each re-count is fixed, so the study isolates the decision to continue or stop. Analysis: `node observatory/batch2/t1-trigger/analyze.mjs` → `summary.json` here.

A field of 24 parts may be unchanged (stable), edited in one block (local) or edited in scattered parts (scatter). Re-counts come in rounds of two, up to 12. A threshold rule reads a fixed number and continues only on a discrepancy; the central trigger is a model that sees the board after each round and decides.

Rules on 3,000 simulated fields (share right / re-counts used):

| Trigger | Stable | Local | Scattered |
|---|---|---|---|
| never | 1.00 / 0 | 0.00 / 0 | 0.00 / 0 |
| always | 1.00 / 12 | 1.00 / 12 | 0.38 / 12 |
| threshold 4 | 1.00 / 4 | 0.51 / 8.1 | 0.26 / 7.4 |
| threshold 8 | 1.00 / 8 | 1.00 / 12 | 0.35 / 10.8 |
| threshold 8, stop when the alarm clears | 1.00 / 8 | 1.00 / 8.5 | 0.35 / 10.0 |

The same 90 fields (30 per world) for the central trigger and the rules:

| Trigger | Stable | Local | Scattered | All 90: right | All 90: re-counts |
|---|---|---|---|---|---|
| central, Haiku | 1.00 / 2.7 | 0.40 / 5.0 | 0.33 / 7.5 | 0.58 | 5.1 |
| central, Sonnet | 1.00 / 3.5 | 0.50 / 4.9 | 0.33 / 7.2 | 0.61 | 5.2 |
| threshold 4 | 1.00 / 4 | 0.53 / 8.3 | 0.33 / 8.3 | 0.62 | 6.8 |
| threshold 8, stop when clear | 1.00 / 8 | 1.00 / 8.5 | 0.43 / 10.2 | 0.81 | 8.9 |
| always | 1.00 / 12 | 1.00 / 12 | 0.47 / 12 | 0.82 | 12 |

| Test | Result |
|---|---|
| P1 the central trigger is not more accurate than the best threshold rule | **supported**: Sonnet −0.20 (−0.29 to −0.12), Haiku −0.23 (−0.32 to −0.14) |
| P2 it spends re-counts on fields that did not change | **supported**: Sonnet +1.5 above one round (1.1 to 1.7), Haiku +0.7 (0.3 to 1.2) |

Against the rule it trails, the central trigger uses 3.7 (Sonnet) and 3.8 (Haiku) fewer re-counts per field. On edited fields Sonnet is 0.32 below reading everything (−0.43 to −0.20).

## Reading

- **The model's decision is to stop early.** On stable fields it stops after 1.4 to 1.7 rounds, which is cheap and correct. On locally edited fields it stops after 2.4 rounds, before the edit has been reached in half or more of the fields: 0.40 and 0.50 right where a threshold of eight re-counts gets 1.00. Nothing on the board distinguishes "not changed" from "not found yet", and the model reads silence as the former.
- **It lands on the rule frontier, at the cheap end.** Its accuracy over the 90 fields equals threshold 4 (0.58 and 0.61 against 0.62) with about 1.7 fewer re-counts. It is not dominated; it buys a low spend with missed edits. Whether that is acceptable depends on the cost of a miss, which this study does not set.
- **The larger model decides no better.** Sonnet and Haiku differ by 0.03 in accuracy and 0.1 re-counts, at twenty times the cost of the decision calls.
- **A trigger cannot rescue scattered change.** Reading half the field gets 0.38 to 0.47; every trigger is at or below that.
- With RD and D6 this is the third result of the same shape: what decides the outcome is the policy (how much evidence to require before stopping, where to look next), and a model asked to choose step by step does not arrive at the policy that a few lines of code state.

Limits: 30 fields per world for the central trigger; exact simulated readers; one field shape and one edit size; the first seed range was replaced before any call after the leak probe flagged it (z = 3.4, not reproduced on 3,000 fields). The rule table is exact for this generator, not for real readers.
