# V4 preregistration: a collective of different agents against a collective of copies (H-15)

Registered 2026-11-11, before any paid call of this study. Code: `observatory/batch2/v4-diverse/protocol.mjs` (Claude Haiku 5.5) and `v4-diverse-sonnet` (Claude Sonnet 5.5, base answer-only prompt). Combined analysis: `observatory/batch2/v4-diverse/analyze.mjs`.

## Why
Every collective tested so far was copies of one prompt. V1b found that different wordings lower error correlation among agents without working space; M5 found that on the search task they did not help. V3 showed that collectives start to work when agents have working space. V4 asks whether difference between agents adds to that.

## Task and agents
Search task with 48, 96 and 144 records, 30 tasks each, seeds 21001 to 21090. Every Haiku agent has a working field.
- **a0, a1, a2**: three samples of the base wording, at most 20 words of working.
- **b**: records as text lines, instruction reworded. **c**: conditions as a checklist, records reversed, fields reordered. Both at most 20 words.
- **d**: the base wording, at most 60 words.
- **sonnet**: Claude Sonnet 5.5 on the base answer-only prompt, adaptive thinking.

## Collectives of three, plurality with ties to the earliest
copies3 = a0, a1, a2. wordings3 = a0, b, c. mixed3 = a0, b, d. models3 = a0, b, sonnet.

## Predictions and decision rules
All 90 tasks; per-task differences, seeded bootstrap (4,000 draws); *supported* if the 95% interval is above zero, *refuted* if below.
- **P1 (H-15), different wordings beat copies.** wordings3 minus copies3.
- **P2, a mix of wording and budget beats copies.** mixed3 minus copies3.
- **P3, replication of V3.** copies3 minus a0.
- **P4, a second model in the collective beats copies.** models3 minus copies3.
- **P5, the stronger model alone beats the collective it sits in.** sonnet minus models3.

Reported: accuracy of every agent alone, share of tasks on which the members of each collective disagree.

## Stopping, budget
More than 10% invalid outputs in a wave stops a study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted. Each study is under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared cumulative ledger (cap [US$ redacted]). Standing owner authorisation of 2026-11-11 to run rounds without asking while the ledger stays under its cap.

## Limits stated in advance
A wording may simply be better or worse than the base; each agent's accuracy alone is reported so that a gain from diversity can be told from a gain from a better member. Sonnet is a stronger model with thinking, so models3 mixes diversity with capability. One synthetic task.
