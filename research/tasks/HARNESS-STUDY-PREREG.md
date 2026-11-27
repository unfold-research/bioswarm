# Harness study: rules in the loop for a pair of OpenBot agents (preregistration, 2026-11-13)

**Division:** Harness (`programs/harness.md`).
**Hypotheses:** H-H01 (primary), H-H02 (secondary), H-H03 (reported only, since the ceiling is unlikely to bind).
**Follows:** the pilot (`results/harness-pilot-2026-11-12/REPORT.md`), which showed that the machinery works and that single-agent tasks of a few lines cannot separate the arms.

Written and pushed before the first run.

## Question

The setting:
- two OpenBot agents on the same model work together on a repair task that spans several independent packages;
- the lead receives the task and is told that a colleague can take part of it.

The question: does running the coordination rules inside the agents' loop (Pi with the Unfold extension) lower the cost per accepted task, compared with the same harness without the rules (Pi) and with Codex, without accepting fewer tasks?

The rules are the shared field, at most one short pointer message per request, the taken-file rule on the outcome, and a spending ceiling per request.

## Agents and arms

**Agents:**
- **Lead:** "Void Local" (`agent-…`).
- **Mate:** "Void Local 2", created by the owner before the first run, with the same settings.
- **Both:** in OpenBot on the owner's Mac, with full access and Local scripts on; model `gpt-6.1-sol`, reasoning effort medium; the owner's ChatGPT sign-in.

| Arm | Both agents | Unfold marker |
|---|---|---|
| C | Codex, `gpt-6.1-sol` | n/a |
| P | Pi, `openai/gpt-6.1-sol` | absent in both folders |
| U | Pi, `openai/gpt-6.1-sol` | present in both, at the defaults: [US$ redacted] per request, 1 message of at most 600 characters |

Before each run the runner does three things for each agent:
1. sets the provider through the API;
2. sets or removes the marker;
3. clears the chat, which starts a new provider process so the marker is read.

## Tasks

The nine OpenBot-Bench repositories, bx01 to bx09 (`internal/openbot-case/bench/tasks/`). Each has 2 to 5 independent packages, a statement with the full specification, visible probe tests and a hidden final suite of 58 to 144 tests.

On 2026-11-13 the scorer was calibrated on all nine: every buggy repository fails its final suite and every reference solution passes it (`experiments/openbot-unfold-mode/study/run.mjs --check`).

**What the agents get:**
- a fresh copy in `<lead folder>/study/<task>-<arm>`, holding `src/`, `probe/` and `TASK.md` (the statement), as its own git repository;
- never `final/` or `solution/`.

**The lead's message** (the same in every arm, in `run.mjs`):
- names the folder;
- says the colleague may take part of the work and that they should split it as they see fit;
- forbids talking to any other agent;
- asks for a short summary when both are done.

## Order

There is one permutation of the arms per task, drawn with seed 20261113 before any run:

| Task | Order |
|---|---|
| bx01 | C U P |
| bx02 | C P U |
| bx03 | C U P |
| bx04 | P C U |
| bx05 | U P C |
| bx06 | C P U |
| bx07 | P U C |
| bx08 | C P U |
| bx09 | U C P |

That makes 27 runs, executed by `run.mjs --all` with no person in the loop.

## A run ends when

- the lead's delivery has ended,
- no turn or delivery of either agent has been open for 60 seconds,

or after 25 minutes, which counts as not accepted. During a run the runner declines every approval request and answers every question with "proceed without asking, only in the task folder".

## Measures

- **Accepted:** every hidden final test passes. This is the primary condition.
- **Primary outcome:** cost per accepted task, summed over the arm. Cost is computed from both agents' token counts in OpenBot's usage records over the run window, priced with one table for every arm: OpenAI's list price for `gpt-6.1-sol`, the basis OpenBot records for Codex ([US$ redacted] input, 0.10 cached, 10 output per million). OpenBot's own estimate is reported beside it.
- **Secondary outcomes:**
  - final tests passed;
  - false success (probe all-pass but final failing);
  - agent-to-agent messages and their alternations (ping-pong);
  - turns;
  - wall time;
  - uncached input share (whether the extension disturbs prompt caching, a question the pilot raised);
  - rule firings and marks in arm U.

