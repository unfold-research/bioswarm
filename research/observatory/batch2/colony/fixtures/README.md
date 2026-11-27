# /lab/export contract fixtures

The contract (Research Leader, 2026-11-24): Colony owns the exporter (`GET /lab/export`, `lab-export.cjs`), research owns
the scorer (`observatory/batch2/colony/record.mjs`, called by `drive.mjs`). The same versioned example export lives in both
repos. Colony CI checks that the exporter still produces it (`tests/lab-export-contract.test.cjs`); research CI checks that
the scorer still reads it (`node observatory/batch2/colony/export-contract.test.mjs`). A schema change bumps
`exportSchema` and needs a PR on both sides; the scorer refuses an `exportSchema` it does not know.

- `lab-export.v1.json`: **Colony's file, byte for byte** (colony `e8b8029`, `tests/fixtures/lab-export.v1.json`,
  sha1 `f377c2cc…`; the test pins the full sha1). A real export of a deterministic run with a fake model (fixed clock,
  counted ids): 1 run (stop solved), 2 agents, 1 goal, 7 model calls, 2 classifier first-pass decisions, 1 gate, 1 prompt,
  spend `{usd 0.028, tokens 7560, calls 7}`, 1 stage. Never edit it here: take a new copy from Colony.
- `lab-export.v1.volatile.json`: Colony's list of fields whose values change between exports, byte for byte. A bare name
  matches at any depth; a `/path` with `*` matches only there.
- `lab-export.v0.json`: one run trimmed from a pre-versioning export (`results/li39-colony-wait-k160/wait-s39405.export.json`,
  LI39, Colony `e9b45f4`), content replaced by `<placeholder>`, ids renamed. It has no `exportSchema`: it keeps the scorer's
  pre-versioning path tested, so every past Colony record still reproduces.

How the scorer reads each version:

| Record field | v0 (no `exportSchema`) | v1 |
|---|---|---|
| `costUsd`, `calls` | `totals.costUsd`, `totals.calls` | `spend.usd`, `spend.calls` (sum of `modelCalls[]`, what Colony's cap uses) |
| `tokens` | per-chat `tokens` | summed over `modelCalls[]` (`input`, `output`, `cacheRead` as cached, `totalTokens`; thinking is inside total) |
| `telemetry` | `tasks[].tools[]` | `tasks[].tools[]`, same shape (lab telemetry, filled only for lab runs through colony-tools) |

Colony semantics (Colony Engineer Leader, 2026-11-24): `spend` is the run record Colony's cap reads, summed once per model
call. In v1, `totals.costUsd` is the per-chat cost the provider reports at turn end (it can lag or miss calls; never score
on it), and `totals.calls` counts tool calls (`tasks[].calls`), not model calls. `tasks[].calls` is the executor's view (no
command text or block reason); telemetry reads `tasks[].tools[]`. The v1 fixture's fake-model run does not go through
colony-tools, so its `tools[]` is empty; Colony will extend it (one bash test run, error, refused edit, edit, `ant_send`
failure, `field_trace` failure; same `exportSchema` 1, new sha1) after its main freeze. Re-copy it then and update the
sha1 in the test.

Runtimes built before Colony `e8b8029` (the benchhost bench images up to now) export without `exportSchema` and are read as v0.
