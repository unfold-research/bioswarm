# Harness study 2: trios on coupled tasks, with a message ceiling per task (preregistration, 2026-11-13)

**Division:** Harness (`programs/harness.md`).
**Hypotheses:** H-H01 (primary) and H-H02.
**Follows:** study 1 (`results/harness-study-2026-11/REPORT.md`). There, a pair on well-specified tasks exchanged 2 to 5 messages and coordination was not where the cost was. The rules cut messages by 38% but not cost, and the message ceiling counted per turn, so it could not cap a back-and-forth.

The owner authorized this study on 2026-11-13 ("autorizo, monta e dispara"). It is written and pushed before the first run.

## What changes from study 1, and why

| Change | Why |
|---|---|
| Teams of three per arm: a lead and two colleagues | More agents means more hand-offs, which is where the 8/11 server spent its money |
| The eight class-c tasks (cx01 to cx08), plus bx08 and bx09 (five packages each) | The cx bugs are coupled across modules: some compensate each other, so fixing one alone breaks another. This calls for coordination, or for one owner of the coupled pair |
| The Unfold arm caps messages per task: `messagesPerSession: 3` per agent, with `messagesPerRun: 2` and 600 characters | Study 1's per-turn ceiling reset at every reply. A session ends when the runner starts a new chat before each task, so a session is a task. Two messages per turn lets the lead brief both colleagues at once |

## Agents and arms

There are nine agents in the owner's OpenBot, all on `gpt-6.1-sol` at medium effort, with full access and the owner's ChatGPT sign-in.

| Arm | Team | Harness | Unfold marker |
|---|---|---|---|
| C | HS Codex Líder, HS Codex Colega, HS Codex Colega 2 | Codex | n/a |
| P | HS Pi Líder, HS Pi Colega, HS Pi Colega 2 | Pi | absent |
| U | HS Unfold Líder, HS Unfold Colega, HS Unfold Colega 2 | Pi | `{"messagesPerRun":2,"messagesPerSession":3,"messageChars":600,"runBudgetUsd":3}` |

The three "Colega 2" agents were created for this study by HS Unfold Líder through OpenBot's `create_agent` tool.

## Tasks and order

Ten tasks, every one run by all three teams in parallel, in this order:

cx01, cx02, cx03, cx04, cx05, cx06, cx07, cx08, bx08, bx09.

On 2026-11-13 the scorer was calibrated on all ten: every buggy repository fails its hidden final suite (20 to 144 tests) and every reference solution passes it.

The lead's message is the same in every arm (`run.mjs`). It names the folder, says some defects may cross packages, names the two colleagues and says they should split the work as they see fit. It also forbids talking to any other agent and asks for a summary when all are done.

## Runs, measures and pricing

The same as study 1:
- **Fresh fixture** for every run.
- **Clean start:** the runner clears every agent's chat before each run, and empties the shared field before each U run.
- **Pending requests:** approvals are declined, and questions are answered with "proceed only in the task folder".
- **When a run ends:** all three agents idle for 60 seconds. The timeout is 40 minutes.
- **Measures:** accepted (every hidden final test passes), final tests passed, false success, agent messages and alternations, turns, wall time, tokens, the uncached input share, and rule firings and marks.
- **Pricing:** cost from tokens at one price table (OpenAI list price for `gpt-6.1-sol`), with OpenBot's own estimate beside it.

## Decision rules (stated now)

- **H-H01 supported in this study** if all three hold:
  - U's cost per accepted task is at most 85% of P's;
  - U accepts at most one task fewer than P;
  - U sends fewer agent messages than P in total.

  The threshold is looser than study 1's 70%: on coupled tasks part of the cost is real coordination that must happen anyway.
- **H-H01 refuted in this study** if U's cost per accepted task is at least P's, or U accepts two or more tasks fewer.
- **Between the two:** inconclusive, reported as such.
- **H-H02** holds if the rules fire and are kept, with no messages sent another way and no edits to taken files. It fails if the record shows the agents getting around them.
- **C against U** is reported, not decided.
- **The cost of capping messages** is reported in every case: if U accepts fewer coupled tasks than P, the per-task ceiling is too tight for coupled work, and that is a result.

## Stopping and spending

- **Spending:** all calls go through the owner's ChatGPT subscription, so there is no API spend.
- **Usage limit:** if a lead's delivery stays queued or starting for more than 15 minutes, the runner treats it as a usage limit and stops that arm. OpenBot queues work until the limit resets. Stopped arms resume in a later session from where they stopped, and the gap is reported.
- **Timeouts:** a run that times out counts as not accepted.
