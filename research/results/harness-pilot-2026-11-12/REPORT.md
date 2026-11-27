# Harness pilot: three arms on one OpenBot agent (2026-11-12)

Preregistration: `tasks/HARNESS-PILOT-PREREG.md`, pushed as commit `dab844f` at 23:31, before the first run. Division: Harness (`programs/harness.md`).

What this is: a check of the machinery for the paired study. **It tests no hypothesis.** It is three tasks with one run per arm.

## What was run

| | |
|---|---|
| Agent | "Void Local" in OpenBot on the owner's Mac |
| Model | `gpt-6.1-sol`, reasoning effort medium |
| Sign-in | the owner's ChatGPT |
| Arms | C = Codex; P = Pi without the Unfold marker; U = Pi with the marker, at its defaults |
| Control | the lab alone, through OpenBot's Local scripts API: switch provider, set or remove the marker, "New chat", send the task, wait for the answer |
| Fixtures | a fresh copy of the repository at a fixed commit for each run |
| Acceptance | hidden check scripts in `experiments/openbot-unfold-mode/pilot/checks/` |
| Cost | OpenBot's own `estimated_cost_usd`, at list prices; the runs themselves went through the subscription |

## Results

| Run | Accepted | Wall time (s) | Estimated cost (US$) | Usage records | Diff |
|---|---|---|---|---|---|
| T1-U | yes | 67 | [redacted] | 1 | 2 files, +2 −2 |
| T1-C | yes | 54 | [redacted] | 5 | 3 files, +6 −2 (also touched `.dockerignore`) |
| T1-P | yes | 107 | [redacted] | 1 | 2 files, +2 −2 |
| T2-P | yes | 61 | [redacted] | 1 | 2 files, +18 −1 |
| T2-U | yes | 58 | [redacted] | 1 | 2 files, +18 −1 |
| T2-C | yes | 42 | [redacted] | 4 | 2 files, +21 −1 |
| T3-C | yes | 70 | [redacted] | 6 | 1 file, +20 |
| T3-P | yes | 104 | [redacted] | 1 | 1 file, +12 |
| T3-U | yes | 96 | [redacted] | 1 | 1 file, +12 |

By arm, summed over the three tasks:

| Arm | Accepted | Wall time | Estimated cost |
|---|---|---|---|
| C, Codex | 3 of 3 | 166 s | [US$ redacted] |
| P, Pi | 3 of 3 | 272 s | [US$ redacted] |
| U, Pi with Unfold | 3 of 3 | 221 s | [US$ redacted] |

No Unfold rule fired in arm U: no message, no taken file, and no request near the [US$ redacted] ceiling. The extension's own run costs (0.045, 0.107, 0.109) match OpenBot's records.

## Reading, against the preregistered conditions

1. **The machinery works.** Every step ran from this session with no person in the loop:
   - the provider switch, both ways;
   - the marker, with the new chat that applies it;
   - the fixtures;
   - the hidden checks, each of which was first shown to fail on the unchanged code and pass on a correct fix;
   - the cost reading, which joins OpenBot's usage records by turn ID.
2. **Every arm accepted every task.** The preregistration's own condition says these tasks are too easy to separate the arms. The study needs larger tasks.
3. **The rules never fired.** The tasks gave them nothing to act on: one agent, no second agent, small budgets. Another of the preregistered conditions, so the study needs tasks where they can fire. That means a second agent in Unfold mode working in the same field, tasks long enough to approach the ceiling, and files that another agent holds.
4. **The cost differences are not results.** The sample is one run per cell. U costs more than P on T2 and T3 even though nothing fired; the tool descriptions the extension adds to the prompt may explain part of it, and noise the rest. Codex's estimates come from more usage records per turn than Pi's, and the two may count cached tokens differently. A comparison of cost across harnesses needs that checked first.

## What changes for the study

- **Tasks.** Use tasks that do not fit one quick pass: several files, an investigation before the fix, or work two agents share.
- **A second agent.** Add one in Unfold mode, so that the field and the message rules have a counterpart.
- **Cost.** Check how OpenBot estimates cost for Codex and for Pi before comparing the two.
- **The arms.** Keep P: the gap between P and U is the effect of the rules alone.

## Files

`runs.jsonl` holds turn IDs, wall time and acceptance. `costs.jsonl` holds OpenBot's usage per turn. `diffs.txt` holds the size of each run's change. The agent's work folders stay on the owner's Mac, in `~/OpenBot/Agents/agent-…/work/`.
