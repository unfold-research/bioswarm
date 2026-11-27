# T2 stage A preregistration: the calibration gate (2026-11-12)

Registered before any paid call of this study. Design: `tasks/T2-TRIGGER-DESIGN.md`. Owner instruction of 2026-11-12 ("Sim, segue") to proceed with the recommended defaults of the design's three decisions and to write stage 0. Code: `observatory/batch2/t2-gate/protocol.mjs`, instances from `observatory/batch2/silo/export.py`. Claude Haiku 5.5, thinking disabled.

## Why
T2 compares ways of deciding how many agents a task gets. That comparison exists only if one agent with the whole input gets worse as the input grows. Silo-Bench reports that for three open-weight models (level I 96.7% to 20.0% from its smallest to its largest input, Table 2 of arXiv 2603.01045 v2). Nothing is known for Claude. This study measures it and decides whether T2 runs.

## Instances
- Silo-Bench generator, unmodified, at commit `e741277` (The Unlicense). The benchmark makes one instance per size with one fixed seed; the exporter reseeds before each call. Seeds are a hash of task, size and instance number.
- Candidate tasks: the eight whose answer is one integer shared by all agents. **Leak probe** (prior guess): on 200 instances per cell with seeds apart from the study's, the share on which the most common answer of the cell is right must be 0.2 or less at every size. Dropped: I-01 Global Max (0.455 at 64 shards, 1.00 at 1,024: the maximum saturates) and III-23 Graph Components (0.27 at 16 shards). Size 4 was dropped for every task because III-26 (0.25) and III-23 (0.475) are guessable there.
- Tasks, the first three per level that pass, in the benchmark's numbering: **I-02** Word Frequency, **I-05** Range Count, **I-06** XOR Checksum; **III-22** Global Median, **III-26** Global Distinct. Level III has two because no third level III task has an integer answer and passes.
- Sizes: 16, 64, 256 and 1,024 shards. 12 instances per cell. 240 requests, one wave.
- The request is the benchmark's statement without its protocol blocks, then every shard. One sentence is added to III-22 to fix which element is the median (the benchmark takes the element at index n/2 of the sorted data). Output: a `working` field and an integer `answer`, at most 8,192 output tokens. No tools.

## Decision rule
Share right per size over the five tasks (60 instances per size).
- **small** is the largest size at 0.9 or above.
- **large** is the smallest size above it at 0.6 or below over all tasks, with at least two tasks at 0.6 or below on their own.
- **middle**, if large is at least four times small, is the power of two nearest their geometric mean; it is exported then.

| Outcome | Consequence |
|---|---|
| small and large exist | T2 proceeds with these sizes; stage B is preregistered with the measured tokens |
| no size at 0.9 | the instrument is revised (statement or working space); T2 does not proceed on this result |
| small exists, no large | **T2 is not run on this benchmark with this model.** The result is reported: one Haiku agent holds up to 1,024 shards |

Reported per task and size: share right, replies cut at the output limit, invalid replies, input and output tokens, cost.

## Stopping, budget
More than 10% invalid outputs stops the study. A reply cut at the output limit is wrong and is not invalid: the limit is part of what one call can do. Any missing, duplicated, failed or unpriced provider result stops the study with the reservation kept. No request is resubmitted. Under the [US$ redacted] study cap of `observatory/batch2/run2.mjs`, in the shared ledger (cap [US$ redacted]). The runner's request ceiling of 20,000 bytes is raised to 400,000 for this study through the protocol's `MAX_REQUEST_BYTES` (owner decision 1 of the design).

## Limits stated in advance
One model, one wording, 12 instances per cell: about ±0.13 on a share at one size over all tasks, far wider per task. The generator fixes the length of a shard, so input grows only by the number of shards, and the largest size is set by the request ceiling. The 8,192-token output limit decides part of the result at large sizes; a collective of k agents has k such limits, which the token ledger makes visible and does not remove. Algorithmic tasks without tools: an agent with a code tool solves them at any size.
