# CY2 Independent Review

Reviewer: OpenAI Codex, `openai-codex/gpt-6-luna` (Colony bench, research bench automatic review)

| Severity | Finding | Response |
|---|---|---|
| Major | LLMs are far below `code-cd10`: doctrine improves both LLM comparisons, but does not beat the rule. | — |
| Major | Strong H1 means are paired correctly, but the register's 21/30 threshold is described as P=.0214 only for 30 non-ties; amendment permits ties, so effective n and exact p must be read from output. | — |
| Moderate | Both LLM arms take many non-CD10 actions; doctrine is not equivalent to implementing the policy. | — |
| Moderate | One model family, one synthetic simulator, fixed scripts and n=30/red limit external validity and power. | —|
| Moderate | Multiple registered comparisons (H1/H2/H2p) plus two reds: correction is only across reds, not the family of hypotheses. H2p is explicitly unguarded as preregistered. | — |
| Low | The analyzer counts records by map key without validating duplicates/extra records or checking complete paired samples itself; here it reports 240/240 and no missing. | — |

## Re-derived numbers

Ran `node observatory/cyber/cy2/analyze2.mjs`: 240 expected/observed, no missing; 30 paired seeds per arm/red. Registered verdict logic matches implementation: paired sign test, ties dropped, win count ≥21 of 30 (even if ties reduce non-ties), and H1/H2 winner impact mean ≤1.10× loser's; H2p has no impact guard. Results: **H1 supported** (doctrine wins 29/30 under each red; impact means 33.4 vs 35.0667 FSM, 9.7 vs 50.7 discovery). **H2 not supported** (doctrine wins 0/30 FSM and 11/30 discovery; guard fails both). **H2′ red-dependent** (rule wins 30/30 FSM, 19/30 discovery).

Means (reward; impacts): FSM code-react −1752.2;21.37, code-cd10 −1407.27;17.6, plain −5659.2;35.07, doctrine −3093.23;33.4. Discovery: react −275.07;1.27, cd10 −295.87;0.033, plain −2561.83;50.7, doctrine −599.83;9.7. All 120 paid episodes cost [US$ redacted] estimated; 33,052 calls, 3 invalid replies. Pilot 1 failed validity (70.7%) and did not contribute; pilot 2 passed, with 100% valid and replay, and budget gate. Ledger lists both pilots and four waves; each wave reserved [US$ redacted] maximum 30 episodes, actual spend total under [US$ redacted]

Mechanism/paired design: driver enumerates each seed × red × all four arms; code arms make zero model calls. LLM logs show one call per cue step, and request/system prompt differentiates doctrine by its registered text. Cue gating is evident in calls matching cue-step totals. Wave groups comprise both paid arms for each seed/red; free records cover the identical seed/red grid. No evidence of a round-0 mismatch was found in available episode records; simulator episodes are independent runs, not shared evolving instances.

Cases explain the gap: seed 74001/FSM plain made 208 departures from CD10 among 215 calls, mostly Analyse/Monitor/Remove, reward −7769 and 24 impacts. Discovery seed 74001 doctrine still made Analyse/Remove rather than consistent restore, while CD10 averaged essentially zero impacts (0.033); doctrine improved on plain but left 9.7 impacts on average. This fits the cue-only observation/action interface: expensive analysis and delayed removal compete with immediate restore and 10-step protection. Synthetic fixed reds, paired seed dependence, small sample, reward dominated by green failures, API/model stochasticity, and no proactive quiet-step actions constrain interpretation.

Not verified: raw-call replay hashes or each request payload across all 33k calls; shared-instance identity beyond matching seed/red records. Repository copy has no Git metadata. Total word count <700.
