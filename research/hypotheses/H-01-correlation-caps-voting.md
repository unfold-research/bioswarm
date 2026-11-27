---
id: H-01
title: "Error correlation caps the gain from majority voting"
area: hypothesis
evidence: hypothesis
status: preliminary-support
origin: "theory (th-model §2, §10.2) + literature (Condorcet/Ladha; lit-correlated-errors; lit-synthesis candidate 1) + nature (nat-candidates C01; nat-condorcet-correlated; calculation in research/nature/calc)"
experiment: "sims/sim-correlated-vote (done, in the model) + observatory B-vote3/B-vote5 with repetitions of A-low per task to estimate ρ"
tags: [majority-vote, correlated-errors, condorcet]
sources:
  - "Condorcet (1785). Essai sur l'application de l'analyse à la probabilité des décisions rendues à la pluralité des voix. Paris: Imprimerie Royale."
  - "Ladha, K. K. (1992). The Condorcet Jury Theorem, Free Speech, and Correlated Votes. Am. J. Polit. Sci. 36(3):617ss. doi:10.2307/2111584"
  - "Berg, S. (1993). Condorcet's jury theorem, dependency among jurors. Soc. Choice Welf. 10(1). doi:10.1007/BF00187435"
  - "Kim, E., Garg, A., Peng, K. & Garg, N. (2025). Correlated Errors in Large Language Models. arXiv:2506.07962v1"
  - "research/theory/MODEL.md (th-model) and research/theory/model.mjs"
related: [th-model, sim-correlated-vote, lit-correlated-errors, lit-self-consistency, lit-more-agents, lit-great-models-think-alike, lit-synthesis, nat-candidates, nat-condorcet-correlated, nat-small-groups-correlated-cues, H-10, H-15, H-17, H-22]
updated: 2026-11-07
summary: "With correlated errors (ρ > 0), adding identical voters converges to a ceiling below 100%; above a small correlation, 1 high-effort agent beats any N."
---

# H-01 — Error correlation caps the gain from majority voting

**Status:** `preliminary-support` · **Card evidence level:** `hypothesis` · **Origin:** theory (th-model §2, §10.2) + literature (Condorcet/Ladha; lit-correlated-errors; lit-synthesis candidate 1) + nature (nat-candidates C01; nat-condorcet-correlated; calculation in research/nature/calc)

## Statement
For identical agents with mean success p > ½ and intra-class correlation ρ > 0 between successes on the same task, majority-vote accuracy A_N grows with N but saturates at A_∞ = 1 − I_{1/2}(a, b) (a = p(1−ρ)/ρ, b = (1−p)(1−ρ)/ρ) — or at the probit ceiling Φ(z_p/√ρ), depending on the dependence model —, and the utility-optimal N falls with ρ.

## Variables
p (success of 1 call), ρ (correlation of successes between runs of the same task), N, V/c (value of a success / cost per agent).

## Prediction (quantitative/directional)
- A_N measured for N ∈ {15, 21, 31} stays below the ceiling predicted by the measured ρ + 3 pp (95% CI).
- p = 0.7: the gain from N = 5 → 21 falls from +13.7 pp (ρ = 0) to +6.9 (ρ = 0.1) and +2.0 (ρ = 0.3); A_101 lies < 1 pp from the ceiling for ρ ≥ 0.1.
- Solo → micro threshold: a vote of 3 only pays off if V/c > 2/E[(2P−1)P(1−P)] (p = 0.7: 23.8 with ρ = 0; 59.4 with ρ = 0.3).
- N* (V = 100, c = 1, p = 0.7) = 9 / 5 / 3 for ρ = 0 / 0.1 / 0.3.
- Competing predictions (nat-C01 vs th-model §11): the nat-C01 rule says N ≤ ⌈1/ρ̂⌉ obtains ≥ 90% of the possible gain; the beta model says it obtains only 50–79% (p = 0.7, ρ = 0.1: N = 11 → 69%; 90% requires N = 43). The experiment decides between the two.

Model numbers: `research/theory/model.mjs` → `research/theory/curves/*.json` (illustrative parameters, not measured on an LLM).

