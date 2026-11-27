# PD1 policy discovery: Sonnet finds the right rule from one example; Haiku without reasoning does not read the examples

Preregistration `tasks/PD1-PREREG.md`. Run 2026-11-12: `pd1-plan-haiku` and `pd1-plan-sonnet`, 90 planning calls each, no invalid or truncated plan. Usage estimate [US$ redacted] and [US$ redacted] Analysis: `node observatory/batch2/pd1-policy/analyze.mjs` → `summary.json` here.

A field of 24 parts with a ring position and three labels; three parts edited under a relation the planner is not told (ring neighbours, same source, same shelf, same batch). The planner sees 0, 1 or 4 past fields with the edited parts marked and returns a policy (what to follow, how far, where to probe). The policy runs in code on 1,000 test fields of the domain. No model is called after the plan.

Share of test fields right, mean of 10 plans per cell.

| Domain | Examples | Sonnet plan | Haiku plan | Fit on the same examples | Ring rule carried over | Best of the 85 |
|---|---|---|---|---|---|---|
| ring | 1 | 0.75 | 0.63 | 0.38 | 0.75 | 0.75 |
| source | 1 | 0.74 | 0.51 | 0.40 | 0.27 | 0.74 |
| shelf | 1 | 0.57 | 0.28 | 0.32 | 0.24 | 0.62 |
| batch | 1 | 0.69 | 0.56 | 0.52 | 0.23 | 0.74 |
| ring | 4 | 0.75 | 0.55 | 0.53 | 0.75 | 0.75 |
| source | 4 | 0.74 | 0.27 | 0.64 | 0.27 | 0.74 |
| shelf | 4 | 0.61 | 0.25 | 0.53 | 0.24 | 0.62 |
| batch | 4 | 0.74 | 0.39 | 0.69 | 0.23 | 0.74 |
| **all four** | 1 | **0.69** | 0.49 | 0.41 | 0.37 | 0.71 |
| **all four** | 4 | **0.71** | 0.36 | 0.60 | 0.37 | 0.71 |
| all four | 0 | 0.33 | 0.32 | – | 0.37 | – |

With no example both models choose the ring rule or a spread over the ring (19 of 20 plans).

| Test | Sonnet | Haiku |
|---|---|---|
| P1 a plan from four examples beats the ring rule off the ring | **supported**: +0.45 (0.42 to 0.47) | supported, small: +0.05 (0.00 to 0.12) |
| P2 and is within 0.10 of the best rule | **supported**: 0.004 below (0.000 to 0.011) | **not supported**: 0.35 below (0.29 to 0.40) |
| P3 plan minus fit, one example | **supported**: +0.28 (0.23 to 0.34) | not supported: +0.09 (−0.01 to 0.18) |
| P3 plan minus fit, four examples | **supported**, against the expectation of no difference: +0.11 (0.07 to 0.15) | **refuted**: −0.23 (−0.31 to −0.15) |
| P4 four examples against none | **supported**: +0.38 (0.33 to 0.43) | not supported: +0.05 (−0.02 to 0.13) |
| P5 Sonnet minus Haiku | one example +0.19 (0.13 to 0.26); four +0.35 (0.29 to 0.40) | |

Sonnet named the right relation and the right probe in 39 of 40 plans with one example and 40 of 40 with four. Haiku named the right relation in 23 of 40 with one example and 13 of 40 with four (10 of those on the ring, where the default is right).

## Reading

- **As a method it worked for the model that reasons.** One planning call of about [US$ redacted] from a single example, gives a rule within 0.03 of the best of the family, and from four examples a rule equal to it. Carrying over the rule found on the ring gives chance (0.23 to 0.27) on every other structure. The plan costs nothing to run afterwards.
- **The model generalises from one example better than a fit by simulation does.** The fit on one example leaves most of the 85 policies tied and picks badly (0.41). On four it reaches 0.60, still 0.11 below Sonnet, because it gets the relation right but not always the probe or the limit. I expected no difference at four examples; that was wrong.
- **Haiku with thinking disabled does not use the examples, and more examples make it worse**: 0.49 with one, 0.36 with four, against 0.32 with none. Its working says the edited parts "appear random" and falls back to the ring. With four examples of 24 rows each it has to find a shared label in 96 rows inside 120 words of working, and does not.
- **This comparison confounds model size with reasoning.** Sonnet ran with adaptive thinking at low effort; Haiku with thinking disabled, as in every earlier study. The result says that planning needs reasoning; it does not say Haiku with reasoning could not do it. That arm was not run.
- With RD, D6 and T1 the picture is consistent: a model deciding step by step does not reach the good policy (D6, T1), a model planning once with reasoning does (RD, PD1), and the plan then runs as code.

## Limits

The policy family names the four relations, so the planner chooses among listed hypotheses; finding a relation nobody listed is not tested. Readers are simulated and exact; edits always touch three parts under one relation; one wording; 10 plans per cell. The task is a search over a small labelled field, far from the complex tasks the programmes are about: this is a result about how to obtain a coordination rule, not about a swarm solving a hard task.
