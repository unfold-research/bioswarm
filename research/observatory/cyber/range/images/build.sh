#!/bin/sh
# Build the R0 images (tags :m1) on the bench host. Base first: web, db and files build on it.
#   sh observatory/cyber/range/images/build.sh
set -eu
D=$(cd "$(dirname "$0")" && pwd)
# every image carries unfold.study=r0 (Cyber Research, 2026-11-23); it marks the images as the study's, it does not
# protect them from a host-wide prune that keeps only other labels
docker build -q --label unfold.study=r0 -t r0-base:m1 "$D/base" >/dev/null
for i in web db files router nettool; do docker build -q --label unfold.study=r0 -t "r0-$i:m1" "$D/$i" >/dev/null; done
docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep '^r0-'
# static ICMP-socket probe for the selftest (canary.icmpCheck); a build artefact, not committed
gcc -static -O2 -o "$D/icmpsock" "$D/icmpsock.c"
