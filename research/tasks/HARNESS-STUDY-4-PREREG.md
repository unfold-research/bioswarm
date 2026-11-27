# Harness study 4: an independent verifier behind the gate (preregistration, 2026-11-13)

**Division:** Harness (`programs/harness.md`).
**New hypothesis:** H-H05.
**Follows:** study 3 (`results/harness-study-3-2026-11/REPORT.md`). There, an acceptance gate built on the team's own tests changed nothing, because the tests share the team's reading of the specification. Every false success in studies 2 and 3 was one hidden test (exact cursor tokens in `cursor-paginacao`, in cx02 and cx07).

The owner authorized this study on 2026-11-13 ("Segue pelo verificador e depois as flags bio"). It is written and pushed before the first run.

## H-H05

**Statement.** A gate built on acceptance tests from an independent verifier lowers false success on coupled tasks. The verifier sees only the specification and the visible tests, never the code. A verifier from another model family lowers it more than one from the same model, because its errors are less correlated with the team's.

**The verifier step**, before the team starts (`run.mjs`, `runVerifier`):
1. The verifier works in its own folder, holding only `TASK.md` and `probe/`. Its access is restricted to its workspace.
2. It writes `checks/<package>.test.mjs` for every package, from the specification.
3. Its tests are copied into the team's task folder as `accept/`, where the team can read them.
4. They are also copied to a master folder outside it. Before the lead may finish, the gate restores `accept/` from the master and runs `probe/` plus `accept/`, so the team cannot edit the check. It sends the lead back at most twice per turn.

**Verifier quality**, measured after each run on the reference solution (should pass) and on the shipped bugs (should fail). A smoke run on 2026-11-13, outside the study, gave: DeepSeek on cx07, 4 files, 2 of 4 passing on the solution, 0 of 4 passing on the bugs.

## Arms and teams

Every team member runs `gpt-6.1-sol` on Pi at medium effort, with full access and the Unfold message rules of studies 2 and 3. Only the verifier differs.

| Arm | Team | Verifier |
|---|---|---|
| U | HS Unfold Líder, Colega, Colega 2 | none: the control, as in study 3 |
| VM | HS VerifMesmo Líder, Colega, Colega 2 (the former HS Gate trio, renamed) | HS Verificador Mesmo: Pi with `gpt-6.1-sol`, the same model as the team |
| VO | HS VerifOutro Líder, Colega, Colega 2 (new) | HS Verificador Outro: OpenCode with `deepseek-v4.1-flash-free`, another model family, at no cost |

All new agents were created and renamed through OpenBot's own `create_agent` and `update_profile`. The verifiers have access to their own workspace only.

**Why these models:**
- **Claude** is not used through the owner's subscription, because the terms are open (plan N-10).
- **Cursor** is not used beyond Auto, which is the owner's cost rule.

## Tasks

The ten tasks of studies 2 and 3 (cx01 to cx08, bx08, bx09), plus two more replications each of cx02 and cx07, where every false success so far lies. That makes 14 runs per arm and 42 in all. The three teams run in parallel, in the same task order.

## Measures

The same as study 3:
- accepted;
- false success;
- final tests passed;
- cost from tokens at one price table, now including the verifier's usage;
- agent messages;
- wall time, now including the verifier's time.

New:
- the number of verifier test files;
- how many of them pass on the reference solution, and how many pass on the bugs;
- whether a correct team was pushed into failing by a wrong verifier test: hidden final tests lower than in U on the same task.

## Decision rules (stated now)

- **H-H05 supported for the other-family verifier** if both hold:
  - VO accepts at least two tasks more than U;
  - VO has at least two false successes fewer than U.
- **H-H05 supported for the same-model verifier:** the same two conditions for VM.
- **The family effect:**
  - **Supported** if VO accepts at least two more than VM.
  - **Refuted** if VO accepts no more than VM.
  - **Inconclusive** otherwise.
- **H-H05 refuted** if neither VO nor VM accepts more than U.
- **Harm**, reported whatever the outcome: tasks where a verifier arm passed fewer hidden final tests than U on the same task.
- **Cost:** the cost per accepted task of each verifier arm, as a share of U's. It is reported, not decided.

## Stopping and spending

- **Spending:** the teams run on the owner's ChatGPT subscription and the DeepSeek verifier on OpenCode's free tier, so there is no API spend.
- **Runner safeguards** (studies 2 and 3): the database is read live in read-only mode, every attempt has a unique key, and an arm stops on a suspected usage limit.
- **Verifier timeout:** if the verifier takes longer than 15 minutes, the run goes ahead with whatever tests exist; with none, the gate runs `probe/` only.
