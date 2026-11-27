---
id: "H-LI83"
title: "On harder tasks, waiting for the trace uses fewer tokens than a group chat"
area: "hypothesis"
evidence: "local validation"
status: "preliminary-support"
posthoc: "368k against 928k output tokens per case; partly because stigwait stops spending once it solves (LI28R review)"
registered: "supported"
tags: ["coordination","bio-mechanism","llm-swarm","code","nature-breadth"]
sources: ["Unfold research (2026-11-18), LI studies."]
related: []
updated: "2026-11-19"
summary: "On harder tasks, waiting for the trace uses fewer tokens than a group chat (`stigwait` against `chat` on `tokens`)."
---

# On harder tasks, waiting for the trace uses fewer tokens than a group chat

**Status: see the registered verdict and the post hoc reading above.** Registered in `tasks/LI28-NATURE-BREADTH-HARD-PREREG.md`; LI28 stopped at its cap (aborted, no verdicts) and was rerun as `tasks/LI28R-NATURE-BREADTH-RERUN-PREREG.md`.

## Statement
`stigwait` is better than `chat` on `tokens` in more cases (per-case sign test, p < 0.05).

## Result
Report: `results/li28r-k80/REPORT.md`. Review: `docs/reviews/LI28R-REVIEW-2026-11-19.md`.
