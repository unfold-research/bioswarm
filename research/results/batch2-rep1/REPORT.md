# REP1 replication at 300 tasks per family: four results hold, one does not

Preregistration `tasks/REP1-PREREG.md`. Run 2026-11-11: `rep1-search` and `rep1-count` on `claude-haiku-5-5` (2,400 + 300 requests each), `rep1-local-sonnet` (Sonnet orchestrator, Haiku readers, 60 new collections). All requests succeeded. Usage estimate [US$ redacted] 0.46 and 0.97. Analysis: `node observatory/batch2/rep1/analyze.mjs` → `summary.json` here.

## Part 1: working space, votes and verification

Share of tasks right, 300 new tasks per family (24, 48 and 96 records, 100 each).

| Strategy | Calls | search | count |
|---|---|---|---|
| direct (one agent, answer only) | 1 | 0.21 | 0.55 |
| vote of three direct agents | 3 | 0.21 | 0.55 |
| single (one agent, 20 words of working) | 1 | 0.82 | 0.66 |
| vote of three such agents | 3 | 0.85 | 0.67 |
| verify3 (verifier, fallback on a second sample) | 2 or 3 | 0.89 | 0.69 |
| one agent, 60 words | 1 | 0.92 | 0.84 |
| one agent, 150 words | 1 | 0.96 | 0.93 |

| Test | search | count | Replicated |
|---|---|---|---|
| R1 one agent with a little working beats a vote of three without | **supported**: +0.62 (0.56 to 0.67) | **supported**: +0.11 (0.06 to 0.16) | **yes** |
| R2 a vote among direct agents adds nothing | **supported**: −0.01 (−0.02 to 0.01) | **supported**: −0.01 (−0.02 to 0.00) | **yes** |
| R3 a verifier beats a vote at the same calls | **supported**: +0.04 (0.02 to 0.07) | **supported**: +0.03 (0.00 to 0.05) | **yes**, and the effect is small |
| R4 a vote helps agents that reason | **not supported**: +0.02 (−0.01 to 0.06) | **not supported**: +0.01 (−0.01 to 0.03) | **no** |
| R5 one deeper agent beats the verified collective | **supported**: +0.07 (0.03 to 0.10) | **supported**: +0.24 (0.19 to 0.29) | **yes** |

Verifier: accepted 245 of 247 correct answers and rejected 45 of 53 wrong ones on search; 178 of 197 and 93 of 103 on count. The three working samples differed on 24% and 20% of tasks; the three direct samples on 22% and 3%.

## Part 2: the planned search

On 60 new collections the Sonnet orchestrator given the locality prior was right on **60 of 60** under a local edit and 60 of 60 when nothing changed (RD: 59 of 60). On the same collections, by simulation with exact readers: fixed schedule 0.50, reactive alarm rule 0.70, planned search in code 1.00. **R6 supported.**

## Reading

- Three statements now rest on 300 tasks in each of two task families: working space for one agent is worth more than three agents without it; a vote among agents that answer directly adds nothing; a verifier with a fallback beats a vote at the same number of calls. The last one is real and small, three to four points.
- **The gain of a vote among reasoning agents did not replicate.** V3 and V4 gave +0.09 and +0.10 on 90 tasks each, with intervals above zero; here it is +0.02 and +0.01 on 300, with intervals that include zero. Two supported results on 90 tasks were sampling. The consolidated table already listed this gain as not generalising after V6; it is now withdrawn.
- **One deeper agent beats the verified collective**, which earlier runs could not separate (V3, M7): 0.96 against 0.89 on search and 0.93 against 0.69 on count, in one call against two or three. On these tasks spending on the reasoning of one agent dominates every collective of shallower agents that was tried, at lower cost.
- The planned search is confirmed on a second set of collections.

Sizes matter: at 24 records nearly everything with working is at ceiling; the separations come from 48 and 96 records.

## Limits

Two synthetic task families sharing a record format; one small model in part 1; single runs. "Deeper" means 150 words of working in a JSON field. The collectives are copies of one prompt.
