# Harness study: rules in the loop for a pair of OpenBot agents (2026-11-13)

Preregistration: `tasks/HARNESS-STUDY-PREREG.md`.
- First version pushed as `e579f13`.
- Amendment 1 pushed as `21ebbb4`, before any of the runs below.

Runner: `experiments/openbot-unfold-mode/study/run.mjs`. The study ran on the owner's Mac with no person in the loop, from 03:25 to 04:16 UTC. Three named pairs worked in parallel, one per arm, all on `gpt-6.1-sol` at medium effort with the owner's ChatGPT sign-in:

| Arm | Pair |
|---|---|
| C, Codex | HS Codex Líder + HS Codex Colega |
| P, Pi | HS Pi Líder + HS Pi Colega |
| U, Pi with the Unfold extension | HS Unfold Líder + HS Unfold Colega |

There were nine OpenBot-Bench repair tasks (bx01 to bx09, 2 to 5 packages each), scored on a hidden final suite of 58 to 144 tests. Each task went to the lead, who was told a colleague could take part of it.

## Results by arm

| Arm | Accepted | Cost, one price table (US$) | Cost per accepted task | OpenBot's estimate (US$) | Agent messages | Alternations | Turns | Wall time | Output tokens | Uncached input share |
|---|---|---|---|---|---|---|---|---|---|---|
| C | 9 of 9 | [redacted] | [redacted] | [redacted] | 37 | 11 | 34 | 36 min | 88,845 | 6.5% |
| P | 9 of 9 | [redacted] | [redacted] | [redacted] | 29 | 9 | 22 | 47 min | 127,275 | 8.9% |
| U | 9 of 9 | [redacted] | [redacted] | [redacted] | 18 | 9 | 19 | 49 min | 127,627 | 7.5% |

There was no false success and no timeout.

## Results by task

| Task | C: cost, messages | P: cost, messages | U: cost, messages |
|---|---|---|---|
| bx01 | 0.454, 4 | 0.308, 3 | 0.332, 2 |
| bx02 | 0.386, 3 | 0.379, 2 | 0.382, 2 |
| bx03 | 0.537, 5 | 0.450, 3 | 0.478, 2 |
| bx04 | 0.405, 3 | 0.546, 4 | 0.514, 2 |
| bx05 | 0.560, 4 | 0.496, 3 | 0.580, 2 |
| bx06 | 0.379, 5 | 0.379, 3 | 0.427, 2 |
| bx07 | 0.370, 4 | 0.417, 3 | 0.406, 2 |
| bx08 | 0.574, 5 | 0.542, 4 | 0.545, 2 |
| bx09 | 0.487, 4 | 0.625, 4 | 0.591, 2 |

## What the rules did in arm U

- **Messages:** every run had exactly two agent messages, one each way. The pointer rule refused the colleague's first, long report in 9 of 9 tasks, and the colleague then sent a short one. The lead's ceiling refused a second message in 3 of 9 tasks (bx04, bx05, bx07).
- **Field:** the agents left 0 to 4 marks per agent per task, with no instruction to do so beyond the tool description and the refusal text.
- **Ceiling:** no request came near [US$ redacted] so H-H03 was not exercised.

## Decisions, as preregistered

- **Acceptance:** all 27 runs were accepted, so acceptance has no power here. The preregistration said that in this case the outcome is cost alone.
- **H-H01, refuted in this study.** U's cost per accepted task was [US$ redacted] against 0.460 for P: 103% of P, where the support threshold was at most 70%. The refutation condition was "costs as much as or more than P", and it holds.
  - U sent 38% fewer agent messages than P, and 51% fewer than C. Fewer messages did not mean lower cost.
  - The gap between arms (about 3%) is far smaller than the spread between tasks, which runs from [US$ redacted] to 0.63.
- **H-H02 holds qualitatively.** The rules fired in a host the lab does not own, and the agents kept to them. Messages stayed at one each way, a refused report was resent short, and marks were left unprompted. Nothing in the record shows the agents getting around a rule. One limit: the record captures tool calls, not intent, so a workaround through other means would not appear unless it went through a tool.
- **C against U** is reported, not decided: the two differ in harness as well as rules.

## Reading

1. **The rules cut coordination, but coordination was not the cost.** With one colleague and a well-specified task, the pairs exchanged 2 to 5 messages. There were no long chains: at most 2 to 3 alternations per task in C and P. Almost all of the cost was each agent reading the code and writing fixes, and the rules do not touch that. On the server of 8/11 the expensive pattern was chains of up to 34 hops among many agents over hours, and these tasks did not reproduce it.
2. **The harness costs more than the rules save.** Pi produced 43% more output tokens than Codex on the same model, and took about 30% more wall time, with or without the extension. In cost the arms come out level, because Codex re-read more context (34 turns against 22). For OpenBot users, which harness to pick matters more than these rules on this kind of task.
3. **The message ceiling counts per turn.** The ceiling allows one message per turn, and each reply starts a new turn, so it caps bursts but not a back-and-forth. Amendment 1 noted this from phase 0. In this study the back-and-forth stayed short anyway.
4. **A caching question, answered.** The pilot raised whether the extension disturbs prompt caching. It did not: U's uncached share (7.5%) sits between C and P.

## What would test the rules where they can matter

- Tasks that make a pair or a group drift into long exchanges: unclear ownership, a moving target, three or more agents, hours rather than minutes. One option is replaying request shapes from the 8/11 server.
- A message ceiling counted per task or per thread, not per turn.
- The live opt-in pilot on a real agent of the owner's (case study F4), where the chains of 8/11 actually happened.

## Files

- `runs.jsonl`: one row per run, with tokens, cost, messages, the Unfold record and the size of the diff.
- `phase0-serial/runs.jsonl`: the two runs set aside by amendment 1.
- The agents' work folders are on the owner's Mac, in `~/OpenBot/Agents/<lead id>/study/<task>-<arm>`.
