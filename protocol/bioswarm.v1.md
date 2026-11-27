# Protocol `bioswarm.v1`: connector ↔ BioSwarm Control API

The contract between the open plugin ([bioswarm-plugin](https://github.com/unfold-research/bioswarm-plugin)), the SDK (`packages/sdk`) and Unfold's private Control API.
A change that breaks a v1 connector requires `bioswarm.v2`; the API serves both for at least 90 days (see `docs/VERSIONING.md`).

Auth: `Authorization: Bearer <BIOSWARM_API_KEY>` on every call. Keys are per workspace.

## GET /v1/policy

Query: `protocol=bioswarm.v1`, `connector=<semver>`, `host=openbot|pi|claude-code|...`, `agent=<opaque id>`.

```json
{ "protocol": "bioswarm.v1", "id": "field-tiebreak@1", "ttlSeconds": 300,
  "rules": { "runBudgetUsd": 3, "messagesPerRun": 1, "messageChars": 600, "messagesPerSession": 4,
             "gate": null, "waitForTrace": false, "tieBreak": "hash" } }
```

- The connector accepts only the rule keys it knows (`sanitizeRules`) and ignores the rest. A policy can tune the loop,
  never run commands or read files.
- Local `.bioswarm` settings override the policy; a local `runBudgetUsd` can only lower the remote one.
- On error, timeout (1.5 s) or protocol mismatch the connector runs the last cached policy, else the community policy.
  The agent is never blocked by the network.
- `426 Upgrade Required` with `{ "minConnector": "x.y.z" }` means the connector is below the supported floor.

## POST /v1/events

```json
{ "protocol": "bioswarm.v1", "connector": "0.1.0", "agent": "<opaque id>", "policyId": "field-tiebreak@1",
  "events": [ { "at": 1764100000000, "type": "run_end", "costUsd": 0.41, "messages": 1, "over": false } ] }
```

Allowed event fields: `at type kind rule tool costUsd messages over count missing exit files`. Tool names lose the
host's bridge prefix (`mcp__openbot_<hash>__x` → `mcp:x`). **Never** prompts, messages, file contents or paths.

## Runs, policies and metrics (SDK)

| Method | Path | Purpose |
|---|---|---|
| GET | /v1/policies | strategies available to the workspace |
| PUT | /v1/policy | assign a strategy to the workspace or one agent |
| POST | /v1/runs | start a long task for a set of agents with a strategy and a budget |
| GET | /v1/runs/:id | state, cost, messages, checks passed |
| POST | /v1/runs/:id/stop | stop a run |
| GET | /v1/metrics | cost, time, messages and acceptance per strategy |

## Rule keys in v1

| Key | Meaning | Evidence (Unfold Research) |
|---|---|---|
| `runBudgetUsd` | spending ceiling per request, enforced before each tool | internal case study (not published): cannot be set from outside the loop |
| `messagesPerRun`, `messagesPerSession`, `messageChars` | message ceilings and pointer rule; detail goes to the field | OpenBot studies 1 and 2, earlier extension: 38% fewer agent messages than standard Pi, without reducing cost per task |
| `gate` | acceptance gate: own tests per package and a passing command before "done" | LI12–LI14, LI18: passing tests ≠ solving the task |
| `waitForTrace` | Experimental opt-in. Wait for an addressed requirement according to the local wave contract. The recommended policy disables it. | Phase 1b and 1b-r found no consistent cost advantage and slower work with trace waiting on this synchronous scheduler. |
| `fallbackAfter` | Minimum consecutive waves with one unchanged failed check before a non-owner takes over. Integer ≥2. A valid local setting overrides the remote policy, which overrides the wave default. Requires trace waiting and hash arbitration. | LI42 observed one stalled case. The recovery threshold is an engineering choice. |
| `tieBreak` | symmetric conflicts go to one side (`hash`) | LI27, LI30: necessary on format pairs |

`waitForTrace` and `tieBreak` are enforced in connector 0.2 against locally published waves. Connector 0.1 accepts the keys without applying them. The API receives aggregate events; requirement text, check IDs, actor assignments and file paths stay in the local field. [Local wave contract](https://github.com/unfold-research/bioswarm-plugin/blob/main/docs/WAVES.md)

Control recommends `field-tiebreak` for new workspaces. Its rule pair is `tieBreak: "hash"`, `waitForTrace: false`. The writer can act immediately; another team member attempting that file records one yield per wave to the writer. Publish a wave before the team starts. Explicit experimental assignments remain available.

In 1b the combined policy resolved symmetric disputes early. In 1b-r the class-aware experimental policy lost that property and C took longer in every pair. Both comparisons used one worker model on a synthetic task lasting minutes, under synchronous dispatch. Neither compared synchronous and asynchronous scheduling.
