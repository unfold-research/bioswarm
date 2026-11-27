---
id: "H-LI73"
title: "On harder tasks, waiting for the trace uses fewer tokens than a manager agent"
area: "hypothesis"
evidence: "local validation"
status: "preliminary-support"
posthoc: "per case 436k against 552k output tokens (1.27x), not the 2.9x tokensPerSolved; 24207 alone spent 624k on plans that never assigned work (LI24 review)"
registered: "supported"
tags: ["coordination","bio-mechanism","llm-swarm","code","scale"]
sources: ["Unfold research (2026-11-18), LI studies."]
related: []
updated: "2026-11-19"
summary: "On harder tasks, waiting for the trace uses fewer tokens than a manager agent (`stigwait` against `manager` on `tokens`)."
---

# On harder tasks, waiting for the trace uses fewer tokens than a manager agent

**Status: see the registered verdict and the post hoc reading above.** Registered in `tasks/LI24-ACT-ROUNDS-CONTROL-PREREG.md`.

## Statement
`stigwait` is better than `manager` on `tokens` in more cases (per-case sign test, p < 0.05).

## Result
Report: `results/li24-k80/REPORT.md`. Review: `docs/reviews/LI24-REVIEW-2026-11-18.md`.
