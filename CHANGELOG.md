# Changelog

## Open research release · 2026-11-27

- The project opens: the Unfold Research lab record joins this repository under `research/` (curated, fresh history; see `research/README.md`).
- The plugin moves to its own repository, [bioswarm-plugin](https://github.com/unfold-research/bioswarm-plugin), and stays at `packages/connector-pi` as a git submodule. Plugin release notes continue there.
- CI moves to GitHub Actions.

## Connector 0.3.1

Restore the 0.2 yield behavior for hash-only coordination on class-aware waves. Control recommends the shared field and hash tie-break. Trace waiting remains an explicit experimental policy.


## Connector 0.3.0 · pre-release

- Class-aware waves restrict mandatory traces to directed dependencies. Symmetric contenders elect one writer. Sole owners can write immediately and see addressed traces as priorities. Legacy wave publishers retain 0.2 behavior.
- A local decision receipt records the check, class, wave, tool and outcome. Control receives the existing count-only telemetry.

## Bench · the bench server host adapter

- Select the study host with `BIOSWARM_STUDY_HOST`; on the bench server, start at most 70% on `/`, stop at 75% or at the 4 GiB
  data cap, avoid 04–08 UTC including the 90 min timeout, require a current launcher receipt bound to this boot and
  cgroup, read the cgroup's effective limits and refuse when another study service runs (`bench/BENCH-HOST.md`).
- Run the host preflight before Phase 1b facts and any model call; label records with the selected host; let 1a use
  the local Control route on the bench server.

## Bench · Phase 1a on direct Pi

- Run Phase 1a with three persistent Pi sessions per attempt, the frozen 0.1 connector checked by blob id, Control
  policies over a loopback tunnel and a durable local `send_message` queue shared by all arms (`bench/DIRECT-1A.md`).
- Meter concurrent wall time, token categories, costs, messages, ceiling refusals, 429s, retries and disk per
  attempt, and refuse the sample until smoke, three long A activations, the 64/64 judge and approval are in place.
- Contain the technical smoke: five tools only (no shell), reads in the case folder and field, writes in the case
  folder, with Pi's own path resolution and real-path checks against symlinks.

## Connector 0.2.0 · pre-release

- Enforce addressed requirement traces and hashed contention inside Pi's tool loop for locally declared checks.
- Reassign a single unchanged check to an outsider after a configurable number of observed waves. Control can set `fallbackAfter` per agent or workspace.
- Add a local observation publisher, agent assignment tool, Pi session tests and a direct OAuth smoke.

## 0.1.0 (2026-11-25), pre-release

- `@unfold/bioswarm-pi`: connector for Pi agents and OpenBot agents on Pi, ported from Unfold Research's tested
  extension (`experiments/openbot-unfold-mode`): shared field, message ceilings and pointer rule, taken files,
  spending ceiling, acceptance gate, event record. New: remote policy from the Control API with cache and community
  fallback; telemetry with counts and costs only.
- `@unfold/bioswarm`: SDK for policies, runs and metrics.
- Protocol `bioswarm.v1`.
