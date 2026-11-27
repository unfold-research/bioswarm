# Spike: the Unfold app's task manager on Pi (2026-11-12)

Question from the owner: should the lab and the app stand on Pi (`earendil-works/pi`, an open agent harness) instead of writing the agent side by hand, and then make it swarm-native? This folder is a first, free answer: the app's own task manager, event record and field board, run unchanged, with a Pi session where the Codex process is today. No model was called and nothing was paid: Pi's fake provider scripts the model's replies.

Front (`programs/historical/fronts.md`): harness, question H2 (what belongs in code and what in the agent).

## What was run

- Pi `@earendil-works/pi-coding-agent` 1.5.2 (MIT), installed with `--ignore-scripts`, Node 22.
- The app from a checkout beside this repository (`../../../void`, commit `fa1b673`, version 0.1.7). Nothing in it was changed.
- `pi-executor.mjs` (112 lines): answers the four provider calls the task manager makes (`thread/start`, `thread/resume`, `turn/start`, `turn/interrupt`) with a Pi session, and translates Pi's events into the notifications the task manager reads.
- `spike.test.mjs`: six tests. `npm install --ignore-scripts && npm test`.

| Test | Result |
|---|---|
| One turn: the agent writes a file, runs a command that fails, answers | task `done`; answer in the conversation; the event record has turn start, a file change (`src/a.txt`, 2 lines added), a command with exit code 3, turn end with tokens; the export counts match; the field board shows the file |
| A second request in the same task | the same Pi session continues and sees the first request; each turn reports its own tokens |
| Stop during a long command | Pi aborts; the task is `interrupted`; the record has the stop and the interrupted turn |
| The model request fails | the task ends as `error` with the provider's message |
| A rule on the outcome | a taken file changed from the shell is put back after the tool ends, the free file keeps its change, and the agent is told in that tool's result |
| Swarm rules as a Pi extension | a `leave_mark` tool deposits a typed mark on a place of the work; a check before a tool runs refuses a write to a file another agent has taken, and the agent is told why; the write never runs |

## What this shows

1. **The seam is small.** The task manager talks to its provider through four calls and five kinds of notification. Everything above that seam (conversations, routing, hand-off, the event record, the field board, the export) ran on Pi with no change.
2. **The three levers the lab's results point to are hooks in Pi.** Deciding in code before the agent acts is the `tool_call` event, which can block or rewrite a call. The tools an agent has are registered by an extension. What the agent reads can be changed by an extension (not exercised here). With the Codex process the app has one of the three, and only for its question tool.
3. **Pi has no sub-agents by design**, so the swarm layer (field, triggers, regimes) stays ours and does not fight another orchestration.
4. **Models become a parameter.** A session takes its model from a runtime with many providers; a second attempt by another model family is a configuration, not a second integration. Not exercised: only the fake provider ran.

## What it does not show, and what a real port still needs

| Gap | Why it matters |
|---|---|
| No comparison with Codex | the paid probe below ran real models on Pi; quality, speed and cost against Codex on the same tasks are unknown. The app uses the owner's Codex sign-in today; on Pi it needs a provider credential, and which subscriptions Pi accepts was not checked |
| Approvals and sandbox | the app asks Codex for `approvalPolicy: on-request` and its own permission profile. Pi runs tools with the permissions of its process. The app's approval of sensitive actions would have to be rebuilt on the `tool_call` hook |
| The question tool | the app gives Codex one dynamic tool so that an agent can ask the person. The adapter ignores it. It would become an extension tool wired to the app's question flow, which lives in `runtime.cjs`, outside the task manager |
| Session persistence | sessions are in memory here: after a restart a resumed task opens without its history. Pi has persistent sessions; a task would map to a session file |
| Images and audio | only the text of a request is passed |
| The rest of the runtime | outside the task manager the app also calls the provider for account limits, connector configuration and sign-in (MCP), the welcome message and background titles: `account/rateLimits/read`, `config/*`, `mcpServer*`, and its own `thread/start` and `turn/start` in `runtime.cjs` and `connectors.cjs`. Pi has its own MCP support, so connectors would be redone, not translated |
| Lines removed by an overwrite | Pi's `write` gives the new content only; the adapter reports lines added and no lines removed |
| Reasoning tokens | Pi's usage has input, cache read, cache write and output; reasoning is not separate |
| Pi's system prompt | it presents the agent as a coding assistant inside Pi; the app would replace it |
| The hosted runtime | not looked at |

