# CY0 report: CAGE Challenge 4 instrument pilot (2026-11-20)

Preregistration: `tasks/CY0-PREREG.md`. Code: `observatory/cyber/cy0/` (`cy0.py` runner, `analyze.py`, `Dockerfile`). Data: `results/cy0/episodes.jsonl` (one line per episode, metrics only), `results/cy0/analysis.json`, `results/cy0/tokens.json`. Programme: `programs/cyber.md`, threat model `docs/THREAT-MODEL-002.md`. A pilot: no hypothesis, no model calls in the runs; the token counts used the free counting endpoint.

## Setting as run

- CybORG 4.0 from `cage-challenge/cage-challenge-4` at commit `8c3c50ca54b176c2de199847944e8dcc035497e3`, in a container on benchhost started with `--network none`. Only the simulator's own dependencies are installed; RLlib is not, and its one base class that the wrappers import is a stub (`observatory/cyber/cy0/stub/`), which CY0 never uses.
- Red `FiniteStateRedAgent`, green `EnterpriseGreenAgent`, 500-step episodes (the official evaluation ends them at step 499; so does this runner). Blue acts through the official `BlueEnterpriseWrapper` and reads the same facts as its observation vector: suspicious process and connection events per host, blocks, and the 8-bit messages.
- Arms: `sleep`; `react` (restore the first host showing a suspicious process, servers first, not the same host again within 5 steps); `react-msg` (as `react`, and each zone sets bit 0 of its message when it has such a host; a zone with nothing to restore that receives an alarm analyses its own hosts in turn). **The environment ships no heuristic defender**, so the optional fourth arm of the prereg does not exist.
- Seeds 70001 to 70050 per arm, plus every arm repeated on seeds 70001 and 70002.

## Results

| Arm | Mean reward (min, max) | Failed green actions | Successful red Impacts | Hosts red held (peak) | of them as root | Restores / Analyses per episode | Messages sent |
|---|---:|---:|---:|---:|---:|---:|---:|
| `sleep` | −6,435 (−9,535, −4,023) | 2,118 | 17.6 | 68.8 | 53.3 | 0 / 0 | 0 |
| `react` | −1,804 (−4,331, −508) | 872 | 25.0 | 41.5 | 21.2 | 135 / 0 | 0 |
| `react-msg` | −2,496 (−5,966, −689) | 1,049 | 31.5 | 45.8 | 25.9 | 128 / 447 | 128 |

Means over 50 episodes; `analysis.json` has medians and ranges. Paired by seed (descriptive): `react` beats `sleep` on all 50 seeds and `react-msg` beats `sleep` on all 50; **`react-msg` is worse than `react` on 39 of 50 seeds**.

1. **The instrument works and reproduces.** All 156 episodes ran offline in 11 to 25 s each (median 17 s). The six repeated episodes returned the same reward trajectory, byte for byte (SHA-256 of the per-step rewards).
2. **The message channel delivers.** In `react-msg` an Analyse only follows a received alarm; 447 Analyses per episode followed 128 alarms sent. Whether a message arrives in the same step or the next was not measured; CY1 logs it.
3. **An alarm that only makes neighbours look costs more than it gives.** Neighbours analysing on every alarm were busy when their own hosts turned suspicious: more failed green work (1,049 against 872), more red Impacts (31.5 against 25.0). This is the code-policy version of a question the programme already holds as a hypothesis (H-D08, self-limiting recruitment): a response occupies the responder, so a signal has to change what the neighbour does in a way worth its cost (posture: decoys, blocking a zone link), or decay. It is one crude policy, not evidence about alarms in general.
4. **Restoring cuts red's footprint but not its Impacts.** `react` holds red to 41.5 hosts at peak against 68.8 and to 21.2 root hosts against 53.3, and cuts failed green work by 59%, yet successful Impacts rise from 17.6 to 25.0. The reward is dominated by failed green work, so a defence can score well while red still reaches its objective. CY1 reports both, never the reward alone.
5. **Red reaches an Impact in every episode of every arm**, first at a median of step 54 to 61. Red also spawns inside mission zones when a green user there opens a phishing message, so "red reached a mission zone" is not a useful measure in CC4; first Impact replaces it.

## What an LLM blue team would cost

From 100 sampled views (seed 70000 shuffle over 15,000 views taken every 25 steps from every agent): a zone agent's view, as JSON text, is 2,082 to 7,359 tokens (mean 3,383; the counter gave the same counts for Haiku 5.5 and Sonnet 5.5). **66% of a view is the list of valid actions**, which barely changes within an episode, so prompt caching would cover most of the input. 15% of agent-steps carry any suspicious event or alarm (8% in `sleep`).

Projected cost of one 499-step episode if every agent calls the model every step, with no system prompt, no caching and 150 output tokens per decision (an assumption, not measured):

| Arm | Calls per step | Haiku 5.5 | Sonnet 5.5 |
|---|---:|---:|---:|
| five zone agents | 5 | [US$ redacted] | [US$ redacted] |
| `manager` (five reports + a manager reading all five) | 6 | [US$ redacted] | [US$ redacted] |
| `single` (one agent reading all five zones) | 1 | [US$ redacted] | [US$ redacted] |

List prices (Haiku 5.5 [US$ redacted] / 0.50, Sonnet 5.5 [US$ redacted] / 10 per million input / output tokens). The batch tier halves these, but an episode is 499 sequential decisions, so batch only fits if many episodes advance in lockstep, one batch per step.

## What this decides

- **CY1 proceeds** (prereg condition met: three arms run, seeds reproduce). It screens the blue mechanisms of `docs/CYBER-MECHANISMS.md` as code policies, free. Instrument changes first: log message latency, and attribute failed green work to blue's own actions (a restore or block) versus red's, which CY0 cannot separate.
- **CY2 cannot be a model call per agent per step.** At these prices the three arms above with 30 seeds each come to about [US$ redacted] in Haiku and about [US$ redacted] in Sonnet. Proposed for the owner: agents called only on an event or an alarm (15% of steps), the action list cached, Haiku 5.5, and episodes advanced in lockstep through the research bench's batch path. That is a projection of roughly [US$ redacted] to 0.15 per episode, to be measured by a small paid pilot before any registered study. The shared ledger has about [US$ redacted] left under its [US$ redacted] cap.

## Limits

Abstract simulator actions, fixed non-adaptive red agents, one red configuration, crude code policies. CY0 describes the instrument and the cost; it supports no claim about any mechanism.
