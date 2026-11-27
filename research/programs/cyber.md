# Cyber: defence structures from biological swarms

Do the defence structures of biological collectives (alarm with decay, contact-network plasticity, sentinels, recognition thresholds, sacrificial disinfection, scaled mobbing) make a team of defender agents better at protecting a network under attack than the defence the market ships: a **SOC manager agent** that triages and dispatches, a **group chat** of responders, or **conventional controls** alone? And which attacker swarms, biological or engineered, break which defence? Active programme since 2026-11-20 (owner); runs in parallel with [coordination](coordination.md). Plan decision D-039.

## Why this is a different line

The coordination programme uses code repair as its task. This line leaves code: the task is keeping a network's mission running while an adversary moves through it. The swarm defends an **external system** (TM-002, `docs/THREAT-MODEL-002.md`), not itself; defence of the swarm itself stays in the paused [defence](defence.md) programme under TM-001.

## Arms

| Side | Arm | What it is |
|---|---|---|
| Blue | `controls` | Conventional controls only: static segmentation, the environment's heuristic defender, no agent judgement |
| Blue | `single` | One defender agent with the whole network and the whole budget (cost-matched reference) |
| Blue | `manager` | Zone agents report to a SOC manager agent that triages alerts and dispatches actions (market) |
| Blue | `chat` | Zone agents share one channel and coordinate freely (market) |
| Blue | `bio-<mechanism>` | Zone agents follow one mechanism from `docs/CYBER-MECHANISMS.md`, nothing else changed |
| Red | `scripted` | The environment's own attackers and fixed ATT&CK-style chains (repeatable baseline) |
| Red | `llm-single` | One attacker agent |
| Red | `llm-manager` | An attacker team led by a planner agent (engineered swarm) |
| Red | `bio-<mechanism>` | An attacker swarm following a natural strategy: stigmergic reconnaissance, quorum-triggered impact, chemical mimicry, army-ant raids |

Studies cross red and blue arms. A blue mechanism is only credited where it holds against more than one red arm; an attacker strategy is only credited where it beats more than one blue arm (the Red Queen rule: a defence that wins against one fixed attacker has not been shown to defend).

## Environment ladder

| Stage | Environment | Use |
|---|---|---|
| E0 | CybORG CAGE Challenge 4 (public, multi-agent): five blue agents, each guarding a zone, with 8-bit messages between them; a mission network with green (benign) users | Free screening with mechanisms written as code policies, many seeds; then LLM agents for the survivors |
| E1 | An air-gapped container range on benchhost: a synthetic small company (web, database, file server, workstations), sensors from network and host logs, defender actions through a deterministic mediator | Real tools, real logs, scripted adversary emulation and LLM attackers |
| E2 | E1 with adaptive attackers that learn between episodes | Red Queen studies |

## Measures

Mission kept (green work that still completes), attacker objective reached or not, time to detect, time to contain, hosts compromised (blast radius), benign work lost to defence (false isolation, unnecessary restore), messages used, tokens and dollars, wall time. A defence that stops the attacker by stopping the business is scored as a loss.

## Funnel and evidence

Same funnel and ladder as [coordination](coordination.md): code-policy screens on E0 first (L0, free), preregistered paid studies through the research bench and its single ledger for survivors, then E1. A blue mechanism climbs only against the strongest market baseline at that stage (a manager with ample rounds, a single agent at matched cost) and against at least two red arms.

## Rules for the attack side

- Attacks run only inside E0 or the E1/E2 range: no egress, no third-party system, no real person's data, no target outside the lab.
- Attacker swarm code, prompts and playbooks stay in this private repository. Public material reports defence findings only (D-021: no research figures in public material without a decision).
- Abracadabra (offensive security consultancy) stays out of Unfold (D-035); attacker swarms here are a lab instrument and a research question, amended by D-039.

## Studies

| Id | What | Status |
|---|---|---|
| CY0 | Instrument pilot on E0: baselines, message channel, cost per episode of an LLM blue team; no hypothesis, no paid calls | done 2026-11-20: instrument reproduces; an alarm that only makes neighbours analyse did worse than no messages (39 of 50 seeds); a per-step LLM team costs [US$ redacted] to 1.9 per episode in Haiku 5.5, so CY2 calls agents on events only. `results/cy0/REPORT.md` |
| CY1 | Code-policy screen of the blue mechanisms CAGE 4 can express (alarm with decay, plasticity, early disinfection, fever) against matched controls (free) | done 2026-11-20: no mechanism passes. `disinfect` (restore on a suspicious connection too) is best on every mean and has the fewest red Impacts but beats `react` on only 27 of 50 seeds; alarm-gated decoys lose to unconditional decoys and adaptive blocking blocks green work most. `results/cy1/REPORT.md` |
| CY1b | Free screen of early-disinfection variants (cooldown, ordering, graded Remove/Restore, escalation) against `react`, new seeds | done 2026-11-20: four Restore-based variants pass; `disinfect-cd10` (restore on a suspicious connection too, 10-step cooldown) beats `react` on 44 of 50 seeds with a third fewer red Impacts and becomes the CY2 candidate; Remove-based graded and escalating forms fail. `results/cy1b/REPORT.md` |
| CY2 | First paid study: LLM zone teams (Haiku 5.5, called on cue steps) with and without the `disinfect-cd10` doctrine, against the rule as code, under two reds; hard cap [US$ redacted] | `tasks/CY2-PREREG.md`, registered 2026-11-20; pilot gate first |
| CY3 | Coordination with the doctrine: `manager` and `single` team arms (deferred from CY2) | after CY2, only if H2 is supported |
