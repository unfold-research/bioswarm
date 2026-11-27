# LI15 report: the field inside the Colony, real agents on real repositories (2026-11-18)

Preregistration: `tasks/LI15-COLONY-FIELD-PREREG.md`. Data: `results/li15-colony-k24/`, `-k40/` (scores, lab exports, final code). Verdicts: `observatory/batch2/colony/analyze-li15.mjs`. Review: `docs/reviews/LI15-REVIEW-2026-11-18.md`. Colony app with Pi, gpt-6-luna through the ChatGPT subscription; parent + 4 ants per team; 12 paired cases (24 and 40 modules); Colony's cost estimate [US$ redacted] (field) and 3.11 (market), no marginal cash on the subscription.

| Arm | Solved | Pass on fresh inputs | Stalled (counted as capped at 60 min) |
|---|---|---|---|
| `field` (ownership + `field_trace`) | 11 | 11 | 1 |
| `market` (Colony default: parent + ants by message) | 8 | 6 | 4 |

## Verdicts

H-LI47 (primary: fewer failing checks on fresh inputs) **inconclusive** (field better in 6 cases, market in 1, p = 0.125). H-LI48 (finishes sooner) **inconclusive** (6 to 6). H-LI49 (fewer tokens) **refuted**: on total tokens or cost the market used less in 10 of 12 pairs.

## What the review changed

- **The field's advantage is mostly the market stalling.** None of the capped runs ran out of time: each stalled when the parent ended a turn with a question to the person, 4 of 5 in the market arm, 3 of them after the Colony's limit on messages between ants (24 per request, 8 per pair) was used up. Counting only pairs with no stall, the field leads 2 to 0 (two market runs passed the tests but failed fresh inputs).
- **Ownership never blocked an edit**: market ants also kept to their own files. What differed was the trace channel, which is exempt from the message limit, and the parent prompt. LI15 compares that bundle, not the field alone.
- **Task delivery went wrong in 2 pairs** (teams created at the same instant), fixed in the Colony bench afterwards.

## What it means for the Colony

Two product findings, independent of the bio question: the default team stalls when its ant message budget runs out and the parent asks the person instead of finishing; and traces work as an uncapped, addressed channel. Next: rerun on the headless runtime fleet with the delivery fix, the same budget for both arms, no question-asking stall (or a scored time budget), and stigwait (LI16) as the field rule.
