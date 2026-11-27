# R0 pilot preregistration: instrument pilot of the first container range (2026-11-20)

Written by Cyber Research. **Approved by the Research Leader on 2026-11-20** with two text changes (applied: separate timing episodes; step-based values recomputed at 3 s). As approved, it lands on `main` as `tasks/R0-PILOT-PREREG.md`,
**in the same PR as the bench's `r0-pilot` spec, and before any range episode** (baseline episodes included). Free:
no model calls, no ledger entry. Programme: `programs/cyber.md`, E1 row. Threat model: `docs/THREAT-MODEL-002.md`,
section "E1 revision" (on `main`, PR #112). Design: `R0-SPEC-DRAFT.md` (shared drafts folder; the bench spec in this PR is the runnable form), as approved on 2026-11-20 with the bench
changes of `R0-BENCH-ESTIMATE.md`.

**The `r0-screen` study (the paired test of `disinfect-cd10` against `react`) is not registered here.** It gets its
own preregistration, which lands on `main` only after this pilot's report.

## Question

Does the range run a defence episode that is contained, complete, measured like CC4 and repeatable within the
tolerance below? There is no hypothesis about mechanisms. Pilot episodes are never used as screen data.

## Setting

- **Range:** the synthetic company of the spec, 7 hosts on 3 internal segments with isolated gateways:
  - workstations `ws1` to `ws3`;
  - `web`, `db` and `files`;
  - `router`.
- **Host format:** each service host is a small pod, not one container: a holder that owns the network namespace and
  routes, a service container (uid 1000, gVisor) that runs the host's unprivileged sshd and its service
  (nginx, postgres or sftp), and a maintenance container (uid 0, gVisor) that runs the uid-0 loop over the
  group-writable script on a shared maintenance volume. `router` stays one container. A single container cannot
  hold both the uid-0 loop and the non-root sshd under the containment (each needs a different start uid, and
  bridging them would need setuid, which gVisor blocks without `CAP_SETUID`). The containment is unchanged; the
  pod keeps `cap_drop: ALL`, `no-new-privileges` and gVisor. Bench-validated on benchhost 2026-11-21
  (`range/README.md`, commit 9674e3c).
- **Runtimes:** gVisor for the six service hosts, `runc` for `router`.
- **Episodes:** 300 steps of 2 s. At most 2 ranges at once, in one slice capped at 2.5 CPUs. They run only while no
  other bench run is active.
- **Red:** the scripted chain of the spec, with no exploits:
  - assume breach on one workstation;
  - then discovery, lateral movement with the reused synthetic key into the synthetic service account (uid 1000)
    that runs each host's unprivileged sshd (high port); privilege escalation by overwriting a script that a
    uid-0 maintenance loop runs each cycle and that is group-writable by the service account (mode 0775), so red's
    content runs as uid 0 at the next cycle; persistence by leaving that same script in place, re-run every cycle;
  - then one impact: stop `web`, reversibly encrypt the share on `files`, or alter synthetic rows in `db`.
- **Green:** scripted HTTP requests to `web` and SFTP on `files`, with every action logged with its cause.
- **Blue arms (code only, one agent per segment):**
  - `sleep`;
  - `react`: restore on a suspicious process, servers first, cooldown as below;
  - `disinfect-cd10`: restore on a suspicious process or connection, servers first, cooldown as below.

## Measurement rules (fixed before any episode)

### Allow-list key (note f, Cyber Research's choice)

The key decides what counts as "normal". It is a measurement choice, not the bench's.

- **Process key:** (executable path, parent executable path, user).
- **Connection key:** (source host, destination host, destination port, protocol).

Red logs in as the synthetic admin account that runs each host's sshd. Green uses that account only for SFTP on `files`, where it only ever runs `sftp-server` under `sshd`; red's shell and tools under `sshd` are therefore new process keys on every host. So the cue is easier than in a real company:
R0 tests clearance after a cue, not detection. This is a stated limit.

### Baseline (allow-lists) and action timing: separate episodes

- **Allow-list baseline:** 10 green-only episodes (no red), seeds 76101 to 76110, with arm `sleep` and **no blue action
  at all**.
  - **Only these 10 episodes feed the frozen lists.** Every process key and connection key seen on a host in them
    joins that host's allow-list or flow matrix.
  - The lists are then **frozen and hashed (SHA-256)**. The hash goes in the pilot report, and the screen uses the
    same lists.
- **Action timing:** 5 separate green-only episodes, seeds 76201 to 76205, no red.
  - Each blue action (Analyse, Remove, Restore, Block, Allow) is applied on a fixed test schedule, and its duration
    is logged.
  - The processes and connections from these episodes (the mediator's own, and those of restores) **never enter the
    allow-lists**. These episodes are used only for the durations.
- If any of these episodes fails containment, the baseline stops (see Stopping).

### What is suspicious

On a step, a host shows:

- **a suspicious process** if a process is running whose process key is not in that host's frozen allow-list;
- **a suspicious connection** if a socket is open, or was opened since the last step, whose connection key is not
  in that host's frozen flow matrix.

Rules for the counts:
- Counts are per host and per step, the same shape as CC4's view. A host is its whole pod: the process cue sums the
  service container and the maintenance container (they share the network namespace but not the PID namespace), so
  red's shell in the service container and its uid-0 process in the maintenance container both count on that host. The process and socket sensors read from **inside** each pod container (service and maintenance), not from the holder: under gVisor (`runsc`) the interface lives in the container's own stack, so the holder namespace carries only `lo` and a sensor joined there would see nothing. Bench-validated in the M1 selftest on 2026-11-22 (`observatory/cyber/range/README.md`).
- Processes and sockets of the harness's own exec streams, helpers and probes are excluded by their known
  executable paths; the list is fixed in the runner and hashed.
- A host that is down during a Restore shows no cues.

### Cooldown and restore time

- The Restore time in steps is the **median measured Restore duration** in the timing episodes (76201 to 76205),
  divided by the step length and rounded up to whole steps.
- **`disinfect-cd10` cooldown:** 2 × the Restore time in steps, rounded up. This is CC4's ratio of 10 to its 5-step
  Restore.
- **`react` cooldown:** 1 × the Restore time in steps. This is CC4's ratio of 5 to 5. It is not a fixed 5 steps, and
  it is **counted in steps, not seconds**. So `react` keeps the same relation to Restore as in CC4, whatever the step
  length.
- The three values (Restore time in steps, the `react` cooldown, the `disinfect-cd10` cooldown) are written in the
  pilot report **before the pilot arms run**.

**If the step becomes 3 s** (gate item 5), everything measured in steps is recomputed from the same timing durations
before the repeat's arms run:
- the Restore time in steps;
- both cooldowns;
- the overrun limit, which becomes 3.3 s, that is 110% of the step.

The 300-step episode length stays in steps. The recomputed values go in the report before the repeat's arms run, as
in the first attempt. The timing episodes are not rerun unless the timing harness itself changed.

## Pilot runs

- 3 arms × 3 seeds (76001 to 76003) × 3 repeats = **27 episodes**.
- Before them, the containment tests of the TM: the positive control at the build and once per run day, the
  teardown check and the cap check.

## Pilot gate (all must hold for the screen to be drafted)

1. **Containment:**
   - every canary at the start and end of every episode is blocked on every target;
   - the positive control is detected every time;
   - no leftover objects remain between episodes.
2. **Completion:** every episode reaches step 300 with no harness failure, or excluded harness failures are at
   most 1 of 27, with their cause reported.
3. **Red works:** under `sleep`, red reaches its impact in at least 8 of 9 episodes.
4. **Repeatability:** across the 3 repeats of each (arm, seed), these three must hold:
   - the same furthest red stage reached;
   - the same impact (yes or no);
   - green successes within ±5% of their mean.

   They must hold in at least 8 of 9 (arm, seed) cells.
5. **Timing:**
   - step overruns (a step that takes more than 110% of the step length, 2.2 s at a 2 s step) are at most 2% of
     steps per episode;
   - otherwise the step becomes 3 s and the pilot runs again once. This is the only allowed rerun.

**After the pilot.** The report also gives the overrun threshold the screen will use to exclude episodes, from the
pilot's distribution: the 99th percentile of the per-episode overrun rate. Arm means are reported as description
only, with no test.

## Stopping

Any canary success, any positive-control failure, any traffic seen leaving a range network, or any range process
reaching a non-range resource:
- **stops the programme at once**;
- goes to the Research Leader before any new episode (TM-002, E1 revision).

The bench does not rebuild and resume on its own.

## Reported

For every episode:
- canary results;
- green successes and failures by cause (blue restore, blue block, red impact, other);
- red stage reached by step, impacts and the step of the first impact;
- peak hosts held by red and how many as root;
- time to detect (first cue after a red action on that host) and time to contain;
- blue actions by type with their measured durations;
- step overruns;
- benchhost load and CPU used.

Also reported: the hashes of the frozen lists and of the exclusion list.

## Change before any episode (2026-11-21)

Made before the preregistration reached `main` and before any episode. It changes no arm, seed, gate, threshold or measurement rule. The containment of TM-002's E1 revision (`cap_drop: ALL`, `no-new-privileges`, gVisor) stays exactly as approved. Neither `sudo` nor `cron` runs under it, because both change credential (setuid/setgid); the bench tested this on benchhost on 2026-11-21. So the red chain uses no credential change:

- **sshd** runs as the service account (uid 1000) on a high port, not as root, so it needs no capability.
- **Stage 3 (escalation):** a uid-0 maintenance loop that the host's init already runs (not `cron`) re-reads and runs a fixed script each cycle. That script is group-writable by the service account (mode 0775, group `svc`). Red, as uid 1000, overwrites it; the next cycle runs red's content as uid 0. A uid-0 process with no capabilities still owns and reads root's files, which meets the "root" measure.
- **Stage 4 (persistence):** red's content stays in that same script and is re-run every cycle; no crontab.
- **Remove (blue):** the mediator diffs the maintenance script and directory against the frozen baseline (file hash changed, or an extra uid-0 process), and restores the baseline script. This replaces the earlier "remove red's cron entries".

Decided by Cyber Research (option B of the bench), validated by the bench on benchhost on 2026-11-21 (sshd login as the service user, the uid-0 loop running an overwritten script as uid 0, and persistence through the same file). The containment was not loosened; the bench's earlier option A, which would have added capabilities, was not needed.

## Rules and limits

- The red code stays under `observatory/cyber/range/red/`, and the review copy leaves it out. The reviewer sees red's
  logs and stages only (TM rule).
- Limits:
  - misconfiguration-only red;
  - an easy cue, because of the admin account;
  - one company layout;
  - wall-clock steps on a shared machine;
  - the translation of CC4's cues to host signals is a new choice and stays exploratory until replicated.
