# CY1 preregistration: code-policy screen of biological defence mechanisms on CAGE Challenge 4 (2026-11-20)

Registered before any CY1 run. Owner instruction of 2026-11-20 ("Yes, run CY1"). Second study of `programs/cyber.md`, under `docs/THREAT-MODEL-002.md`, after `results/cy0/REPORT.md`. **No model calls and no spend**: every arm is code. This is an L0 screen (`programs/coordination.md`, evidence ladder): it decides which mechanisms earn a paid study (CY2), not whether a mechanism works for agents.

## What CAGE 4 can and cannot express

Blue reads per-host suspicious process and connection events, blocks and 8-bit messages for free, through the official wrapper. Its actions are Restore, Remove, Analyse, DeployDecoy, Block/AllowTrafficZone (inbound, per source zone), Monitor and Sleep. So mechanisms that only add *looking* (sentinels, rows 4 to 6 of `docs/CYBER-MECHANISMS.md`) have nothing to gain here and are not screened; redundancy (row 10) is not an action. Screened: rows 1, 2, 7 and 8+9.

## Instrument changes from CY0 (decided now, before data)

1. **Self-harm.** A failed green action is attributed to blue when the green host or the host it reaches was restored by blue in the previous 5 steps, or when the destination zone blocks the source zone at that step. Everything else counts as red's. A heuristic, reported as such.
2. **Message latency.** Each alarm carries the sender's step modulo 16 (bits 4 to 7) and its sender id (bits 1 to 3); receivers record the delay.
3. The runner rebuilds the container image if it is missing (benchhost's cache cleanup removed it once).

## Arms

All arms share the `react` base: restore the first host with a suspicious process, servers first, not the same host within 5 steps. One action per agent per step; a restore always comes first. Parameters are fixed here and not tuned.

| Arm | Kind | Rule added to `react` |
|---|---|---|
| `react` | base | none |
| `react-msg` | CY0 arm, carried | alarm when own zone has a hit; on any received alarm, analyse own hosts in turn |
| `react-decoy` | control | when idle, deploy a decoy on each own server once (again after it is restored) |
| `react-block` | control (conventional segmentation) | when idle, keep blocked every inbound link that the current mission phase's comms policy does not need, always |
| `alarm-decay` | bio, row 2 | alarm field F ← 0.7·F + alarms received this step; when F ≥ 1.5 and idle, deploy decoys on own servers (as `react-decoy`) |
| `plasticity` | bio, row 1 | same field per sender; when idle and a sender's field ≥ 1.5, block inbound from that sender's zones; re-allow once it falls below 0.5 |
| `disinfect` | bio, row 7 | restore on the first cue: a suspicious connection as well as a suspicious process |
| `fever` | bio, rows 8+9 | when alarms from at least 2 distinct zones arrived in the last 10 steps, every zone deploys decoys when idle for the next 20 steps |

Alarms in the bio arms and `react-msg` are sent whenever the zone has a hit that step.

## Setting

CC4 at commit `8c3c50ca54b176c2de199847944e8dcc035497e3`, offline container, red `FiniteStateRedAgent`, green `EnterpriseGreenAgent`, 500-step episodes. **Seeds 71001 to 71050** (new), each arm on every seed, paired by seed.

## Pass rule (L0), per bio arm

A bio arm **passes** the screen when all three hold:

- **P1, better than the base:** higher episode reward than `react` on at least 33 of 50 seeds (one-sided sign test, p < 0.05).
- **P2, red does not gain:** mean successful red Impacts at most 1.10 × `react`'s.
- **P3, better than its matched control:** higher reward than its control on at least 26 of 50 seeds. Controls: `alarm-decay` and `fever` against `react-decoy` (does the signal add anything over decoys everywhere?); `plasticity` against `react-block` (does adaptive blocking beat static segmentation?); `disinfect` has none beyond `react`.

Reported for every arm: reward, failed green actions split into blue-attributed and red-attributed, red Impacts, peak red hosts and root hosts, actions by type, messages and their delay. A mechanism that passes P1 but fails P3 is recorded as "the action helps, the signal does not". Each verdict is attached to this cell (CC4, fixed red, code policy), never generalised.

## Limits stated in advance

Code policies are crude stand-ins for agents; the parameters are untuned guesses; red is fixed and does not adapt; CC4's actions are abstract. A pass here only earns a paid study; a fail can mean the parameters, not the mechanism.
