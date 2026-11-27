---
id: "H-LI26"
title: "The geometry router is cheaper than a manager agent"
area: "hypothesis"
evidence: "local validation"
status: "preliminary-refuted"
basis: "strict check (scoring) / registered check (feedback)"
registered: "refuted"
note: "refuted in one study"
tags: ["coordination","cost","orchestration","llm-swarm","code"]
sources: ["Unfold research (2026-11-17), LI studies."]
related: ["H-LI25"]
updated: "2026-11-17"
summary: "Router 39,827 output tokens per case against the manager's 28,549 (manager calls included); refuted."
---

# The geometry router is cheaper than a manager agent

**Status: preliminary refuted (one model, one study).** Registered in `tasks/LI9-ORCHESTRATION-PREREG.md`.

## Result
LI9: `routed` 39,827 output tokens per case, `manager` 28,549 including its own calls. The manager acts every second wave and leaves unassigned members idle; the router acts every wave on every touched member.

## Statement
`routed` uses fewer output tokens per case than `manager`.
