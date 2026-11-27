---
id: "H-LI41"
title: "Under member loss the bio router beats a manager agent"
area: "hypothesis"
evidence: "local validation"
status: "preliminary-refuted"
posthoc: "the design retried lost manager plans without spending act rounds and did not score time, so the manager single point of failure was not tested (LI13 review)"
registered: "refuted"
tags: ["coordination","bio-mechanism","llm-swarm","code"]
sources: ["Unfold research (2026-11-17), LI studies."]
related: []
updated: "2026-11-17"
summary: "With 20% of members (and the manager's plan) down each wave, the router ends with fewer failing checks than the manager in more cases (sign test p < 0.05)."
---

# Under member loss the bio router beats a manager agent

**Status: see the registered verdict and the post hoc reading above.** Registered in `tasks/LI13-MEMBER-LOSS-PREREG.md`.

## Statement
With 20% of members (and the manager's plan) down each wave, the router ends with fewer failing checks than the manager in more cases (sign test p < 0.05).

## Result
LI13 report: `results/li13-member-loss-k80/REPORT.md`.
