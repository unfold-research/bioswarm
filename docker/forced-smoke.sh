#!/bin/sh
# Install in an operator-owned location as the forced command of the release-only key.
set -efu
IFS=' '
set -- ${SSH_ORIGINAL_COMMAND:-}
[ "$#" = 3 ] && [ "$1" = smoke ] || exit 2
exec "${BIOSWARM_RELEASE_SMOKE:?path to operator-installed release-smoke.sh}" "$2" "$3"
