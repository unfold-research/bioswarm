# T2 stage A, third gate: the same instances with thinking (2026-11-12)

Registered before any paid call of this study. Owner instruction of 2026-11-12 ("Sim, com raciocínio"), within the standing authorisation for the shared ledger. Code: `observatory/batch2/t2-gate-think/protocol.mjs`. Claude Haiku 5.5, adaptive thinking, effort high.

## Why
The second gate (`results/batch2-t2-gate-small/REPORT.md`) found one agent without thinking at 0.79 on one shard, falling to 0.27 at sixteen. Its registered consequence was to revise the agent and not the sizes: an agent that is wrong on one shard in a fifth of the cases is not a fair "one agent with the whole budget". It also showed that a share pooled over tasks hides three different behaviours.

## What changes, and what does not
- **The agent:** `thinking: {type: "adaptive"}` with `effort: "high"`, and an output limit of 16,000 tokens in place of 8,192, because thinking tokens are output tokens and count against the limit.
- **The decision is per task**, on right answers out of 12.
- **Unchanged:** the 240 instances of the second gate (tasks I-01, I-05, I-06, III-22; 1, 2, 4, 8 and 16 shards; 12 per cell), the system text, the statement, the shards, the output schema, grading. A test checks that the two studies send the same messages.

## Decision rule
For each task, **small** is the largest size with at least 11 of 12 right and **large** the smallest size above it with at most 7 of 12.

| Kind | Condition | Meaning for T2 |
|---|---|---|
| quiet | at least 11 of 12 at every size | one agent is enough; a trigger should not fire. A negative control |
| falls | small and large both exist | the size at which one agent stops being enough is inside the range. A task of the map |
| holds | small exists, no large | it weakens without reaching the floor by 16 shards |
| never | fewer than 11 of 12 at every size | beyond one call whatever the size; not a task about size |

| Outcome | Consequence |
|---|---|
| at least two tasks fall | **T2 proceeds**: the map is preregistered on the falling and quiet tasks, on sizes that span each falling task's small and large |
| fewer than two fall, but two or more fall or hold, or all four are quiet | sizes are extended upward with this agent (32, 64 and beyond) before anything else |
| otherwise | the instrument is revised again; reported |

## Predictions
- **P1, thinking helps at every size**: share right with thinking minus without, on the same instances, paired bootstrap over the 48 instances of each size (4,000 draws); *supported* at a size if the 95% interval is above zero. The without-thinking results are those of `t2-gate-small`.
- **P2, XOR Checksum reaches the ceiling on one shard**: at least 11 of 12 (it had 5).
- **P3, fewer declared estimates**: the word match of the second gate, on the `working` field, finds fewer than its 11 of 48 at eight shards and at sixteen.

Reported per task and size: right answers, cut and invalid replies, mean absolute error, input and output tokens, cost; output tokens against the second gate, since that is what the extra accuracy is bought with.

## Stopping, budget
As in the earlier gates. A reply cut at the output limit is wrong and not invalid. Under the [US$ redacted] study cap, in the shared ledger (cap [US$ redacted]; [US$ redacted] committed). The reserve assumes every reply uses all 16,000 output tokens.

## Limits stated in advance
One model, one wording, one effort level. 12 instances per cell: a task at 10 of 12 and one at 11 of 12 are not distinguishable, and the kinds above are thresholds on such counts; counts within one of a threshold are reported as borderline. The comparison with the second gate changes thinking, effort and the output limit together. Thinking text is not returned by default and is not analysed; the estimate count reads the `working` field only.
