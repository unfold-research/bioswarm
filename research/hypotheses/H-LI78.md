---
id: "H-LI78"
title: "Waiting for the trace uses fewer tokens per case than a manager agent"
area: "hypothesis"
evidence: "hypothesis"
status: "inconclusive"
posthoc: "LI27 incomplete: k80 stopped at the study cap at wave 6, so the registered 24-case test was never run; post hoc at k160 only 10 to 2, Holm p = 0.039; median 454k against 529k output tokens per case, both solving 12 and 11 of 12 (LI27 review)"
registered: "aborted"
tags: ["coordination","bio-mechanism","llm-swarm","code","scale"]
sources: ["Unfold research (2026-11-18), LI studies."]
related: []
updated: "2026-11-19"
summary: "Waiting for the trace uses fewer tokens per case than a manager agent (`stigwait` against `manager` on `tokens`)."
---

# Waiting for the trace uses fewer tokens per case than a manager agent

**Status: aborted; LI27 stopped at the study cap at 80 modules, so no registered verdict (see the post hoc reading above).** Registered in `tasks/LI27-TRACE-OR-TIEBREAK-PREREG.md`.

## Statement
`stigwait` is better than `manager` on `tokens` in more cases (per-case sign test, p < 0.05).

## Result
Report: `results/li27-k160/REPORT.md`. Review: `docs/reviews/LI27-REVIEW-2026-11-19.md`.
