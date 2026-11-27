> Current identity (2026-11-13): Unfold is the lab; Fold is the harness. The Harness division label below is historical. Rules-in-the-loop research now supports the collective defence agenda.

# Fold: swarm harness research

**Division:** Harness, created 2026-11-12 (plan D-032). It sits beside Void, Abracadabra and Murmur, but it is not a field of work. It studies the ground the other three run on. **Question:** when does a rule enforced inside the agent's loop (the field, the limits, the checks) make the same model work better in a group than the same rule given as advice, and what does it take to carry that ground into other people's harnesses?

**First candidate host:** OpenBot (plan D-031). It runs vendor harnesses and accepts Pi and ACP agents, so the lab's harness can enter it as a guest and bring its rules into the loop. The lab already has a baseline of OpenBot's coordination cost from 8/11 (`internal/openbot-case/`).

**Vital tool:** Pi (`earendil-works/pi`, MIT; plan D-033). It is an open agent loop with hooks before and after every tool, extensions, many model providers and no sub-agents of its own. It is the lab's base for:
- agent loops in studies;
- the guest extension in hosts;
- the candidate executor of the Unfold app (plan P-7).

## Achievements (dated, with where the evidence is)

| Date | What | Evidence |
|---|---|---|
| 2026-11-08 | OpenBot read as a swarm. Telemetry on 20 agents and [US$ redacted]: ping-pong trees held 42% of spend, delegated requests 51% | `internal/openbot-case/CASE-STUDY.md`, `F1-REPORT.md` |
| 2026-11-08 | OpenBot-Bench, 17 tasks with 34 runs per arm: the levers (single owner, package-only context, shared board, repair only while checks fail) cut the cost of an OpenBot-style team by 78% and its latency by 83%; one agent was cheaper still | `internal/openbot-case/F2-F3-REPORT.md` |
| 2026-11-08 | Shadow mode: coordination rules would fire 20 to 30 minutes before a request ends. A per-turn budget cannot be enforced from outside the loop, because Claude's usage is written only when the turn ends | `internal/openbot-case/F2-F3-REPORT.md` |
| 2026-11-12 | Pi carries the app: its task manager ran on Pi through a seam of four calls. Real models on three tasks cost [US$ redacted] | `experiments/pi-executor/README.md` |
| 2026-11-12 | A rule on a tool binds only the agent that uses that tool. A rule on the outcome (put the file back after any tool) held for both models, and 19 of 19 refused agents left a mark unprompted | `experiments/pi-executor/README.md` |
| 2026-11-12 | OpenBot's source read. It has no hook before a tool call, so its coordination sits outside the loop. The license is PolyForm Noncommercial. It hosts Pi through RPC and custom agents through ACP | `internal/openbot-case/SOURCE-REVIEW-2026-11-12.md` |
| 2026-11-12 | The Unfold extension for Pi: shared field (`leave_mark` / `read_marks`), message ceiling and pointer rule, taken-file rule on the outcome, per-request spending ceiling and an event record. Seven tests on a real Pi session; the Pi CLI auto-discovers it | `experiments/openbot-unfold-mode/` |
| 2026-11-12 | Local baseline of the owner's OpenBot server: 114 turns, [US$ redacted] cost mostly in long single-agent turns | `internal/openbot-case/local-baseline-2026-11-12/` |
| 2026-11-12 | **Inside the real OpenBot.** The agent "Void Local" ran on Pi 1.5.2 with `gpt-6.1-sol` on the owner's ChatGPT sign-in and loaded the extension. It wrote and read the field ([US$ redacted]), and its `send_message` (`mcp__openbot_<hash>__send_message`) was refused before it ran | `experiments/openbot-unfold-mode/README.md` |
| 2026-11-12 | The lab drives the host itself, without a person in the loop. OpenBot's Local scripts API sends tasks, waits for answers and resets chats; the lab turns the rules on and off through the marker file and reads the host's database read-only | `experiments/openbot-unfold-mode/README.md` |
| 2026-11-12 | **First paired pilot**, 3 tasks × 3 arms on one OpenBot agent, run entirely by the lab: 9 of 9 accepted, and no Unfold rule fired. The machinery for the study works, and the tasks were too small to separate the arms | `results/harness-pilot-2026-11-12/REPORT.md` |
| 2026-11-13 | **First study, preregistered: three named pairs in parallel** (HS Codex / HS Pi / HS Unfold), 9 OpenBot-Bench tasks per arm, run entirely by the lab: 27 of 27 accepted. The Unfold rules cut agent messages by 38% against Pi and 51% against Codex, but cost per accepted task was level ([US$ redacted] / 0.460 / 0.473). H-H01 is refuted in this study; H-H02 holds qualitatively. Coordination was not where the cost was | `results/harness-study-2026-11/REPORT.md` |
| 2026-11-13 | **Second study, preregistered: trios on coupled tasks with a per-task message ceiling**, 30 runs by three named teams of three. Cost per accepted task was inconclusive (U 96% of P), but U fixed messages at 4 per task where P ranged from 4 to 12. Codex accepted 9 of 10 coupled tasks against 7 for both Pi arms, which failed the same tests: on coupled work the harness matters more than the rules. Two runner incidents (a full disk and a reused key) were fixed and reported | `results/harness-study-2-2026-11/REPORT.md` |
| 2026-11-13 | **Third study, preregistered: an acceptance gate in the lead's loop** (HS Gate trio; arms Codex, Pi with rules, and the same plus the gate). The gate fired in 10 of 10 tasks and made teams write and pass their own tests, but accepted no more tasks than without it (8 and 8), with the same false successes and 31% more cost. H-H04 is refuted. Every false success was the same hidden test, which the team's own tests could not see because they share the team's reading of the specification. Next: an independent verifier | `results/harness-study-3-2026-11/REPORT.md` |
| 2026-11-15 | **A compromised member, on the new OpenBot server** (D2, defence agenda). Without the Local scripts API, the research lead (Claude) drove 42 runs through OpenBot's own agent tools with fresh DeepSeek leads. A lead that cannot see the source is fooled 6 of 6 by one lying worker; any lead that can see it catches the lie 6 of 6; one agent is a quarter of the cost. OpenBot shows profiles to teammates and keeps one conversation per agent across model switches | `results/d2-insider-2026-11/REPORT.md` |
| 2026-11-13 | **Fourth study, preregistered: an independent verifier behind the gate**, same model or DeepSeek, writing from the specification only. Neither verifier raised acceptance (9, 9 and 8 of 14), and they cost 139% and 211% of no verifier. Their tests rejected correct code 33% to 50% of the time. Every false success in studies 2 to 4 is one hidden assertion the specification does not state (`results/BENCH-ERRATUM-cursor-paginacao.md`). With it excluded, every arm solves nearly everything, so this benchmark is at its ceiling for this question | `results/harness-study-4-2026-11/REPORT.md` |

