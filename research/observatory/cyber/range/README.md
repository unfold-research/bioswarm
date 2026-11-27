# Range R0: the first container range on benchhost (bench build)

Built by the bench for `tasks/R0-PILOT-PREREG.md` under `docs/THREAT-MODEL-002.md`, section "E1 revision". Design:
the R0 spec approved by the Research Leader on 2026-11-20 (shared drafts folder, `R0-SPEC-DRAFT.md`), with the bench
changes of `R0-BENCH-ESTIMATE.md`. No model calls, no ledger entry.

**No range episode runs (baseline and timing episodes included) before `tasks/R0-PILOT-PREREG.md` and the bench's
`r0-pilot` spec are on `main` in one PR.** Building images and networks and running the containment tests (canary,
positive control, teardown, caps) on an empty range are not episodes.

## Rules the code enforces

- **Containment** (TM table): every range network is `internal` with an isolated gateway (benchhost has no address on
  it); a `DOCKER-USER` / `INPUT` drop rule is the second layer; no range host joins another network; caps per
  container (0.25 CPU, 256 MB, 256 pids) and one systemd slice for all ranges (2.5 CPUs).
- **Stopping rule:** any canary success or positive-control failure writes `STOP` to the range state folder. Nothing
  starts while it exists. Only the Research Leader's decision removes it; the bench never rebuilds and resumes on its
  own.
- **Red code** lives only in `red/` and is left out of every copy given to a review or report agent (bench
  `reviewExclude`).
- **Labels:** every container and network of a range carries `unfold.range=<range id>`; teardown removes exactly
  those, and preflight fails on any leftover.

## Routing with gVisor hosts (tested 2026-11-21)

gVisor keeps its network stack inside the sandbox, so a route cannot be added to a running gVisor host from outside,
and the hosts have no `NET_ADMIN`. Each host therefore gets a **namespace holder** first: a `runc` container on its
segment that only sleeps (`cap_drop: ALL`, `no-new-privileges`, user `nobody`). A short-lived **route helper** shares the
holder's namespace with `NET_ADMIN`, adds the routes to the other segments via `router`, and is removed. The gVisor host
then starts in that namespace (`--network container:<holder>`) and copies the routes at start. A Restore recreates the
host in the same holder, so the routes stay. Tested on two throwaway segments: traffic between segments goes through
`router`, a `router` FORWARD drop blocks it, and the public internet stays unreachable.

## Containment tests on an empty range (2026-11-21)

- Positive control (`canary.mjs control`): a probe on a deliberately open network reached 44 targets in about 5 s.
- Canary on a holder in an isolated segment: 27 targets (public TCP 443 and ICMP, benchhost's LAN address, every Docker
  gateway, one member of every other Docker network), 0 reached. No STOP written.

## Layout

| Path | What |
|---|---|
| `net.mjs` | range networks, labels, preflight (leftovers, STOP), teardown |
| `range.mjs` | the 7-host company: router, pods, `up`/`down`, M1 `selftest` |
| `systemd/r0-range-firewall.*` | second layer: range egress and range-to-host drop rules, applied at boot |
| `images/icmpsock.c` | static ICMP-socket check and ping-socket probe for gVisor hosts (binary built by `images/build.sh`, not committed) |
| `images/build.sh` | builds the `:m1` images |
| `images/` | Dockerfiles: base workstation, `web`, `db`, `files`, `router`, probe (M1) |
| `canary.mjs` | egress canary and positive control (M1) |
| `green/`, `sensors.mjs`, `mediator.mjs` | green driver, process and socket sensors, blue actions (M2) |
| `red/` | scripted red chain (M2); never sent to an outside model |
| `episode.mjs`, `drive.mjs`, `analyze-r0.mjs` | episode runner, bench driver, registered analysis (M3) |

## Host model: a small pod per host (found and validated 2026-11-21)

Under the approved containment (`cap_drop ALL`, `no-new-privileges`, gVisor) one container cannot hold **both** a uid-0
maintenance loop **and** an unprivileged sshd: a uid-0 process cannot spawn a uid-1000 sshd (that is a `setuid`, which
gVisor denies without `CAP_SETUID`), and root sshd fails too (its privilege separation `setuid`s). Validated on benchhost:
sshd works only when the container *starts* as uid 1000; the uid-0 loop needs a uid-0 container.

So each range host is a small pod sharing one network namespace (the holder) and a group-writable maintenance volume:

- **holder**: owns the net namespace and the host's routes (runc, `cap_drop ALL` + `NET_ADMIN` only while the route
  helper runs, then none);
- **service container** (uid 1000, gVisor): the host's sshd (high port, service account, key auth) and its service
  (nginx/postgres/sftp). This is where red lands by ssh;
- **maintenance container** (uid 0, gVisor): the uid-0 loop that re-runs the group-writable script on the shared
  volume each cycle.

Red, as uid 1000 in the service container, overwrites the group-writable script on the shared volume; the maintenance
container's uid-0 loop runs red's content as uid 0 next cycle. Validated end to end on benchhost on 2026-11-21: baseline
ran as uid 0, svc overwrote the shared script, the next cycle ran red's content as uid 0. No `setuid`, no `sudo`, no
`cron`; containment unchanged.

This keeps every arm, seed, gate, threshold and measurement rule of the preregistration. Two bench notes follow from
it, flagged to Cyber Research: the preregistration's "one container per host (8 containers)" becomes "one pod per host
(about 2 containers plus a holder)", and the **process sensor unions a pod's containers per host** (they share the net
namespace but not the pid namespace). Memory and pids stay inside the 2.5-CPU / 4 GB slice.