## Paid probe with real models (2026-11-12)

Owner approval for up to [US$ redacted]; spent **[US$ redacted]** as Pi prices it (Haiku 5.5 at [US$ redacted] and 0.50 per million tokens, Sonnet 5.5 at 2 and 10), 27 runs. `real-run.mjs` runs the same task manager and adapter with Claude models through the Anthropic API on three synthetic tasks in a temporary folder, each checked by the project's own tests afterwards; per-run data in `real-run.json`. A probe, not a registered study: three tasks written by us, one to ten runs per cell.

Tasks: **t1** a bug with a failing test; **t2** a new function and its test; **t3** the bug of t1 in a file that another agent has *taken*, plus a second fault in a free file. In t3 the agent is told nothing about taken files; it meets the rule only if it tries to change the file.

| Task | Model | Rule on | Runs | Tests pass | Taken file changed | Met the rule | Left a mark | US$ per run | Seconds |
|---|---|---|---|---|---|---|---|---|---|
| t1 | Haiku 5.5 | – | 1 | 1 | – | – | – | [redacted] | 16 |
| t2 | Haiku 5.5 | – | 1 | 1 | – | – | – | [redacted] | 6 |
| t1 | Sonnet 5.5 | – | 1 | 1 | – | – | – | [redacted] | 14 |
| t2 | Sonnet 5.5 | – | 1 | 1 | – | – | – | [redacted] | 5 |
| t3 | Haiku 5.5 | the `write` and `edit` tools | 10 | 0 | **0** | 10 | 10 | [redacted] | 13 |
| t3 | Sonnet 5.5 | the `write` and `edit` tools | 5 | 4 | **4** | 1 | 1 | [redacted] | 9 |
| t3 | Sonnet 5.5 | the outcome (file put back) | 5 | 0 | **0** | 5 | 5 | [redacted] | 13 |
| t3 | Haiku 5.5 | the outcome (file put back) | 3 | 0 | **0** | 3 | 3 | [redacted] | 13 |

In t3 the tests cannot pass unless the taken file is changed, so "tests pass" there means the rule was not kept.

What it shows:

1. **Pi with a real model does the work through the adapter.** The four plain tasks passed on both models. A small task cost a tenth of a cent on the small model and one to two cents on the larger, in 5 to 16 seconds.
2. **A rule placed on a tool binds only an agent that uses that tool.** The small model edited through the `edit` tool every time, was refused, did the free change, left a mark (a finding or a question) and did not go around the refusal: 10 of 10. The larger model made its changes from the shell in 4 of 5 runs, never called `edit`, never met the rule, and changed the taken file. It did not defy the rule; the rule was not where it worked. In the one run where it used `edit`, it behaved as the small model did.
3. **A rule on the outcome held for both.** With the file put back after any tool that changed it, and the agent told so in that tool's result, the larger model stopped at the first undo in 5 of 5 runs, did not try again and left a mark. This is the lab's "the rule in code, not in the agent" result again, one level down: the code has to guard the state of the work, not the door the agent is expected to use.
4. **Agents took up the mark unprompted once they were refused**: 19 of 19 runs that met a rule left one, with no instruction to do so beyond the tool's one-line description and the refusal's last sentence ("work elsewhere or leave a mark"). That sentence is an instruction; a refusal without it was not tried.
5. **The record misses changes made from the shell.** The larger model's edits appear in the event record as commands, not as file changes (0 file changes recorded in 9 of its 10 t3 runs), so the field board would not show them. This is a property of recording by tool event and holds for any agent that edits through the shell. A record of what changed needs to look at the files (a diff of the task folder after each turn), not at the tools.

Limits: synthetic tasks of a few lines; one provider; whether the free fault of t3 was fixed was not measured separately; Pi's default thinking level and system prompt were used; no comparison with Codex was run, so nothing here says which agent is better.

## Reading

Pi is a sound base for the agent side, and the spike supports using it first where the lab writes agent loops by hand: the next study with many agents and a shared field. In the app the honest next step is a second executor beside Codex, drawn per task and recorded in the `regime` field that the event record already has, so that the two are compared on the owner's real work before anything is removed. That step needs a provider credential and paid calls beyond the probe above, which need the owner's approval. Before it, the record has to see changes made from the shell (point 5 of the paid probe).

What would change this reading: a real run in which Pi's agent is clearly worse than Codex on the same tasks, or a cost per task that the subscription now hides.
