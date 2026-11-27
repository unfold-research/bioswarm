# T2 stage A, third gate: with thinking one Haiku agent holds two tasks and falls on two; the gate opens

Preregistration `tasks/T2A3-GATE-THINK-PREREG.md`. Run 2026-11-12: study `t2-gate-think`, 240 requests in one wave, Claude Haiku 5.5 with adaptive thinking at high effort, no invalid and no cut reply (largest reply 10,870 output tokens of 16,000), [US$ redacted] (shared ledger at [US$ redacted] of 50). Analysis: `node observatory/batch2/t2-gate-think/analyze.mjs` → `analysis.json` here.

The same 240 instances and messages as the second gate (`results/batch2-t2-gate-small/REPORT.md`); only thinking, effort and the output limit differ. Right answers out of 12, with the second gate's count in brackets:

| Task | 1 shard | 2 | 4 | 8 | 16 | Kind |
|---|---|---|---|---|---|---|
| I-01 Global Max | 12 (12) | 12 (12) | 12 (12) | 12 (12) | 12 (12) | **quiet** |
| III-22 Global Median | 12 (9) | 12 (10) | 12 (3) | 12 (1) | 11 (1) | **quiet** |
| I-05 Range Count | 12 (12) | 9 (9) | 11 (5) | 10 (3) | 6 (0) | **falls**, small 4, large 16 |
| I-06 XOR Checksum | 12 (5) | 11 (0) | 11 (2) | 6 (2) | 8 (0) | **falls**, small 4, large 8 |
| **All, of 48** | **48** | **44** | **46** | **40** | **37** | |
| Share | 1.00 | 0.92 | 0.96 | 0.83 | 0.77 | |
| Mean output tokens | 561 (151) | 881 (271) | 1,496 (482) | 2,879 (737) | 4,944 (886) | |

| Registered rule | Result |
|---|---|
| at least two tasks fall | **yes: Range Count and XOR Checksum. T2 proceeds** |
| quiet tasks (negative controls) | Global Max and Global Median |

| Prediction | Result |
|---|---|
| P1 thinking helps at every size (paired, 48 instances per size) | **supported at all five**: +0.21 (0.10 to 0.33), +0.27 (0.15 to 0.42), +0.50 (0.35 to 0.65), +0.46 (0.29 to 0.63), +0.50 (0.35 to 0.65) |
| P2 XOR Checksum at the ceiling on one shard | **holds**: 12 of 12 (was 5) |
| P3 fewer declared estimates at eight and sixteen shards | **holds**: 0 and 0 (were 11 and 11) |

## Reading

- **Thinking is what makes this a single agent worth comparing against.** Over the 240 instances it goes from 122 right to 215. On one shard it is right every time. The floor of the first two gates was the agent's configuration, not the task.
- **The agent now does the work at every size.** Output grows almost in proportion to the input, from 561 tokens on one shard to 4,944 on sixteen, where without thinking it stayed below 900 and declared estimates. No reply declares an estimate here.
- **The Global Median changes kind.** Without thinking it collapsed at four shards; with thinking it is 12 of 12 up to eight and 11 of 12 at sixteen, at 7,746 output tokens a reply. It is quiet in this range, but at a cost that grows fast, and its one miss is at the largest size. It is borderline between quiet and the start of a fall.
- **Two tasks fall inside the range.** Range Count is at 11 of 12 on four shards and 6 of 12 on sixteen; its errors stay small (about one off), which is miscounting, not giving up. XOR Checksum is at 11 of 12 on four shards and 6 of 12 on eight; its errors are large, since one wrong bit changes the whole value.
- **The counts are not monotone, and that is noise.** Range Count has 9 of 12 on two shards and 11 on four; XOR has 6 on eight and 8 on sixteen. The instances were checked: the three Range Count misses at two shards are plain miscounts (23 for 22, 22 for 20, 21 for 20). With 12 instances a cell moves by two or three on chance alone, so the classes above rest on thresholds that a rerun could cross. Borderline by the registered definition (within one of a threshold): Global Median at 16 (11), Range Count at 4 (11) and 8 (10), XOR at 2 and 4 (11), XOR at 16 (8).
- **Accuracy is bought with output.** The run cost 3.5 times the run without thinking ([US$ redacted] against 0.04), all of it in output tokens. For T2 this matters twice: the single agent's cost at each size is now a real number to match, and a collective of k agents with thinking pays the same rate on each of its parts.

## What it means for T2

The gate is open on the registered rule. The map is preregistered next, with what the three gates fixed:

| Element | Value |
|---|---|
| Agent | Haiku 5.5, adaptive thinking, effort high, 16,000 output tokens, in every arm |
| Tasks that fall | I-05 Range Count, I-06 XOR Checksum |
| Negative controls | I-01 Global Max, III-22 Global Median |
| Sizes | 4, 8 and 16 shards span small to large for both falling tasks; 32 is worth adding, since the agent is still at 0.77 at sixteen and the median has only begun to fall |
| Instances per cell | 12 is too few for a threshold; the map should have more per cell, which this price allows |
| Cost | about [US$ redacted] per single-agent run; the whole map is a few US$ at most |

Level III is represented only by the median, and it is a quiet task here: the coupling axis of the design has no falling task. The map can still say where a trigger should fire by size, on two tasks, and where it should not. It cannot say anything about coupling.

Limits: one model, one wording, one effort level; 12 instances per cell; thinking, effort and the output limit changed together against the second gate; the thinking text is not returned and not analysed.