## gVisor and the shared namespace (found and fixed 2026-11-21)

gVisor does **not** expose a second container's listening sockets on a network namespace it joins with
`--network container:<holder>`: a peer in that namespace, and even real L3 to the holder's IP, could not reach a gVisor
service container's sshd. The fix: only the **service** container shares the holder's namespace (its sshd and service
are then reachable over real L3 from other hosts via the router, which is what the range needs); the **maintenance**
container needs no network at all, so it runs with `--network none` and only the shared pod volume. Validated on benchhost:
a `web` pod came up, its sshd (2222) and nginx (8080) were reachable over L3 from another dmz host, the uid-0 loop ran
from the shared volume, and the egress canary stayed clean.

## Resource slice (installed and tested 2026-11-21)

`systemd/r0-range.slice` caps all ranges together at 2.5 CPUs, 4 GB, 2048 tasks. Every range container runs with
`--cgroup-parent=r0-range.slice` and its own caps (`--cpus 0.25 --memory 256m --pids-limit 256`). Installed on benchhost
under the user systemd manager; a capped container was confirmed to join it (CPUQuotaPerSecUSec 2.5 s).

## The holder namespace is empty once gVisor starts (found and fixed 2026-11-22)

When the gVisor service container joins a holder's namespace, runsc moves the interface and its address into its own
network stack: the holder's namespace keeps only `lo`. A probe container that joins the holder therefore reaches
nothing **whatever the containment**, so a canary run from it would pass vacuously. (The 2026-11-21 canary above ran
on a holder with no gVisor host in it, where the namespace still had its address; it stands.) Since then:

- gVisor hosts are probed from **inside their service container** (`canary.probeExec`, TCP via `bash /dev/tcp`; no
  ICMP, because the container has no `NET_RAW`); `router` (runc) keeps the namespace probe with ICMP;
- reachability checks run the same way, from inside the service container;
- the selftest asserts that every holder namespace carries no address, so a holder probe is never taken for a test.

## M1 selftest on a full empty range (2026-11-22)

`node range.mjs selftest <id>` builds the 7-host company (3 workstations, `web`, `files`, `db`, `router`; 19
containers in about 20 s), runs every M1 check and tears it down. Result on benchhost, all passed: preflight; segments
internal and isolated with no host address; runtimes (service and maintenance on runsc, holders and router on runc);
every container in `r0-range.slice` with 0.25 CPU / 256 MB / 256 pids; services reached across segments through
`router` (ws1→web 2222 and 8080, ws2→files 2222, web→db 5432 and 2222, db→ws3 2222); a `router` FORWARD drop cuts them
and removing it restores them; the uid-0 maintenance loop alive on all six pods; canary from the six service
containers and the router, 24 targets each, **0 reached**; positive control detected 36; teardown and no leftovers.
No STOP written. Images: `sh images/build.sh`.

## UDP and ICMP from gVisor hosts, and the second layer (2026-11-22)

Conditions of Cyber Research for the TM canary fix, approved by the Research Leader: the exec canary also probes
**UDP** (a DNS query to 53 and a payload to the canary port 40053 for every target, read back with `bash /dev/udp`; the
echo listener sits on its own non-internal Docker network because benchhost's ufw drops UDP from bridges to the host), and
the selftest checks **ICMP sockets** in every gVisor host as uid 1000 and uid 0 (`images/icmpsock.c`, static, piped in
and removed). gVisor refuses the raw socket but **allows the unprivileged ping socket** on all six hosts, so the canary
probes ICMP from inside them too. The exec positive control must detect TCP, UDP 53, the UDP canary port and ICMP.

**Second layer.** `DOCKER-USER` was empty on benchhost, so the drop rule this README describes was not installed (the first
layer, internal networks with isolated gateways, held in every canary). Installed on 2026-11-22 by the bench, with the
Research Leader's instruction: `systemd/r0-range-firewall.sh` (as `/usr/local/sbin/r0-range-firewall`) drops anything
from `10.90.0.0/16` to a destination outside it in `DOCKER-USER`, and anything from it to benchhost in `INPUT`; range
traffic between segments through `router` stays inside `10.90.0.0/16` and is untouched. `r0-range-firewall.service`
(system unit, enabled, after docker) reapplies it at boot; checked by deleting the rule and restarting the unit (not
by a reboot). The selftest asserts both rules are present.

**Incident: STOP written by a test bug, removed with the Research Leader's authorisation.** On 2026-11-22T02:35Z the
exec positive control did not detect the UDP canary port and wrote STOP. Cause: `targets()` takes one member per Docker
network and picked the control container itself, not the listener, on the listener's network. The same control did
detect TCP, UDP 53 and ICMP; the listener and the `/dev/udp` probe were then shown to echo by hand, outside any range.
No range episode ran before, during or after. Fixed in bfb3af8 (`targets()` never picks a control container and always
picks the listener). The Research Leader authorised removing STOP and one full selftest rerun; a failure writes STOP
again and goes back to the Research Leader.

## Milestones

| | Content | Target |
|---|---|---|
| M1 | images, networks, routing via `router`, gVisor hosts, slice and caps, egress canary, positive control, preflight and teardown, all tested on an empty range | 2026-11-23 (done 2026-11-22) |
| M2 | green driver with cause attribution, sensors, frozen-list tooling, mediator with timing, red chain | 2026-11-25 |
| M3 | episode runner (seeds, parallel ranges, overrun log), bench driver and `r0-pilot` spec, analysis, review exclusion of `red/`, free dry runs on an empty range; PR with the preregistration | 2026-11-27 |
