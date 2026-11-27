# Harness study 2: trios on coupled tasks, with a message ceiling per task (2026-11-13)

**Preregistration:** `tasks/HARNESS-STUDY-2-PREREG.md`, pushed as `65f0adf` before the first run.

**How it ran:** with no person in the loop, from 04:19 to 05:27 UTC, on the owner's Mac. Three teams of three OpenBot agents worked in parallel, one team per arm, all on `gpt-6.1-sol` at medium effort with the owner's ChatGPT sign-in:

| Arm | Team | Harness |
|---|---|---|
| C | HS Codex Líder, Colega, Colega 2 | Codex |
| P | HS Pi Líder, Colega, Colega 2 | Pi |
| U | HS Unfold Líder, Colega, Colega 2 | Pi with the Unfold extension: at most 2 messages per turn, 3 per task, 600 characters each |

There were ten tasks: cx01 to cx08, whose bugs are coupled across modules, plus bx08 and bx09 (five packages each). Each was scored on a hidden final suite of 20 to 144 tests.

## Results by arm

| Arm | Accepted | Final tests | Cost, one price table (US$) | Cost per accepted task | Agent messages | Alternations | Turns | Wall time | Output tokens | False success |
|---|---|---|---|---|---|---|---|---|---|---|
| C | 9 of 10 | 487/488 | [redacted] | [redacted] | 52 | 22 | 50 | 37 min | 118,589 | 1 |
| P | 7 of 10 | 485/488 | [redacted] | [redacted] | 64 | 29 | 38 | 48 min | 165,265 | 3 |
| U | 7 of 10 | 485/488 | [redacted] | [redacted] | 40 | 20 | 34 | 46 min | 158,157 | 3 |

## Results by task

| Task | C | P | U |
|---|---|---|---|
| cx01 | accepted, 0.517, 5 msg | accepted, 0.427, 5 msg | accepted, 0.493, 4 msg |
| cx02 | 23/24 (false success), 0.517, 6 | 23/24 (false success), 0.464, 5 | 23/24 (false success), 0.422, 4 |
| cx03 | accepted, 0.441, 4 | accepted, 0.411, 8 | accepted, 0.411, 4 |
| cx04 | accepted, 0.549, 6 | 32/33 (false success), 0.415, 5 | 32/33 (false success), 0.470, 4 |
| cx05 | accepted, 0.404, 4 | accepted, 0.512, 9 | accepted, 0.406, 4 |
| cx06 | accepted, 0.409, 5 | accepted, 0.506, 12 | accepted, 0.351, 4 |
| cx07 | accepted, 0.470, 5 | 45/46 (false success), 0.515, 4 | 45/46 (false success), 0.553, 4 |
| cx08 | accepted, 0.602, 4 | accepted, 0.437, 4 | accepted, 0.422, 4 |
| bx08 | accepted, 0.778, 6 | accepted, 0.763, 6 | accepted, 0.637, 4 |
| bx09 | accepted, 0.712, 7 | accepted, 0.729, 6 | accepted, 0.806, 4 |

## What the rules did in arm U

- **Same shape every time:** every task had exactly four agent messages. The lead briefed both colleagues and each colleague reported once.
- **Pointer rule:** it refused 19 long reports, and each was resent short.
- **Per-task ceiling:** it never had to fire, because nobody reached three messages.
- **Field:** the agents left 52 marks, with no instruction beyond the tool description and the refusal text.

## Decisions, as preregistered

- **H-H01 inconclusive in this study.**
  - **The test:** U's cost per accepted task was [US$ redacted] against 0.740 for P, which is 96% of P. Support needed at most 85% and refutation needed at least 100%, so the result falls between the two.
  - **What did hold:** U accepted as many tasks as P (7 and 7) and sent 38% fewer agent messages (40 against 64). Its total cost was 4% lower.
- **H-H02 holds**, for the second study running. The rules fired and were kept, and the record shows no message by another route.
- **C against U** is reported, not decided. Codex accepted two more coupled tasks (cx04, cx07) and had the lowest cost per accepted task (0.600). Both Pi arms failed the same tasks by the same single hidden test, so the gap is the harness, not the rules.

## Reading

1. **The rules make coordination predictable.** U's messages per task were fixed at 4. P's ran from 4 to 12, with spikes of 8, 9 and 12 on cx03, cx05 and cx06, and those spikes cost more (cx06: P [US$ redacted] against U 0.351). The rules work as a cap on the worst case, more than as a saving on the average. With three agents the saving on the average was small, because coordination is still a small share of what a run costs.
2. **On coupled tasks the harness matters more than the rules.**
   - Codex teams fixed the cross-module defects that both Pi teams missed, and both Pi teams declared success with one hidden test still failing (cx04, cx07).
   - The rules neither caused nor fixed this: P and U failed identically.
   - For the lab's own harness, this argues for Pi plus rules as the base and for checking acceptance before declaring done. The case study's L6 (verifiable acceptance on every hand-off) is the next lever to test, more than further message rules.
3. **The per-task ceiling was not tested under pressure.** Briefs and reports fit in it. To press it, the tasks must make agents want to talk more, for example because ownership is unclear.

## Incidents, and how they were handled

Both incidents were caused by the runner, and both are fixed.

- **The disk filled up.** At about 04:45 the Mac's disk filled. The runner had been copying OpenBot's 120 MB database on every 10-second poll and never removing the copies: 444 copies, 48 GB.
  - The runner was stopped and the copies were deleted, which freed 44 GB.
  - OpenBot's database passed `integrity_check`.
  - The runner now reads the live database read-only, and SQLite's WAL mode allows that beside OpenBot's own writes.
  - Five runs failed with ENOSPC and were not recorded.
  - Four recorded runs ended within a few minutes of the disk filling (cx05 P and U, cx07 C, cx06 U). All four were accepted and are kept.
- **A resumed run reused its message key.** When the runner resumed, 8 runs reused the retry key of their interrupted attempt. OpenBot returned the old, already finished delivery, so the agents did no work. Those runs are kept apart in `invalid-reused-key.jsonl`. The key is now unique per attempt, and the 8 runs were done again from scratch.

**Model calls of the invalid and failed attempts:** a few cents. Like everything else here, they went through the subscription.

## Files

- `runs.jsonl`: the 30 valid runs.
- `invalid-reused-key.jsonl`: the 8 invalid attempts.
- The teams' work folders are on the owner's Mac, in `~/OpenBot/Agents/<lead id>/study/<task>-<arm>`.
