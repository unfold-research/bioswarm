---
id: "H-LI72"
title: "On harder tasks, waiting for the trace solves in fewer waves than a manager agent"
area: "hypothesis"
evidence: "local validation"
status: "preliminary-support"
posthoc: "wavesToSolve counts the manager plan waves, so part of the gap is by design; at 120 modules the manager was also short of act rounds (LI24 review)"
registered: "supported"
tags: ["coordination","bio-mechanism","llm-swarm","code","scale"]
sources: ["Unfold research (2026-11-18), LI studies."]
related: []
updated: "2026-11-19"
summary: "On harder tasks, waiting for the trace solves in fewer waves than a manager agent (`stigwait` against `manager` on `wavesToSolve`)."
---

# On harder tasks, waiting for the trace solves in fewer waves than a manager agent

**Status: see the registered verdict and the post hoc reading above.** Registered in `tasks/LI24-ACT-ROUNDS-CONTROL-PREREG.md`.

## Statement
`stigwait` is better than `manager` on `wavesToSolve` in more cases (per-case sign test, p < 0.05).

## Result
Report: `results/li24-k80/REPORT.md`. Review: `docs/reviews/LI24-REVIEW-2026-11-18.md`.
