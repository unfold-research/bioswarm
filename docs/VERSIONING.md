# Versioning and lifecycle

Three things version independently:

| What | Scheme | Where |
|---|---|---|
| Protocol | `bioswarm.vN` | `protocol/`; the connector sends it on every call |
| Packages | semver, one version per package | `packages/*/package.json`, tags `<package>@x.y.z` |
| Host support | ranges per host | `"bioswarm": { "hosts": … }` in each connector's package.json, and `COMPAT.md` in [bioswarm-plugin](https://github.com/unfold-research/bioswarm-plugin) |

## Rules

- **Patch**: fixes only. **Minor**: new rule keys, new optional fields, new host ranges. **Major**: a removed or changed
  rule, a new protocol version, a dropped host range.
- The Control API serves the current and the previous protocol for at least 90 days after a new one ships.
- Connectors support the latest two minor versions of each host (Pi, OpenBot). Older host versions get the community
  policy only.
- Every release has a CHANGELOG entry and a row in `COMPAT.md` that CI produced, not a person.

## Keeping up with the hosts

The hosts move fast (Pi weekly, OpenBot nightly). The plan:

1. `scripts/compat.mjs` (weekly in CI and before each release) installs the pinned and the latest versions of each
   host, runs the connector tests against both, and writes `COMPAT.md`.
2. A failing latest opens an issue labelled `host-drift` with the failing test; the pinned version keeps shipping.
3. The integration test on a real OpenBot server in Docker (`docker/`, owned by the Colony Plugin Engineer) runs one
   short multi-agent task per release and checks that the extension loaded, the field was written and the messaging
   tool was recognised under the host's current bridge name.
4. Contract tests run the same fixtures against the connector and the Control API, so a change on one side fails CI
   on the other.

## Release

`npm version <patch|minor|major> -w packages/<name>`, update CHANGELOG and COMPAT, tag, publish to npm under `@unfold`.
Publishing and making this repository public are owner decisions.
