#!/bin/sh
# R0 second containment layer (TM-002 E1, range/README.md): nothing from a range subnet leaves the range, by any path
# the host routes, and nothing from a range subnet reaches benchhost itself. Range-internal traffic (router routes between
# the three segments, all inside RANGE) is untouched. Idempotent; installed as /usr/local/sbin/r0-range-firewall and
# applied at boot after docker by r0-range-firewall.service (Docker never flushes DOCKER-USER, but it is recreated empty
# when the daemon starts on a fresh boot).
#   r0-range-firewall [apply|check]
set -eu
RANGE=10.90.0.0/16
rule_fwd="-s $RANGE ! -d $RANGE -m comment --comment r0-range-egress -j DROP"
rule_in="-s $RANGE -m comment --comment r0-range-to-host -j DROP"
iptables -N DOCKER-USER 2>/dev/null || true
case "${1:-apply}" in
  apply)
    iptables -C DOCKER-USER $rule_fwd 2>/dev/null || iptables -I DOCKER-USER 1 $rule_fwd
    iptables -C INPUT $rule_in 2>/dev/null || iptables -I INPUT 1 $rule_in
    echo "r0-range-firewall applied" ;;
  check)
    iptables -C DOCKER-USER $rule_fwd && iptables -C INPUT $rule_in && echo "r0-range-firewall present" ;;
  *) echo "usage: r0-range-firewall [apply|check]" >&2; exit 2 ;;
esac
