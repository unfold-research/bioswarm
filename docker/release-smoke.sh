#!/bin/sh
# On the private Docker host. Each version uses its own previously paired Compose project.
# stdout is an aggregate receipt only. CI calls this through a restricted SSH key.
set -eu
version=${1:?OpenBot version}
revision=${2:?connector revision}
case "$version" in ''|*[!0-9.]*) exit 2;; esac
case "$revision" in ''|*[!0-9a-f]*) exit 2;; esac
[ "${#revision}" = 40 ]
: "${BIOSWARM_RELEASE_ROOT:?directory of private per-version Compose environments}"
cd "$BIOSWARM_RELEASE_ROOT/$version"
# env contains paths and project name, never a model credential.
compose() { docker compose --env-file ./bench.env -f "$BIOSWARM_COMPOSE" "$@"; }
. ./bench.env
test -n "$BENCH_RESULTS"
test -n "$CONNECTOR_ROOT"
test "$(git -C "$CONNECTOR_ROOT" rev-parse HEAD)" = "$revision"
test -z "$(git -C "$CONNECTOR_ROOT" status --porcelain -- packages/connector-pi package-lock.json bench docker)"
cid=$(compose ps -q openbot)
test -n "$cid"
actual=$(docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.version" }}' "$cid")
test "${actual#v}" = "$version"
actual_root=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/opt/bioswarm/packages/connector-pi"}}{{.Source}}{{end}}{{end}}' "$cid")
test "$(realpath "$actual_root")" = "$(realpath "$CONNECTOR_ROOT/packages/connector-pi")"
# One release smoke or study at a time; the live treatment cannot change mid-run.
(
  flock -n 9 || { echo 'bench busy' >&2; exit 1; }
  test "$(node -p "require(process.argv[1]).hostVersion" "$BENCH_RESULTS/team.json")" = "$version"
  compose run --rm -T -e CONNECTOR_REVISION="$revision" runner smoke >&2
  cat "$BENCH_RESULTS/smoke.json"
) 9>"$BENCH_RESULTS/team.lock"
