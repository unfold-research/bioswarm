# Threat model TM-002: a defender swarm protecting a network's mission

Written 2026-11-20 for the cyber programme (`programs/cyber.md`), under the owner's instruction of the same day to start a cyber line on defence structures from biological swarms, with attacker swarms also studied. It is the "defence of external systems" target that `programs/defence.md` left open; TM-001 (defence of the swarm itself) is unchanged.

## Environment

- **E0:** CybORG CAGE Challenge 4, run locally on benchhost from the public repository at a pinned commit. Hosts, users and attackers are simulated; nothing leaves the process.
- **E1/E2 (later, own threat-model revision before use):** an isolated container network on benchhost with no route to the internet or to any other lab service; synthetic data only; intentionally vulnerable images built for the range.
- No real company, person, account, credential or third-party service appears in any environment.

## Protected asset

The **mission**: the work of the green (benign) users completes, and the attacker does not reach its objective (impact on the operational service, or control of the critical host). Secondary: cost and latency of the defence, and benign work lost to defensive actions (a false isolation or an unnecessary restore is a harm).

## Attacker

- **Who:** the red arms of `programs/cyber.md`: the environment's built-in agents, scripted chains, one LLM agent, an LLM team with a planner, and bio-inspired attacker swarms.
- **Capability:** what the environment grants red: initial foothold in a user zone, discovery, exploitation, privilege escalation, lateral movement, impact. In E0 actions are the simulator's abstract actions; no real exploit code is written for E0.
- **Knowledge:** red does not see blue's messages or policy in the base condition. An "informed attacker" condition, where red knows which blue mechanism is in use, is a separate, named arm (the Red Queen rule).
- **Budget:** fixed per episode and the same across blue arms.

## Defender

