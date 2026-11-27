# CY1 report: code-policy screen of biological defence mechanisms on CAGE Challenge 4 (2026-11-20)

Preregistration: `tasks/CY1-PREREG.md`. Code: `observatory/cyber/cy1/` (`cy1.py` runner, `analyze1.py`); the container is CY0's (`observatory/cyber/cy0/Dockerfile`). Data: `results/cy1/episodes.jsonl` (one line per episode, metrics only), `results/cy1/analysis.json`. No model calls, no spend. An L0 screen: it decides which mechanisms earn a paid study, nothing more.

## Setting as run

As registered: CC4 at commit `8c3c50ca54b176c2de199847944e8dcc035497e3`, offline container (`--network none`), red `FiniteStateRedAgent`, green `EnterpriseGreenAgent`, 500-step episodes, seeds 71001 to 71050, all eight arms on every seed (400 episodes, median 19 to 20 s each). Parameters as fixed in the prereg (λ 0.7, θ 1.5, re-open 0.5, fever 2 zones / 10 steps / 20 steps), not tuned.

## Results

| Arm | Mean reward (median) | Failed green actions | of them blue-attributed | Successful red Impacts | Red hosts (peak) / root | Restores | Decoys | Blocks / Allows | Alarms sent |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `react` | −1,659 (−1,485) | 876 | 1.4 | 23.1 | 42.9 / 20.6 | 134 | 0 | 0 / 0 | 0 |
| `react-msg` | −2,183 (−2,057) | 976 | 2.0 | 31.3 | 47.6 / 26.2 | 131 | 0 | 0 / 0 | 131 |
| `react-decoy` | −1,557 (−1,382) | 814 | 1.0 | 22.3 | 42.2 / 19.8 | 133 | 49 | 0 / 0 | 0 |
| `react-block` | −1,913 (−1,802) | 1,024 | 90.2 | 22.3 | 42.3 / 21.1 | 136 | 0 | 32 / 4 | 0 |
| `alarm-decay` | −1,870 (−1,859) | 889 | 1.6 | 23.9 | 42.6 / 21.6 | 134 | 47 | 0 / 0 | 134 |
| `plasticity` | −2,458 (−2,387) | 1,474 | 333 | 24.2 | 42.7 / 21.3 | 135 | 0 | 30 / 29 | 135 |
| `disinfect` | **−1,442 (−1,293)** | **756** | 3.4 | **20.0** | 40.7 / 19.3 | 225 | 0 | 0 / 0 | 0 |
| `fever` | −1,875 (−1,764) | 949 | 1.6 | 24.1 | 42.6 / 21.6 | 135 | 52 | 0 / 0 | 135 |

Means over 50 episodes per arm (actions per episode). Red reached an Impact in every episode of every arm, first at a median of step 49 to 55. Every alarm arrived exactly one step after it was sent (26,208 to 26,944 deliveries per signalling arm, all with delay 1).

### Screen (registered pass rule)

| Bio arm | P1: beats `react` (need ≥ 33/50) | P2: Impacts ≤ 25.4 | P3: beats its control (need ≥ 26/50) | Verdict |
|---|---|---|---|---|
| `alarm-decay` | 15/50 | 23.9, yes | 18/50 vs `react-decoy` | **fail** |
| `plasticity` | 11/50 | 24.2, yes | 14/50 vs `react-block` | **fail** |
| `disinfect` | 27/50 (p = 0.34) | 20.0, yes | none | **fail** |
| `fever` | 23/50 | 24.1, yes | 21/50 vs `react-decoy` | **fail** |

Descriptive, paired against `react`: `react-decoy` better on 28/50, `react-block` on 14/50 (1 tie), `react-msg` on 13/50 (CY0 found 11/50 on its own seeds, so the CY0 result replicates).

## What this says

1. **No biological mechanism passes the screen in this cell.** None of the four earns a paid CY2 study as registered.
2. **`disinfect` is the near-miss and the only arm better on every mean.** Restoring on a suspicious connection as well as a process (225 restores against 134) gives the best reward, the fewest failed green actions and the fewest red Impacts (20.0 against 23.1), and blue's own restores cost almost nothing (3.4 failed green actions). But it beats `react` on only 27 of 50 seeds, so the gain is not consistent. Earlier, broader clearance is the one direction worth a second look.
3. **Signal-gated posture is worse than unconditional posture.** `alarm-decay` and `fever` deploy about as many decoys as `react-decoy` (47 and 52 against 49) yet lose to it on 32 and 29 of 50 seeds. Likely reading, not tested here: the signal makes zones deploy decoys while under attack, when a 2-step DeployDecoy delays the next restore, whereas `react-decoy` deploys them in quiet time. In CC4 the alarm arrives too late to be a warning; it is a report of damage already happening.
4. **Blocking hurts in CC4, adaptive blocking most.** Static segmentation (`react-block`) blocks 90 green actions per episode and does not reduce red Impacts. `plasticity` flaps (30 blocks, 29 re-allows) and blocks 333 green actions, the largest self-harm in the screen. Red here spreads through phishing inside zones, so inbound zone blocks cut green work more than red's path.
5. **The self-harm split works.** Blue-attributed failures are near zero for restore-only arms and large exactly where blocks are used, as expected; the heuristic is coarse but separates the two.

## What this decides

- **No CY2 is proposed from this screen.** The registered rule failed for every arm; nothing is promoted.
- **Candidate for a new registered screen (owner's call, free):** variants of `disinfect` (rows 7 and the clearance side of row 1 in `docs/CYBER-MECHANISMS.md`), with the parameters it never had: which cues count, cooldown, servers-first. A new prereg and new seeds, because CY1's seeds have now been looked at.
- **Alarms as triggers for posture are retired in this cell.** With one-step delivery and phishing spawns, a neighbour's alarm comes after the fact. Mechanisms that need a lead time (rows 2, 8+9) need a setting where red moves between zones over several steps; that is the range phase of `programs/cyber.md`, not CC4.

## Limits

Code policies are crude stand-ins for agents; parameters are untuned guesses fixed before data; red is fixed and does not adapt; CC4's actions are abstract and its red enters through phishing, which favours clearance over perimeter. A fail here can mean the parameters, not the mechanism. Each verdict belongs to this cell (CC4, fixed red, code policy) and is not generalised.
