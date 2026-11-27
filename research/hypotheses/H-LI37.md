---
id: "H-LI37"
title: "Agent-written stigmergy beats a manager agent"
area: "hypothesis"
evidence: "local validation"
status: "preliminary-refuted"
basis: "strict check (feedback and scoring)"
posthoc: "invalid: the trace-parser bug dropped about 55% of agent traces; all 7 cases the manager won come from dropped traces; where a trace was delivered the check was resolved 211 of 211 (LI12 review)"
registered: "refuted"
tags: ["coordination","field","orchestration","llm-swarm","code","bio-mechanism"]
sources: ["Unfold research (2026-11-17), LI studies."]
related: []
updated: "2026-11-17"
summary: "stig (the caller agent writes a persistent trace on the check, the helper owner acts) solves at least as many cases as the manager and ends lower in more cases (sign test p < 0.05)."
---

# Agent-written stigmergy beats a manager agent

**Status: see the registered verdict and the post hoc reading above.** Registered in `tasks/LI12-POLARITY-TRACE-PREREG.md`.

## Statement
stig (the caller agent writes a persistent trace on the check, the helper owner acts) solves at least as many cases as the manager and ends lower in more cases (sign test p < 0.05).

## Result
LI12 report: `results/li12-polarity-trace-k80/REPORT.md`.
