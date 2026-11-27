# CY1b preregistration: free screen of early-disinfection variants on CAGE Challenge 4 (2026-11-20)

Registered before any CY1b run. Owner instruction of 2026-11-20 ("Yes, register it"), after `results/cy1/REPORT.md`. Third study of `programs/cyber.md`, under `docs/THREAT-MODEL-002.md`. **No model calls and no spend**: every arm is code. An L0 screen (`programs/coordination.md`, evidence ladder), like CY1. Registering this study does not authorise running it; the run needs its own go-ahead.

## Why

CY1 failed every biological mechanism. Its near-miss was `disinfect` (row 7 of `docs/CYBER-MECHANISMS.md`): restoring on a suspicious connection as well as a suspicious process. It was best on every mean (reward −1,442 against −1,659; red Impacts 20.0 against 23.1) but beat `react` on only 27 of 50 seeds. Its parameters were never chosen, only inherited from `react`. CY1b asks whether some form of early clearance beats `react` consistently. CY1's seeds have been looked at, so CY1b uses new ones.

## Mechanism background

In tissue, clearance is graded: a local kill by resident cells comes first, and replacing tissue comes only when the threat persists (escalation). CC4 has a matching pair. **Remove** (3 steps) ends red's user-level sessions on a host. **Restore** (5 steps) reverts the host and ends every session, root included, but the host is unavailable meanwhile. CY1 used only Restore.

## Arms

All arms keep CY1's harness: one action per agent per step, the same observations, the same self-harm attribution and metrics. A *process cue* is a suspicious process event on a host; a *connection cue* is a suspicious connection event. "Cooldown" means the same host is not acted on again within that many steps. Unless stated, hosts are ordered servers first, then by name.

| Arm | Kind | Rule |
|---|---|---|
| `react` | base (CY1) | Restore on a process cue; cooldown 5 |
| `disinfect` | CY1 arm, carried | Restore on a process or connection cue; cooldown 5 |
| `disinfect-cd2` | cooldown | as `disinfect`, cooldown 2 |
| `disinfect-cd10` | cooldown | as `disinfect`, cooldown 10 |
| `disinfect-flat` | ordering | as `disinfect`, hosts ordered by name only (no servers first) |
| `graded` | bio, graded response | a process cue gets Restore; a connection cue with no process cue gets Remove; cooldown 5 |
| `escalate` | bio, escalation | any cue gets Remove first; if the same host cues again within 10 steps of that Remove, it gets Restore; cooldown 3 after a Remove, 5 after a Restore |

Parameters are fixed here and not tuned. No arm sends messages (CY1 showed that alarms in CC4 arrive after the damage).

## Setting

As CY1: CC4 at commit `8c3c50ca54b176c2de199847944e8dcc035497e3`, the CY0 container offline (`--network none`), red `FiniteStateRedAgent`, green `EnterpriseGreenAgent`, 500-step episodes. **Seeds 72001 to 72050** (new). Every arm runs on every seed, paired by seed: 350 episodes.

## Pass rule (L0), per arm other than `react`

Six arms are tested against `react`, so the seed threshold is Bonferroni-corrected (0.05 / 6 = 0.0083; one-sided sign test, P(X ≥ 34 | 50) = 0.0077). An arm **passes** when both hold:

- **P1, consistently better than the base:** higher episode reward than `react` on **at least 34 of 50** seeds.
- **P2, red does not gain:** mean successful red Impacts at most 1.10 × `react`'s.

Reported for every arm, beyond the rule: reward (mean, median, range), failed green actions split into blue-attributed and red-attributed, red Impacts and first Impact step, peak red hosts and root hosts, actions by type. Each variant is also compared descriptively with `disinfect`, which shows which parameter matters without being a test. Verdicts belong to this cell (CC4, fixed red, code policy) and are not generalised.

## What a result decides (stated in advance)

- **One or more arms pass:** the best of them, by seeds won against `react` (ties broken by mean reward), becomes the candidate mechanism for CY2, the first paid study. CY2 needs its own preregistration and the owner's approval of its budget.
- **None passes:** the clearance line closes in CC4. The cyber programme moves its blue mechanisms to the range phase of `programs/cyber.md`, where red has to move between zones over several steps, and CY2 is not run on CC4.

## Limits stated in advance

Code policies are crude stand-ins for agents; the parameters are guesses fixed before data; red is fixed and does not adapt; CC4's actions are abstract. Six variants of one mechanism are a small, hand-picked neighbourhood, not a search. A pass here only earns a paid study.
