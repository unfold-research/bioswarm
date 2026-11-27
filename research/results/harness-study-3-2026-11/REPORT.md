# Harness study 3: an acceptance gate before "done" (2026-11-13)

**Preregistration:** `tasks/HARNESS-STUDY-3-PREREG.md`, with hypothesis H-H04, pushed as `9d9db1a` before the first run.

**How it ran:** with no person in the loop, from 12:01 to 13:18 UTC, on the owner's Mac. Three teams of three OpenBot agents worked in parallel, one team per arm, all on `gpt-6.1-sol` at medium effort with the owner's ChatGPT sign-in:

| Arm | Team | Harness and rules |
|---|---|---|
| C | HS Codex | Codex |
| U | HS Unfold | Pi with the message rules |
| G | HS Gate | U plus an acceptance gate in the lead's loop |

The gate: before the lead may finish, every package needs the team's own `checks/<package>*.test.mjs`, and `node --test 'probe/*.test.mjs' 'checks/*.test.mjs'` must pass. It sends the lead back at most twice per turn.

The tasks are the same ten as study 2: cx01 to cx08, bx08 and bx09.

## Results by arm

| Arm | Accepted | False success | Final tests | Cost per accepted task (US$) | Total cost | Agent messages | Wall time | Output tokens |
|---|---|---|---|---|---|---|---|---|
| C | 9 of 10 | 1 | 487/488 | [redacted] | [redacted] | 57 | 44 min | 129,510 |
| U | 8 of 10 | 2 | 486/488 | [redacted] | [redacted] | 40 | 53 min | 170,746 |
| G | 8 of 10 | 2 | 486/488 | [redacted] | [redacted] | 50 | 77 min | 249,349 |

## Results by task

| Task | C | U | G |
|---|---|---|---|
| cx01 | accepted, 0.539 | accepted, 0.471 | accepted, 0.687 |
| cx02 | 23/24, false success, 0.659 | 23/24, false success, 0.528 | 23/24, false success, 0.465 |
| cx03 | accepted, 0.584 | accepted, 0.463 | accepted, 0.446 |
| cx04 | accepted, 0.607 | accepted, 0.489 | accepted, 0.663 |
| cx05 | accepted, 0.427 | accepted, 0.356 | accepted, 0.573 |
| cx06 | accepted, 0.521 | accepted, 0.472 | accepted, 0.527 |
| cx07 | accepted, 0.475 | 45/46, false success, 0.627 | 45/46, false success, 1.038 |
| cx08 | accepted, 0.864 | accepted, 0.617 | accepted, 0.582 |
| bx08 | accepted, 0.895 | accepted, 0.766 | accepted, 1.225 |
| bx09 | accepted, 0.673 | accepted, 0.734 | accepted, 1.032 |

## What the gate did

- **It worked as built, every time.** It fired in all ten G runs. The lead was first sent back because packages had no tests of their own. The team then wrote `checks/` for every package, and the lead finished with them passing.
- **The per-task message ceiling bound for the first time,** in 4 of 10 tasks, because the gate made leads want to coordinate more.
- **It cost time and tokens.** G took 75% longer than U and produced 46% more output, almost all of it the team's own tests.

## The two false successes are one test

Every false success in this study is the same hidden test: "cursor: tokens dourados e validação", in the `cursor-paginacao` package. Both cx02 and cx07 contain that package. The same is true in study 2.

- **Codex:** fails it on cx02 and passes it on cx07.
- **Pi teams:** with or without rules, with or without the gate, they fail it on both tasks, which makes four of four Pi runs across studies 2 and 3.
- **The gate's own tests did not catch it.** G's team wrote `checks/cursor-paginacao.test.mjs` on both tasks and it passed, because the team's tests encode the team's own reading of the specification. The test that failed checks exact token values ("golden tokens"), and the agents' implementation and their tests share the same reading.

This is the lab's oldest finding, one level up: copies of one model share their errors, so a check the same model writes from the same reading adds little (H-01, H-02 and H-13; V1 to V7).

## Decisions, as preregistered

- **H-H04 refuted in this study.** Two of the stated refutation conditions hold:
  - G accepted no more tasks than U (8 and 8);
  - its false successes were not lower (2 and 2).

  Its cost per accepted task was 131% of U's, just over the 130% that support allowed.
- **G against C:** the gate did not close the gap to Codex on the shared failure. Codex's edge on coupled tasks in studies 2 and 3 comes down to one test of one package.
- **U replicated:** U accepted 8 of 10 here against 7 in study 2. The difference is cx04, which U passed this time. Its messages were again fixed at 4 per task, and its cost per accepted task was level with Codex (0.690 against 0.694).

## Reading

1. **A gate is only as good as the check behind it.** Making agents write and pass their own tests did not catch an error that the tests share with the code. For the gate to pay off, the check has to be independent: a verifier that reads the specification, or the sources, separately from the implementer. The lab measured that before as the strongest single effect (a verifier that reads the sources beat a vote by 3 to 4 points).
2. **Next lever to test: an independent verifier in the loop.** For example, a colleague on another model family, or one with no access to the implementation, writes the acceptance tests from TASK.md alone, and the gate runs those. The lab has never tested a mix of model families as a registered study, and this is where it would matter.
3. **On these ten tasks, the arms differ mostly in one test.** Every arm passes more than 99.5% of the hidden tests. Separating rules from harness needs either more tasks of the cx02/cx07 kind, where exact behaviour hides in the specification, or a different source of difficulty.
4. **A clean run.** The runner fixes from study 2 held: no disk growth, no reused keys, no zero-turn runs.

## Files

- `runs.jsonl`: the 30 runs, with tokens, cost, messages, the Unfold and gate record per agent, and the size of each diff.
- `runner.log`: the runner's log.
- The teams' work folders, including G's `checks/`, are on the owner's Mac in `~/OpenBot/Agents/<lead id>/study/<task>-<arm>`.
