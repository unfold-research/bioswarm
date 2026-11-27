# CY0 preregistration: CAGE Challenge 4 instrument pilot (2026-11-20)

Registered before any run. Owner instruction of 2026-11-20 to start the cyber line, simulation first and then a range. First study of `programs/cyber.md` under `docs/THREAT-MODEL-002.md`.

## Purpose

A pilot, not a test: no hypothesis, **no model calls and no spend**. It checks that the instrument works and measures what an LLM blue team would cost, so CY1 and CY2 can be sized before any money is committed.

## Setting

- Environment: CybORG CAGE Challenge 4 from the public `cage-challenge/cage-challenge-4` repository, commit pinned in the run record, installed in a container on benchhost (no network at run time).
- Red: the environment's built-in red agents, default configuration. Green: built-in.
- Blue arms, all code with no model: `sleep` (no action), the environment's provided heuristic or example defender if one ships, `react` (restore any host showing a red indicator, no messages), `react-msg` (as `react`, and each zone broadcasts an 8-bit alarm that neighbours use to analyse their border hosts).
- 50 episodes per arm, seeds 70001 to 70050, default episode length.

## Reported

Per arm: mission score as the environment defines it, red objective reached or not, hosts compromised over time, green work lost, actions by type, messages sent, wall time per episode. For the LLM cost estimate: size of each blue observation and action list (characters, and tokens by the Anthropic token counter on a sample of 100 observations, which is free), steps per episode, and the projected tokens and dollars per episode for a five-agent LLM team and for `manager` and `single`, at Haiku 5.5 and Sonnet 5.5 batch prices.

Also checked and reported: the message channel delivers what is sent in the same and the next step; seeds reproduce the same episode; every blue observation is reachable through the API we would give an agent.

## What decides the next step

CY1 (code-policy screen) proceeds if the four arms run and seeds reproduce. CY2's design and cap are proposed to the owner with CY0's cost projection; nothing paid starts without that.

## Limits stated in advance

A simulator's abstract actions are not a network; the CAGE red agents are fixed and not adaptive; code policies are a screen, not a test of agents. CY0's numbers describe the instrument only.