## Decision rules (stated now)

- **H-H01 supported in this study** if all three hold:
  - U's cost per accepted task is at most 70% of P's;
  - U accepts at most one task fewer than P;
  - U sends fewer agent messages than P in total.
- **H-H01 refuted in this study** if U costs as much as or more than P per accepted task, or accepts two or more tasks fewer.
- **C against U** is reported, not decided. Codex and Pi differ as harnesses, so a gap between them mixes the harness with the rules.
- **H-H02**, qualitatively:
  - **Holds** if, in U, rules fire and the agents keep to them: after a refusal they use the field instead of working around the rule.
  - **Fails** if in U they reach the same effect another way: messages through another tool, or edits to taken files.
- **Inconclusive:** with nine tasks, a difference smaller than one accepted task, or a cost difference within the spread between tasks, is not a result.

## Spending and stopping

- **Spending:** all model calls go through the owner's ChatGPT subscription, so there is no API spend.
- **Stopping on a limit:** the runner stops at the first error that names a usage limit or a 429. The study resumes in the remaining order when the limit resets, and the stop is reported.
- **Request limit:** Local scripts allows 30 requests per agent per hour, and the runner sends one message per run.

## What would change the plan

- **Every arm accepts every task:** the outcome is cost alone, and acceptance has no power.
- **The lead never involves the mate in any arm:** the tasks do not call for a pair, the message rules cannot act, and the next study needs work that cannot be done alone in one pass.
- **The rules fire and acceptance drops:** the defaults are too strict, which is a result in itself.

## Amendment 1 (2026-11-13, written after the first two runs and before any run under it)

**Change.** At the owner's request the runs moved from serial to parallel. There is now one pair of agents per arm, and the three pairs run at the same time. Each pair works its own arm through the nine tasks, in the same task order (bx01 to bx09), so the three arms see the same time of day. The pairs are named for the research record:

| Arm | Lead | Mate |
|---|---|---|
| C | HS Codex Líder (`agent-…`) | HS Codex Colega (`agent-…`) |
| P | HS Pi Líder (`agent-…`) | HS Pi Colega (`agent-…`) |
| U | HS Unfold Líder (`agent-…`, formerly "Void Local") | HS Unfold Colega (`agent-…`, formerly "Void Local 2") |

"HS" stands for Harness Study. All six run model `gpt-6.1-sol` at medium effort, with full access, on the owner's ChatGPT sign-in.
- **How they were made:** the four new agents were created by the U lead through OpenBot's own `create_agent` tool, and the two existing ones were renamed with `update_profile`.
- **Fixed arms:** each pair keeps its arm for the whole study, and its provider is only re-asserted before each run.
- **Clean field:** the shared field (`~/OpenBot/Shared/unfold/field.jsonl`) is emptied before every U run, so marks do not carry from one task to the next.

**Phase 0, set aside.** Two runs happened under the serial design with the original pair, before this amendment. Both are kept in `results/harness-study-2026-11/phase0-serial/` and left out of the analysis.

| Run | Outcome |
|---|---|
| bx01 C | Accepted, 58/58 hidden tests, [US$ redacted] 3 agent messages |
| bx01 U | Stopped by the runner during the switch. The agents finished on their own; scored afterwards it was accepted (58/58), with 5 agent messages over 4 turns |

**Why the arms are confounded with their pairs.** The six agents are new and configured alike, but the U pair has run more conversations than the other two. Chats are cleared before every run, so what can differ is only what OpenBot keeps outside the chat (memories). The U pair has none for these tasks.

**Seen before this amendment, and not a change to the rules.** The message ceiling counts per run, meaning per agent turn. In phase 0 each agent sent one message per turn, but the pair exchanged messages over several turns. The ceiling stops long messages and bursts within a turn; it does not cap a back-and-forth across turns. The study keeps the rules as registered and reports this.

**Unchanged:** tasks, measures, decision rules, the price table and the stopping rules.
