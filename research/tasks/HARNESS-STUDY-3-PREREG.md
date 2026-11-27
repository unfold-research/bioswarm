# Harness study 3: an acceptance gate before "done" (preregistration, 2026-11-13)

**Division:** Harness (`programs/harness.md`).
**New hypothesis:** H-H04.
**Follows:** study 2 (`results/harness-study-2-2026-11/REPORT.md`), where:
- both Pi arms declared success on coupled tasks with a hidden test still failing (cx02, cx04 and cx07);
- Codex teams accepted 9 of 10 coupled tasks against 7 for each Pi arm;
- the message rules capped coordination but did not touch this.

The case study's lever L6, verifiable acceptance before a hand-off is accepted, is the next lever to test. The owner authorized this study on 2026-11-13 ("Yes, do it"). It is written and pushed before the first run.

## H-H04

**Statement.** An acceptance gate enforced in the lead's loop lowers false success on coupled tasks without a large rise in cost. Before the lead may finish, every package must have the team's own tests written from the specification, and those tests must pass together with the visible ones.

**What the gate does** (`gate` option of the Unfold extension, in code):
1. When the lead is about to settle, the extension checks `<task>/checks/` for a `<package>*.test.mjs` file for every package in `src/`.
2. It runs `node --test 'probe/*.test.mjs' 'checks/*.test.mjs'` in the task folder.
3. If a file is missing or the run fails, the lead is told what is missing or failing, with the failing lines, and continues.
4. This happens at most twice per turn, so a run always ends.

The colleagues have no gate; their work reaches the lead's gate through the lead. The gate never sees the hidden final suite.

## Arms and teams

All agents run `gpt-6.1-sol` at medium effort, with full access and the owner's ChatGPT sign-in. Each team is a lead and two colleagues.

| Arm | Team | Harness and rules |
|---|---|---|
| C | HS Codex Líder, Colega, Colega 2 | Codex. The reference, the best on coupled tasks in study 2 |
| U | HS Unfold Líder, Colega, Colega 2 | Pi with the Unfold message rules of study 2 (2 per turn, 3 per task, 600 characters) |
| G | HS Gate Líder, Colega, Colega 2 | U plus the acceptance gate on the lead |

The G team is the former HS Pi trio, renamed for this study through OpenBot's `update_profile`.

The P arm (Pi without rules) is dropped. Studies 1 and 2 showed U and P alike on acceptance and close on cost, so U now stands for the harness, and G differs from U only by the gate.

## Tasks, order and procedure

The ten tasks of study 2: cx01 to cx08, bx08 and bx09. They were run by all three teams in parallel, in the same order.

Everything else is unchanged from study 2:
- fresh fixtures;
- chats cleared and the field emptied before each run;
- pending approvals declined;
- a run ends when all three agents have been idle for 60 seconds, with a 40-minute timeout;
- the same price table;
- a unique retry key for every attempt;
- the database read live in read-only mode.

## Decision rules (stated now)

- **H-H04 supported in this study** if all three hold:
  - G has at most one false success, where U had three in study 2 and has whatever it has here;
  - G accepts at least two tasks more than U in this study;
  - G's cost per accepted task is at most 130% of U's.
- **H-H04 refuted in this study** if G accepts no more tasks than U, or its false successes are not lower than U's.
- **Between the two:** inconclusive, reported as such.
- **G against C** is reported: does the gate close the gap to Codex on coupled tasks?
- **U this time against U in study 2** is reported as a replication check of the U team on the same tasks.

## Stopping and spending

As in study 2:
- everything goes through the owner's ChatGPT subscription, with no API spend;
- an arm whose lead stays queued for 15 minutes stops on a suspected usage limit and resumes later.