## Refutation conditions
Vote accuracy systematically above the predicted ceiling (> 3 pp, 95% CI excluding it) in ≥ 2 task classes; or measured ρ ≈ 0 and early saturation nonetheless (would indicate another mechanism, e.g. difficulty heterogeneity — H-10).

## Proposed experiment
Observatory: for each task, ≥ 10 independent runs of A-low (estimate p and ρ from pairs) and B-vote3/B-vote5 (compare with the predicted A_N). Simulation: `sims/sim-correlated-vote` (already run).

## Current evidence
Model: ceiling and marginal gain checked (model.test.mjs). Simulation `sim-correlated-vote` (local-validation **in the model**, preregistered): P1–P4 supported — ρ ≥ 0.075 already prevents 64 agents with p = 0.6 from reaching 1 agent with p = 0.8. Literature (`lit-correlated-errors`, author-reported): when two LLMs are wrong, they choose the same wrong answer ≈ 60% of the time (HELM; chance ≈ 1/3), and the correlation grows with accuracy — in the model, K_eff ≈ 1.7, close to the binary worst case (th-model §10.2). The independent calculation by the nature agent (`research/nature/calc/collective-theory.js`) reproduces the same beta-binomial ceiling (p = 0.6, ρ = 0.1 → 0.736). **No local LLM measurement** — hence "preliminary".

## First run on a real model (V1, 2026-11-11)
`results/batch2-v1-vote/REPORT.md`: mostly uninformative because the task was too hard (8% single-sample accuracy). On the one level with usable accuracy, success was a property of the task rather than of the sample (intraclass correlation about 0.7, eight tasks). Status unchanged; a redesigned run (V1b) is needed.

## Limits
Binary answer (worst case). Dispersed errors favor plurality: ceiling 1 − I_{1/(1+K_eff)}(a,b) (th-model §10.2); on MATH (Monkeys) the vote at ~41% implies K_eff ≈ 9.4.

## Result (V1b and M4, Claude Haiku 5.5, 2026-11-11)
`results/batch2-v1b-vote/REPORT.md`: intraclass correlation of correctness 0.79 among identical samples within a difficulty level; plurality of five moved accuracy from 0.51 to 0.52. `results/batch2-m4-budget/REPORT.md`: five samples gave one answer in 82 of 90 search tasks.

## Result (V2, Claude Haiku 5.5, 2026-11-11)
`results/batch2-v2-working/REPORT.md`: on the search task one agent with about twenty words of working reached 0.97 against 0.58 for a vote of three answer-only agents, at lower total cost.

## Result (V3, Claude Haiku 5.5, 2026-11-11)
`results/batch2-v3-collective/REPORT.md`: when each agent has working space the samples differ on 60% of tasks and a vote of three gains 0.09 over one agent (interval 0.02 to 0.17); two more voters add 0.02.

## Result (V4 and M7, Claude Haiku 5.5, 2026-11-11)
`results/batch2-v4-diverse/REPORT.md` and `results/batch2-m7-select/REPORT.md`: three copies beat one agent by 0.10 again; five copies reached 0.79 where at least one of the five was right on 0.91 of tasks.

## Result (V5 and M8, Claude Haiku 5.5 and Sonnet 5.5, 2026-11-11)
`results/batch2-v5-budget/REPORT.md`: Haiku with 150 words of working 0.87, Sonnet direct 0.70, Sonnet with 60 words 1.00; working costs about a twentieth per correct answer of the step to the larger model. `results/batch2-m8-deep/REPORT.md`: behind an agent with 150 words of working a verifier added 0.01 to 0.02, not separable from zero.

## Result (V6, Claude Haiku 5.5 and Sonnet 5.5, 2026-11-11)
`results/batch2-v6-second/REPORT.md`: on a second task (counting by group) working space again gave the largest gain (0.52, 0.69, 0.80, 0.94 for none, 20, 60 and 150 words), but a vote of three was no better than one agent (0.64 against 0.69) and worse at the hardest size. The vote gain of V3 and V4 did not replicate.
