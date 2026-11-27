# CY2 preregistration: LLM blue teams with and without the clearance doctrine on CAGE Challenge 4 (2026-11-20)

Registered before any CY2 call. **Owner approval of 2026-11-20 ("Approve and register"): a hard cap of [US$ redacted] from the shared ledger.** The study arms run only after the pilot gate below passes. Fourth study of `programs/cyber.md`, under `docs/THREAT-MODEL-002.md`, after `results/cy1b/REPORT.md`. First paid study of the cyber line.

## Question

CY1b found a code rule that defends CC4 well: `disinfect-cd10` restores a host on any suspicious process *or* connection, servers first, and leaves a restored host alone for 10 steps. It beat `react` on 44 of 50 seeds, and on 36 of 50 of a second seed set. CY2 asks two things of LLM blue teams:

1. **Does the doctrine help an LLM team?** Are zone agents told the mechanism better than the same agents without it?
2. **Does an LLM team add anything over the rule itself?** Does an LLM given the doctrine beat the code rule, or only cost money?

A second red agent is added so that a verdict is not an artefact of one attacker.

## Setting

- CC4 at commit `8c3c50ca54b176c2de199847944e8dcc035497e3`, the CY0 container, 500-step episodes, green `EnterpriseGreenAgent`.
- **Red, two arms:** `FiniteStateRedAgent` (as CY0 to CY1b) and `DiscoveryFSRed` (shipped with CC4: prioritises servers and discovery, with different transition probabilities). Fixed, not adaptive.
- **Seeds 74001 to 74030** (new), every blue arm on every seed under each red: paired by seed within a red arm.
- **Network:** the simulator has no real network and red is simulated, so no attack code runs anywhere. The runner container gets egress only to the Anthropic API, which is needed for the model calls. The API key is read from a mounted file (`<secrets directory>anthropic-api-key`), never from env or argv, and never logged.

## Blue arms

Five zone agents, as in CC4. One action per agent per step. **A zone agent is called only on a step where at least one of its hosts shows a suspicious process or connection**. On every other step it sleeps without a call. The same cue gates the code arms, so every arm acts on the same steps.

| Arm | Kind | Policy on a cue step |
|---|---|---|
| `code-react` | free, reference | CY1b's `react` |
| `code-cd10` | free, reference | CY1b's `disinfect-cd10` |
| `llm-plain` | paid | Claude Haiku 5.5 zone agent; the prompt describes CC4, the zone and its valid actions, and asks for one action. No doctrine. |
| `llm-doctrine` | paid | as `llm-plain`, plus the doctrine as three plain sentences: restore a host showing a suspicious process or connection; servers first; leave a host you restored alone for 10 steps. |

**Model call.** `claude-haiku-5-5`, no extended thinking, `max_tokens` 200. The system prompt (CC4 description, zone hosts, valid action list, doctrine where present) is fixed per agent and prompt-cached. The user turn holds the step number, each host with its current suspicious process and connection counts, and the agent's own last 20 actions with their steps. The reply must be one valid action label. Any other reply is executed as Sleep and counted as invalid. No messages between agents: CY1 showed that alarms in CC4 arrive after the damage.

## Budget (approved: hard cap [US$ redacted])

The ledger has **[US$ redacted] left** under its [US$ redacted] cap ([US$ redacted] committed).