## Hypotheses

| id | Statement |
|---|---|
| [H-H01](../hypotheses/H-H01.md) | The same model on the same tasks costs less per accepted task when the rules run in the loop than when they are given as advice |
| [H-H02](../hypotheses/H-H02.md) | A guest harness in a host (Pi plus the Unfold extension in OpenBot) keeps its in-loop effect; the host's own setup does not cancel it |
| [H-H03](../hypotheses/H-H03.md) | A per-request spending ceiling in the loop removes the costliest tail without raising rejections |
| [H-H05](../hypotheses/H-H05.md) | An independent verifier behind the gate cuts false success (refuted in study 4: verifiers that see only the specification guess where it is silent) |
| [H-H04](../hypotheses/H-H04.md) | An acceptance gate in the lead's loop cuts false success on coupled tasks (refuted in study 3: a self-written check shares the implementer's errors) |

## Instruments

- **The extension and its scripts:** `experiments/openbot-unfold-mode/`, with `unfold.sh` (install, on, off, status) and `report.mjs`.
- **The event record** of each agent folder (`.unfold-events.jsonl`).
- **Request trees:** `internal/openbot-case/f1-analyze.cjs`, which can point at any OpenBot database with `OPENBOT_DB`.
- **Host control:** OpenBot's Local scripts API, through the `openbot` connector.
- **Executor:** `experiments/pi-executor/`, the app's executor on Pi.

## Next batch

After the fourth study: the repair benchmark is at its ceiling. The next tasks need a real gap, such as underspecified work, partial information or a compromised member. Under the defence agenda (`programs/defence.md`) that means a threat model first.

After the third study (`results/harness-study-3-2026-11/REPORT.md`): an independent verifier in the loop. Acceptance tests come from someone other than the implementer: another model family, or an agent that sees only TASK.md. The gate then runs those tests.

After the second study (`results/harness-study-2-2026-11/REPORT.md`): test verifiable acceptance before "done" (L6), since both Pi arms declared success with a hidden test failing on coupled tasks; and run tasks with unclear ownership, to press the per-task ceiling.

After the first study (`results/harness-study-2026-11/REPORT.md`):
- tasks where coordination drifts, such as unclear ownership, three or more agents, or long horizons;
- a message ceiling counted per task or thread, not per turn;
- the live opt-in pilot on a real agent of the owner's.

The earlier plan follows.

Paired real tasks on one agent, in three arms with the same model:
1. Codex;
2. Pi without the marker;
3. Pi with Unfold mode.

The second arm separates the harness from the rules. Protocol and success criteria are in `experiments/openbot-unfold-mode/README.md`. The pilot showed the arms switch and the measures work (`results/harness-pilot-2026-11-12/REPORT.md`). The study needs larger tasks, a second agent in Unfold mode in the same field, and a check of how OpenBot estimates cost for Codex and for Pi.

## What this division does not claim

- That OpenBot is the lab's code base. Its license rules that out (plan D-030).
- Any result yet on real work. Everything above is a mechanism check, a probe or a baseline.
