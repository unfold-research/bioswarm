---
id: "H-LI59"
title: "On harder tasks, waiting for the trace leaves fewer checks failing on fresh inputs than a manager agent"
area: "hypothesis"
evidence: "local validation"
status: "preliminary-support"
posthoc: "follows from H-LI58 (an unsolved arm fails fresh inputs on its leftover checks); same equal-wave-budget design and plan truncation; LI24 is the control (LI19 review)"
registered: "supported"
tags: ["coordination","bio-mechanism","llm-swarm","code"]
sources: ["Unfold research (2026-11-18), LI studies."]
related: []
updated: "2026-11-18"
summary: "On harder tasks, waiting for the trace leaves fewer checks failing on fresh inputs than a manager agent (`stigwait` against `manager` on `holdoutFailing`)."
---

# On harder tasks, waiting for the trace leaves fewer checks failing on fresh inputs than a manager agent

**Status: see the registered verdict and the post hoc reading above.** Registered in `tasks/LI19-HARDER-TASKS-PREREG.md`.

## Statement
`stigwait` is better than `manager` on `holdoutFailing` in more cases (per-case sign test, p < 0.05).

## Result
Report: `results/li19-k80/REPORT.md`. Review: `docs/reviews/LI19-REVIEW-2026-11-18.md`.