Five zone agents (CAGE 4's blue team), each seeing only its zone and its own messages, with the environment's actions (analyse, remove, restore, block traffic between zones, deploy decoys) and its 8-bit message channel. Arms differ only in coordination: none, a manager agent, free chat, or one bio mechanism. A `single` arm holds every zone and the whole budget. All arms get the same action set through the same environment API; the environment itself is the deterministic mediator.

## Failure criteria

- **Mission failure:** red reaches its objective, or green work drops below the episode threshold.
- **Silent failure:** a mission failure with no alarm raised by blue.
- **Self-harm:** green work lost to blue's own actions, counted separately from damage done by red.
- **False alarm:** an alarm or isolation in an episode window with no red activity in that zone.

## Stopping rule

A study stops at its registered episode count or its registered spend cap, whichever comes first. A run that leaks traffic outside the environment, or touches anything outside it, stops the whole programme until reviewed.

## E1 revision (2026-11-20)

Written by Cyber Research, approved by the Research Leader on 2026-11-20 together with the R0 spec. Required by this model before E1 is used. It covers **only R0**, the first range stage: code policies for blue, a scripted red, no model calls. An LLM arm (R1), vulnerable images or an adaptive red (E2) each need a further revision.

### What changes from E0

In CC4 nothing ran: red, green and the network were simulated inside one process. In E1, real processes run in real containers on benchhost, and red executes real commands (discovery, remote login, persistence, impact) against those containers. The protected asset, the attacker model and the failure criteria above still hold. What is new is a second asset: **everything outside the range**, which the range must never touch.

### Assets

1. The mission inside the range, as above.
2. Everything outside the range: benchhost itself, its other containers and networks (the container platform services, the bench), the lab LAN, the internet, any third party.
3. Secrets on benchhost (`<secrets directory>`, the ledger, SSH keys): unreachable from the range.

### Red capability in R0 (deliberately narrow)

- **Assume breach.** Red starts with a foothold on one workstation, placed by the harness at a seeded step. This stands in for CC4's phishing spawn. No exploit delivers it.
- **No exploit code and no vulnerable services.** Red moves only through misconfigurations built into the synthetic company on purpose: a reused synthetic SSH key (into the unprivileged service account that runs each host's sshd), a script that a uid-0 maintenance loop runs each cycle and that is group-writable by the service account, a world-readable synthetic database password. It uses ordinary admin tools that ship in the images. (Corrected 2026-11-21: `sudo` and `cron` were tried in turn but neither runs under the containment below, because both change credential (setuid/setgid); the escalation uses a group-writable script run by a uid-0 loop, which needs no credential change. The bench validated this on benchhost on 2026-11-21. The containment is unchanged.)
- **Impact is harmless and synthetic:** red stops the web service, reversibly encrypts the synthetic file share, or alters synthetic database rows.

### Red code (rule)

- Red code lives only in this private repository, under `observatory/cyber/range/red/`.
- **It is never sent to any model outside the lab.** The bench leaves that directory out of every copy it gives to a review or report agent; reviewers see red's logs and stages only.
- It is never published, and no public material describes it (D-021, D-039).

### Containment controls (each one tested, not only configured)

| Control | How |
|---|---|
| No route out | Every range network is a Docker bridge with `internal: true` **and** an isolated gateway (`com.docker.network.bridge.gateway_mode_ipv4=isolated`), so benchhost has no address on it. Second layer, installed and persistent: `DOCKER-USER` drops the range block (10.90.0.0/16) to anything outside it, `INPUT` drops it to benchhost, and a systemd unit reapplies both after Docker starts; the selftest asserts both rules. No range host joins any other network. A gVisor host's holder namespace carries only `lo` (the interface lives in `runsc`'s own stack); the selftest asserts holders have no address. |
| Egress canary | At the start and end of every episode, every host tries to reach: a public address, benchhost's LAN address, every Docker gateway on benchhost, and one address on every other Docker network. Every probe must be blocked. **gVisor hosts** probe from inside the service container (a probe joined to the holder would see nothing), over TCP, UDP (a DNS query to port 53 and a payload to a UDP canary port) and ICMP. In those hosts a raw socket is refused (EPERM, as uid 1000 and uid 0) but the unprivileged ping socket is allowed, so ICMP is probed through it with a static helper that is piped in and removed after. `router` (runc) probes from a short-lived probe container sharing its namespace, with `NET_RAW`, removed after. |
| Positive control | A deliberately open test network must be detected by the canary at every range build and once per run day, on every protocol the canary uses (TCP, UDP 53, the UDP canary port, ICMP). The UDP listener sits on its own open network, because benchhost's firewall drops UDP from bridges to the host. If any protocol is not detected, the canary is not trusted. |
| Least privilege | Range hosts run with `cap_drop: ALL`, `no-new-privileges`, no Docker socket, no host mounts except read-only snapshots. The six service hosts run under gVisor (`runsc`). Only `router` runs under `runc`, with `NET_ADMIN`, for its iptables. Routes through `router` are set by a helper sharing the host's namespace, which is removed right after. |
| Resource caps | 0.25 CPU, 256 MB and 256 pids per container. Both ranges share one systemd slice capped at 2.5 CPUs. R0 runs only while no other bench run is active. |
| No name resolution out | DNS only for range hostnames, through a resolver inside the range. |
| Mediator outside | The harness (green driver, sensors, blue mediator) runs on benchhost through the Docker API and long-lived exec streams. The range only writes to stdout and cannot call the harness. |
| Teardown | Every episode removes all range containers and networks. A leftover object fails the next episode's preflight. |

### Defender

As above: blue acts only through a deterministic mediator with a fixed action set (analyse, remove, restore, block and allow between segments). It never runs free commands.

### Failure criteria and stopping rule (added for E1)

- **Containment failure:** any canary success, any failure of the positive control, any traffic seen leaving a range network, or any range process reaching a non-range resource. **It stops the programme at once and goes to the Research Leader before any new episode.** The bench does not rebuild and resume on its own.
- **Harness failure:** an episode in which the mediator, sensors or teardown failed. It is reported and excluded, never scored.
