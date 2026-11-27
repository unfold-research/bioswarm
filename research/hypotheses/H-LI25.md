---
id: "H-LI25"
title: "The geometry router beats a manager agent at equal N"
area: "hypothesis"
evidence: "local validation"
status: "preliminary-refuted"
basis: "strict check (scoring) / registered check (feedback)"
registered: "refuted"
note: "refuted in one study"
tags: ["coordination","field","orchestration","llm-swarm","code"]
sources: ["Unfold research (2026-11-17), LI studies."]
related: ["H-LI20"]
updated: "2026-11-17"
summary: "At 5 and 12 modules the manager solved 19 of 20 codebases and the router 17; refuted."
---

# The geometry router beats a manager agent at equal N

**Status: preliminary refuted (one model, one study).** Registered in `tasks/LI9-ORCHESTRATION-PREREG.md`.

## Result
LI9 (Haiku, 5 and 12 modules, strict check): `manager` 19 of 20, `routed` 17 of 20; the manager ended lower in 2 cases, the router in 0. The manager holds every specification, so it carries helper requirements and picks formats centrally. Scale is tested in LI10.

## Statement
`routed` solves at least 4 more cases than `manager` and ends lower in more cases (sign test p < 0.05).
