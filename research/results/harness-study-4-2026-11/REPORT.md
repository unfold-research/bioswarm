# Harness study 4: an independent verifier behind the gate (2026-11-13)

> Identity note: since 2026-11-13 (plan D-034 to D-036), Unfold is the lab and Fold is the harness. This study was preregistered under the Harness division and keeps that scope. Independent verification is also one of the defence agenda's candidate mechanisms (`programs/defence.md`).

**Preregistration:** `tasks/HARNESS-STUDY-4-PREREG.md`, with hypothesis H-H05, pushed as `e2816fa` before the first run.

**How it ran:** 42 runs with no person in the loop, from 13:46 to 16:13 UTC, on the owner's Mac. Every team member was on Pi with `gpt-6.1-sol` and the Unfold message rules, and only the verifier differed:

| Arm | Team | Verifier |
|---|---|---|
| U | HS Unfold trio | none |
| VM | HS VerifMesmo trio | HS Verificador Mesmo, same model, writes acceptance tests from TASK.md and the visible tests only, never the code |
| VO | HS VerifOutro trio | HS Verificador Outro, DeepSeek `deepseek-v4.1-flash-free` through OpenCode, another model family, same conditions |

The verifier's tests became `accept/` in the team's folder and the lead's gate, restored from a master copy before each check. The tasks were cx01 to cx08, bx08 and bx09, plus two more replications each of cx02 and cx07: 14 per arm.

## Results by arm

| Arm | Accepted | False success | Final tests | Cost per accepted task (US$) | Cost relative to U | Verifier test files | Verifier tests passing on the solution | Verifier tests passing on the bugs |
|---|---|---|---|---|---|---|---|---|
| U | 9 of 14 | 5 | 623/628 | [redacted] | 100% | – | – | – |
| VM | 9 of 14 | 5 | 623/628 | [redacted] | 139% | 42 | 28 (67%) | 0 |
| VO | 8 of 14 | 6 | 622/628 | [redacted] | 211% | 42 | 21 (50%) | 0 |

**What the gate did:**
- **VM:** the gate passed the first time in all its checks. The teams read the same model's acceptance tests and wrote code that met them, including the third of them that the reference solution fails.
- **VO:** the gate refused 13 times and gave up after its rounds 4 times. The teams could not meet DeepSeek's tests, half of which demand what the reference solution does not.
- **The verifiers' value:** every verifier test file rejected the buggy code, so they detect bugs. Many of them also reject correct code.

## Decisions, as preregistered

- **H-H05 refuted.** Neither verifier arm accepted more tasks than U (9, 9 and 8). Neither cut false success (5, 5 and 6).
- **The family effect** is refuted too: VO did not accept more than VM.
- **Harm:** one possible case. VO failed cx07 on its first run, which U passed, but U also failed cx07 in 2 of 3 runs, so the case cannot be told from noise.
- **Cost:** VM cost 139% and VO 211% of U per accepted task. That is the verifiers' own work, plus the teams chasing tests they could not meet.

## The finding that changes the reading of studies 2 to 4

Every false success in studies 2, 3 and 4 is one assertion in the hidden test "cursor: tokens dourados e validação" (package `cursor-paginacao`, in cx02 and cx07):

```js
assert.throws(() => decodeCursor(encodeCursor({ id: '', score: 1 })), SyntaxError);
```

The teams make `encodeCursor` validate its item and throw `TypeError` on an empty id, before `decodeCursor` is ever reached. The specification gives the golden tokens (the teams get those right) and says that `decodeCursor` throws `SyntaxError` on an invalid token. It does not say that `encodeCursor` must accept an invalid item. The hidden test asserts a behaviour the specification leaves open, so this is a defect in the benchmark task, not in the teams' work. It also explains why no check derived from the specification could catch it, whether the team's own tests (study 3) or an independent verifier's (study 4).

**Sensitivity analysis:** the same runs, counting as accepted a cx02 or cx07 run whose only failing hidden test is this one. This is not the preregistered outcome and does not replace it.

| Study | Arm: accepted as preregistered, then accepted with that assertion excluded |
|---|---|
| 2 | C 9 → 10, P 7 → 9, U 7 → 9 (of 10) |
| 3 | C 9 → 10, U 8 → 10, G 8 → 10 (of 10) |
| 4 | U 9 → 14, VM 9 → 14, VO 8 → 14 (of 14) |

With it excluded, Codex's edge over Pi on coupled tasks (studies 2 and 3) almost disappears, and no arm in study 4 has anything left to gain. On these tasks, the model already solves nearly everything that the specification states.

## Reading

1. **An independent check helps only if it is right.** Verifiers that read only the specification wrote tests that rejected correct code 33% of the time (same model) to 50% of the time (DeepSeek). Behind a gate, a wrong test either gets met, when the team shares the error (VM), or blocks until the gate gives up (VO). Neither raised acceptance, and both raised cost.
2. **The lab's verifier result needs its condition.** The verifier that won earlier (M3, M6, M7) read the sources. These verifiers had only the specification, and where the specification was silent they guessed. Independent verification pays when the verifier has a source of truth the implementer lacks.
3. **The benchmark has reached its ceiling for this question.** With the out-of-spec assertion excluded, every arm solves nearly everything. Separating harnesses, rules or verifiers needs tasks where the gap is real: underspecified or adversarial work, partial information, or a compromised member. That last kind is where the defence agenda points (`programs/defence.md`).

## Files

- `runs.jsonl`: the 42 runs, including the verifier's files, seconds, and pass counts on the solution and on the bugs.
- `runner.log`: the runner's log.
- `results/BENCH-ERRATUM-cursor-paginacao.md`: the benchmark defect.
- The verifiers' folders (`~/OpenBot/Agents/<verifier id>/verify/`) and the master copies of the acceptance tests (`<lead>/study-accept/`) are on the owner's Mac.
