# The app as an instrument: the event record of Unfold

Since version 0.1.4 (2026-11-12) the Unfold app for macOS (`unfold-research/unfold`, archived; called `void` until 2026-11-12) keeps a local record of what happens in each task, and since 0.1.5 it records how a turn went and exports the record as counts. This page says what the record holds, how to take it out, and what it can and cannot support. Front (`programs/historical/fronts.md`): harness, questions H2 and H3; it is also the lab's first source of data on one agent doing real work.

## What the app is today

A principal conversation classifies each message as conversation or as work on a project. Work becomes a task for that project's agent, with a brief, and each task runs in its own Codex session. No task is split between agents and agents read nothing of each other's. In the paper's terms this is a router with one agent per task, and the principal assigns work, so it is not leaderless. The record names this regime `router-one-agent`.

Since 0.1.7 the app has no modes (plan D-026) and shows one board beside the conversation, folded from this same record: the files changed in the last day under the task that changed them. It is the first view of the field in the product; findings, claims and open questions are designed as further sections and have no real source yet.

## The record

`events.jsonl` in the application-data directory (`~/Library/Application Support/Unfold/` on macOS), one JSON object per line, local runtime only. Every event has `v`, `at` (ms), `kind`, `task`, `agent`, `project`.

| `kind` | Fields | Meaning |
|---|---|---|
| `route` | `action`, `provider`, `fallbackReason`, `durationMs` | the principal's decision on a message: converse, propose, delegate, decline |
| `handoff` | `from`, `briefChars` | a task created for a project agent from another conversation |
| `turn-start` | `turn`, `regime`, `origin`, `sequence`, `previousStatus`, `sincePreviousMs` | a request accepted by the provider; `sequence` above 1 is a further request in the same task |
| `item` | `type` and, by type: exit code, duration, output size and read or search actions of a command; path, kind and lines added and removed of a file change; server and tool of a tool call; model of a sub-agent call | one finished action of the agent |
| `stop` | `turn` | the person stopped the turn |
| `retry` | `previousStatus` | the person asked for the last request again |
| `changes` | `turn`, `source` (folder), `changes` (path, kind, lines added and removed), `more` | what the turn changed in the task folder, read from the folder; replaces the file tools' report for that turn (since 0.1.8, Git repositories only) |
| `verdict` | `message`, `value` (good, bad, or null when taken back) | the person's word on a finished answer, one tap (since 0.1.9) |
| `turn-end` | `status` (done, error, interrupted), `durationMs`, `firstEventMs`, `tokens` | the end of a turn; `tokens` is what the session added in this turn |

It never holds the text of a conversation, a command line, a search query or the contents of a file. Paths are relative to the task folder; a file outside it appears by name only.

## Export

```sh
node scripts/export-events.cjs "$HOME/Library/Application Support/Unfold/events.jsonl" out.json
```

run in a checkout of the app. The export has one record per task with counts only: turns and their outcomes, follow-ups, retries, stops, duration, token totals, commands and failed commands, reads, searches, file changes, distinct files changed, lines added and removed, tool calls, sub-agent calls, routing actions, and the task it was handed off from. No path, project name or text. Exports are personal data of the person who produced them: keep them out of this repository unless they agreed, and never commit `events.jsonl`.

## What it supports

- Base rates of one agent on real work: tokens, time, commands and files per task; how often a turn ends in error or is stopped.
- Cheap signs of how a task went: a further request soon after the last turn, a retry, a stop. These are proxies. A follow-up can be a correction or the next step, and the record cannot tell which.
- The cost of routing and hand-off: how long the decision takes, how often it falls back, how large the brief is.

## What it does not support

- A complete list of what changed outside a Git repository. Since 0.1.8 a turn's changes are read from the task folder (a Git snapshot before and after the turn, recorded as a `changes` event with `source: folder`), so edits made from the shell are seen; before that, and in a folder that is not a repository, only the agent's file tools are recorded (the gap was found with a larger model in `experiments/pi-executor/`, 2026-11-12).

- Any claim about cause. Tasks are whatever the person asked that day; an easy task and a good regime look the same.
- Any comparison of regimes: there is one. The `regime` field exists so that the app can later draw a regime per task and record it, which would make daily use a randomised comparison.
- Whether the work was right. There is no test result in the record. Since 0.1.9 there is the person's verdict on an answer, when they give one; the export counts `good` and `bad` per task. A verdict that is not given says nothing.

## A second executor

`experiments/pi-executor/` (2026-11-12): the app's task manager, event record and field board ran unchanged on a Pi agent session with a fake provider, through an adapter of about a hundred lines. It shows the seam is small and that swarm rules fit Pi's extension hooks; no real model ran. Its README lists what a real port still needs.

## Next, in order

1. Read one week of the owner's record and write down what the distributions look like.
2. A second regime and a draw per task.
3. Tools for an agent to leave and read marks on the work, through the path the app already uses for its question tool.