Measured, free, on 6 episodes: **about 10% of zone-agent steps carry a cue**, so 200 to 260 calls per episode. Per call: about 3,400 input tokens (CY0's view size), 2,200 of them the cached action list and prompt, plus about 150 output tokens. At Haiku 5.5 list prices ([US$ redacted] input, [US$ redacted] output per million, cache reads at a tenth of the input price) that is about [US$ redacted] per call, or **about [US$ redacted] per episode**. The plan uses **[US$ redacted] per episode** (about twice the estimate).

| Item | Episodes | Planned |
|---|---:|---:|
| Pilot (below) | 4 | [US$ redacted] |
| Study: 2 paid arms × 2 reds × 30 seeds | 120 | [US$ redacted] |
| Reserve (retries, cache misses) | | [US$ redacted] |
| **Hard cap** | | **[US$ redacted]** |

The runner reserves in the shared ledger before each wave and never exceeds the bench's [US$ redacted] per-batch cap. A wave is at most 30 episodes. The free arms cost nothing. The batch API does not fit: each episode is a chain of dependent steps.

## Pilot gate (paid, before any study episode)

`llm-plain` and `llm-doctrine` on 2 seeds outside the study (74101, 74102), red `FiniteStateRedAgent`. The study runs only if all of these hold:

- measured cost **at most [US$ redacted] per episode**, so the study fits the cap with margin;
- **at least 95% of replies** are valid action labels;
- every episode completes, and a repeated call log replays to the same actions.

If the gate fails, the study does not run. The pilot is reported, and any change to the prompt or the budget comes back to the owner as a new draft. Pilot episodes are never used as data.

## Hypotheses and verdicts (sign test on paired seeds, ties dropped)

Each hypothesis is judged separately under each red. Two red arms, so the per-red threshold is Bonferroni-corrected: **at least 21 of 30 seeds** (one-sided P(X ≥ 21 | 30) = 0.021 < 0.025).

- **H1, the doctrine helps an LLM team:** `llm-doctrine` has a higher reward than `llm-plain`.
- **H2, the LLM adds something over the rule:** `llm-doctrine` has a higher reward than `code-cd10`. The opposite direction is also pre-stated: **H2', the rule beats the LLM**, if `code-cd10` wins on at least 21 of 30.
- **Guard (applies to H1 and H2):** the winner's mean successful red Impacts are at most 1.10 × the loser's. Otherwise the reward gain is recorded as "reward up, red not stopped".

Verdict labels: **supported** under both reds; **red-dependent** under one; **not supported** under neither. Verdicts belong to this cell (CC4, two fixed reds, Haiku 5.5, cue-gated calls).

**Reported for every arm:** reward (mean, median, range), failed green actions split into blue-attributed and red-attributed (CY1's rule), red Impacts and first Impact step, peak red hosts and root hosts, actions by type, invalid replies, calls, input/output/cached tokens and US$ per episode. Also reported: how often `llm-doctrine` departs from what `code-cd10` would do on the same view, and what those departures do.

## What a result decides (stated in advance)

- **H1 supported and H2' supported:** the doctrine is worth teaching, but the rule alone is enough in CC4. The next paid money goes to the range phase, not to more CC4 LLM arms.
- **H2 supported:** an LLM team adds value over the rule. CY3 tests coordination (`manager` and `single` from the programme row) with the doctrine.
- **H1 not supported:** the LLM ignores or misuses the doctrine. The departures analysis says which, before any further paid study.

## Deferred from the programme row

The `programs/cyber.md` row for CY2 named `manager` and `single` team arms. They are left out of CY2 to keep the first paid study inside about a third of the remaining ledger, and to answer the prior question first: whether the doctrine transfers to an LLM at all. They move to CY3. Adding them roughly doubles the cost (`manager` makes six calls per step on cue steps).

## Limits stated in advance

Haiku 5.5 only, one prompt, no tuning. The cue gate means the LLM never acts on quiet steps, so it cannot do anything proactive (decoys, blocks) except on a cue step. Both reds are fixed scripts. A red that adapts to the defence is out of scope. CC4's actions are abstract, and the reward is dominated by failed green work. 30 paired seeds per red can miss small effects (CY1 missed `disinfect` at 50).

## Amendments before any call (2026-11-20)

Agreed between Research and the bench before the first CY2 call, while writing the runner (`observatory/cyber/cy2/`). No hypothesis, arm, seed, red or cap changes.

1. **Prompt text.** The system prompt is the one `observatory/cyber/cy2/cy2.py` builds (`system_prompt`): CC4 described in plain words, the agent's zone and hosts, the actions with their CC4 durations (Analyse 2, Remove 3, Restore 5 steps), and the valid action list. `llm-doctrine` adds one line, "Doctrine:" followed by the three sentences above word for word; it is the only difference between the two LLM arms.
2. **Own last 20 actions.** Only the actions the agent chose on steps where it was called; quiet-step sleeps are left out. An invalid reply enters the history as Sleep.
3. **Valid reply.** The exact action label after trimming leading and trailing whitespace. Anything else (quotes, backticks, extra text) is invalid and executed as Sleep.
4. **Temperature.** Not set, so the API default (1.0); the report states it. "A repeated call log replays to the same actions" means the episode re-run with the replies from its call log, no new calls, giving the same action hash, trajectory and reward.
5. **Ties.** A hypothesis passes under a red with at least 21 wins in absolute count, also when ties leave fewer than 30 non-tied seeds; the exact one-sided p on the non-tied seeds is reported too.
6. **Pilot completion.** A transient API error (429, 5xx, timeout) is retried with backoff on the same call, with no new decision. An episode counts as not completed only when the retries run out. The cost check holds for both the worst and the mean pilot episode; valid replies are pooled over all pilot calls.
7. **Budget gate (correction).** The cost check above allows [US$ redacted] per episode, but 0.25 × 120 = [US$ redacted] is above the [US$ redacted] cap. Added rule: **the study starts only if 1.25 × the pilot's mean cost per episode × 120 ≤ [US$ redacted] − the pilot's spend**. If not, the study does not run and returns to the owner as a new draft. Every wave carries whole seeds (both paid arms of the same seed and red), so a cap stop never leaves an incomplete pair. The pilot reserves [US$ redacted] (4 × 0.25); a study episode reserves the larger of [US$ redacted] and 1.25 × the worst pilot episode, and a wave holds at most 30 episodes and [US$ redacted]
8. **Ids and guard.** The analysis (`observatory/cyber/cy2/analyze2.mjs`) names the hypotheses CY2-H1, CY2-H2 and CY2-H2p (H2'). The Impacts guard applies to H1 and H2 only, not to H2'. Under a red, a win that fails the guard is recorded as "reward up, red not stopped" and does not count as a pass; "supported" needs a pass under both reds.

## Pilot 1 failed on instrument (2026-11-20)

**Pilot 1** (ledger entry `cy2-pilot`, data in `results/cy2/pilot/`, never used as data): `llm-plain` and `llm-doctrine` on seeds 74101 and 74102, red `FiniteStateRedAgent`. Cost per episode [US$ redacted] mean, [US$ redacted] worst (pass); budget gate of amendment 7 [US$ redacted] projected (pass); every episode completed and replayed (pass); **valid replies 70.7% (638 of 902), below 95% (fail)**. Spend [US$ redacted] reconciled in the ledger. The study did not run.

**Cause: the instrument, not the model's choices.** 263 of the 264 invalid replies stopped at `max_tokens` (200), 200 of them with no text at all; valid replies also used 147 output tokens on average for a label of about 10 tokens. The output went to non-text content blocks. This preregistration says "no extended thinking", but the runner sent no `thinking` setting, so the model's default applied, and it logged only text blocks.

**Fix (only this):** the request sends `"thinking": {"type": "disabled"}` explicitly, and the call log records the type of every content block and the stop reason. The request shape is checked first on the free token-counting endpoint (accepted on 2026-11-20). Prompt, `max_tokens` 200, temperature, arms, seeds 74101 and 74102 and every gate limit stay as registered.

**Owner approval, 2026-11-20:** "Aprovo o 2º piloto" [I approve the second pilot], about [US$ redacted] inside the CY2 cap of [US$ redacted] Pilot 2 runs under ledger entry `cy2-pilot2`, data in `results/cy2/pilot2/`, and is never used as data. Its spend and pilot 1's both count against the [US$ redacted] cap and in the budget gate of amendment 7 ([US$ redacted] minus everything CY2 has spent before the study). If pilot 2 passes the gate, the study runs through the bench to the end; if it fails, the study stops and the pilot is reported.

## Post-hoc amendment: outcomes the decision list did not cover (2026-11-20, added before results were read)

Added on 2026-11-20 while the study was running (wave 4 of 4), **before any verdict was computed or any result was read**. Proposed by Cyber Research, approved by the Research Leader. It changes no hypothesis, arm, seed, red, threshold, guard or cap: it only extends "What a result decides" to outcomes that list left open. If the verdicts are published before this amendment reaches `main`, it is not a decision rule for this study, only the interpretation in the report.

- **H1 supported, H2 and H2' both not supported** (the LLM with the doctrine ties with the rule): read as the first case. The LLM costs money with no measured gain, so the next step is the range phase, not more CC4 LLM arms.
- **H2 or H2' red-dependent** (a pass under one red only): no paid CY3 on that basis. The result is recorded as red-dependent and the next step is the range phase, where the red is different. CY3 needs H2 supported.
- **A reward win that fails the Impacts guard** ("reward up, red not stopped"): counts as not supported, as amendment 8 already states. The Impacts enter the departures analysis.
