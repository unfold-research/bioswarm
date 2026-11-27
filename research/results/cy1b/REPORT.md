# CY1b report: free screen of early-disinfection variants on CAGE Challenge 4 (2026-11-20)

Preregistration: `tasks/CY1B-PREREG.md`. Code: `observatory/cyber/cy1b/` (`cy1b.py` runner, `analyze1b.py`); the container is CY0's (`observatory/cyber/cy0/Dockerfile`). Data: `results/cy1b/episodes.jsonl`, `results/cy1b/analysis.json`, and the post-hoc check in `results/cy1b/posthoc-cy1-seeds.json`. No model calls, no spend.

## Setting as run

As registered: CC4 at commit `8c3c50ca54b176c2de199847944e8dcc035497e3`, offline container (`--network none`), red `FiniteStateRedAgent`, green `EnterpriseGreenAgent`, 500-step episodes, seeds 72001 to 72050, seven arms on every seed (350 episodes, no failures). Before the run, `cy1b.py` reproduced CY1's `react` byte for byte on a test seed. After it, CY1's `disinfect` matched too, on two CY1b seeds and one CY1 seed (same SHA-256 of the per-step rewards). The harness is CY1's.

## Results

| Arm | Mean reward (median) | Failed green actions (blue-attributed) | Successful red Impacts | First Impact (median step) | Red hosts / root (peak) | Restores / Removes |
|---|---:|---:|---:|---:|---:|---:|
| `react` | −1,998 (−1,838) | 948 (1.3) | 23.5 | 63 | 40.6 / 21.2 | 134 / 0 |
| `disinfect` | −1,431 (−1,270) | 796 (3.4) | 17.9 | 90 | 37.6 / 18.1 | 215 / 0 |
| `disinfect-cd2` | −1,346 (−1,279) | 792 (3.0) | 16.8 | 89 | 38.0 / 18.2 | 223 / 0 |
| `disinfect-cd10` | **−1,122 (−975)** | **726** (3.4) | **15.1** | 90 | 38.0 / 17.9 | 203 / 0 |
| `disinfect-flat` | −1,410 (−1,253) | 793 (3.5) | 18.0 | 90 | 37.9 / 18.4 | 215 / 0 |
| `graded` | −2,915 (−2,918) | 1,188 (2.7) | 29.7 | 65 | 45.6 / 27.1 | 109 / 133 |
| `escalate` | −4,081 (−4,001) | 1,582 (0.4) | 20.1 | 62 | 54.8 / 36.8 | 21 / 231 |

### Screen (registered pass rule: at least 34 of 50 seeds against `react`, Impacts at most 25.85)

| Arm | Seeds better than `react` | One-sided p | Impacts | Verdict |
|---|---:|---:|---:|---|
| `disinfect` | 40 / 50 | 1e-5 | 17.9 | **pass** |
| `disinfect-cd2` | 40 / 50 | 1e-5 | 16.8 | **pass** |
| `disinfect-cd10` | **44 / 50** | < 1e-6 | 15.1 | **pass** |
| `disinfect-flat` | 41 / 50 | 3e-6 | 18.0 | **pass** |
| `graded` | 12 / 50 | 1.0 | 29.7 | fail |
| `escalate` | 2 / 50 | 1.0 | 20.1 | fail |

**CY2 candidate, by the registered tie-break (most seeds won): `disinfect-cd10`.**

Descriptive, against `disinfect`: `disinfect-cd10` is better on 33 of 50 seeds, `disinfect-cd2` on 22 (27 worse, 1 tie), `disinfect-flat` on 11 (9 worse, 30 ties). `graded` is better on 8 and `escalate` on 2.

## What this says

1. **Early clearance works in this cell.** Restoring a host on a suspicious connection, not only a suspicious process, beats restoring on processes only, on 40 to 44 of 50 seeds. It also lowers red's successful Impacts by a quarter to a third and delays the first Impact from step 63 to about step 90. Blue's own restores cost almost nothing (about 3 failed green actions per episode).
2. **A longer cooldown helps; ordering does not matter.** Leaving a restored host alone for 10 steps instead of 5 is the best variant (better than plain `disinfect` on 33 of 50 seeds). The likely reason, not tested: a restore takes 5 steps, so a 5-step cooldown lets the same host be restored again as soon as it is back, spending actions on noise from the restore itself. Removing the servers-first order changes the outcome on only 20 of 50 seeds, in both directions.
3. **The graded and escalating forms fail badly, and the cause is in CC4.** Remove ends only red's user-level sessions; red that already holds root keeps it. Arms that rely on Remove let red's root footprint grow (27.1 and 36.8 hosts against 17.9). In this simulator the biological pattern of a cheap local kill first is worse than replacing the host at once. That is a statement about CC4's Remove, not about graded responses in general.
4. **CY1's verdict on `disinfect` was a sampling miss.** The same arm, with the same code (the runners match byte for byte), beat `react` on 27 of 50 seeds in CY1 and on 40 of 50 here. Pooled over both seed sets it is 67 of 100 (one-sided p ≈ 0.0004). Fifty paired seeds are noisier than CY1's rule assumed for an effect of this size. CY1's verdict stands as registered (fail on its seeds). This report changes no CY1 verdict.

### Post-hoc check (not part of the registered rule)

To see whether the candidate's win depends on the seed set, `disinfect-cd10` was also run on CY1's seeds (71001 to 71050), against CY1's own `react` and `disinfect` episodes (same harness). It beats `react` on **36 of 50** and `disinfect` on 33 of 50. Its mean reward is −1,216 against −1,659 and −1,442, with 17.8 Impacts against 23.1. The candidate holds on a second, independent seed set. This check was decided after seeing the CY1b data, and it is reported only as a robustness note.

## What this decides

As stated in the preregistration: **`disinfect-cd10` becomes the candidate mechanism for CY2**, the first paid study. CY2 needs its own preregistration (LLM blue teams calling the model only on events, as projected in `results/cy0/REPORT.md`) and the owner's approval of its budget. Nothing is spent until then.

## Limits

Code policies are crude stand-ins for agents. Parameters were picked by hand, and six variants are a small neighbourhood, not a search. Red is fixed and does not adapt; a red that learns to avoid tripping connection cues would erode this mechanism. CC4's actions are abstract, and the reward is dominated by failed green work. The self-harm attribution counts only restores (as in CY1), so any green disruption from Remove is not attributed to blue. The verdict belongs to this cell (CC4, fixed red, code policy) and is not generalised.
