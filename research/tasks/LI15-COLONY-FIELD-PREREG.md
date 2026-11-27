# LI15 preregistration: the field inside the Colony, on real repositories, against the Colony's own manager pattern (2026-11-17)

**Status:** registered 2026-11-17 after a one-case pilot (`results/li15-colony-pilot/`, 12 modules: both arms solved and passed the hold-out, market in 6.3 minutes and field in 7.5; the first market run never received its task message because two teams were created at the same instant, and the driver now resends the task if no turn started within a minute). Runs in parallel with LI14 (rule 9). The first study outside the batch runner: real agents in the Colony app (Pi engine, tools, shell, files), driven through the lab bench (`colony/docs/lab-bancada.md`), model **gpt-6-luna** through the ChatGPT subscription (provider `openai-codex`; outside the shared Anthropic ledger; cost reported as the Colony's own estimate).

## Why

LI11 to LI14 found, in a batch simulation, that what decides coordination is the requirement reaching whoever can change the source, and that agents can carry it themselves as traces on the failing check. But the batch traces quoted test examples and fitted to them (hold-out 1 to 3 of 8). The Colony now has the field as a product feature (colony `1d35ba6`): ants own files, may change only those, and ask for what they need with `field_trace`, delivered only to the owner, with the instruction to state the required behaviour, not examples. LI15 asks whether that holds with real agents on real repositories, against the Colony as it ships: a parent that delegates to ants who talk by message (the manager pattern).

## Design

- **Task:** each case is a generated codebase written as a real repository (`observatory/batch2/colony/materialize.mjs`): `src/m1.js` to `src/mk.js`, a specification per module in `specs/`, and `node test/run.mjs`, which applies the strict check to the test inputs. Every specification is readable by every agent. Sizes k = 24 (seeds 15000 to 15005) and k = 40 (seeds 15400 to 15405); k directed and 3k/4 symmetric edges; 8 test inputs per check.
- **Team:** one Colony project agent (the parent) and exactly 4 worker ants, each given k/4 modules by the task message; same model for all.
- **Arms:** `market`: the Colony default (ants talk with `ant_send`, nothing enforces who edits what). `field`: the same team with the field on (ownership enforced, `field_trace`/`field_read`/`field_resolve`).
- **Run:** `drive.mjs` with `li15-k24.json` and `li15-k40.json`, two teams at a time, 60 minutes cap per team; a team is done when no chat ran for 3 minutes.
- **Scoring:** `evaluate.mjs`: the strict check on the test inputs and on 40 fresh inputs per check (hold-out, never in the repository). Verdicts: `analyze-li15.mjs`.

## Hypotheses (12 paired cases; the case is the unit)

- **H-LI47 (primary).** The field leaves fewer checks failing on fresh inputs than the market in more cases (sign test p < 0.05). Refuted if the market is lower in more cases.
- **H-LI48 (secondary).** The field reaches its end sooner (wall-clock) in more cases.
- **H-LI49 (secondary).** The field uses fewer tokens in more cases.

Secondary tests are reported with a Holm correction. Also reported: solved on the test inputs, hold-out passes, traces, blocked edits, capped runs.
