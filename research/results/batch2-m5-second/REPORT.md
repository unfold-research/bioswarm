# M5 the second searcher: rewording and telling it of the rejection do not help; a stronger model does

Preregistration `tasks/M5-SECOND-PREREG.md`. Run 2026-11-11: 360 + 178 requests on `claude-haiku-5-5` (`m5-second`) and 90 on `claude-sonnet-5-5` (`../batch2-m5-second-sonnet/`), all succeeded and valid. Usage estimate [US$ redacted] and [US$ redacted] `summary.json` and `combined.json` (from `observatory/batch2/m5-second/analyze.mjs`) in this folder.

## Result

Analysis set by the registered band: 12 and 24 records (60 tasks). At 48 records the base prompt was right on 2 of 30 and is excluded.

| Strategy | 12 | 24 | 48 | Analysis set |
|---|---|---|---|---|
| single (s0) | 0.77 | 0.60 | 0.07 | 0.68 |
| reworded prompt r1 alone | 0.80 | 0.50 | 0.20 | 0.65 |
| reworded prompt r2 alone | 0.67 | 0.27 | 0.07 | 0.47 |
| retry-same | 0.77 | 0.60 | 0.07 | 0.68 |
| retry-reword | 0.77 | 0.50 | 0.13 | 0.63 |
| retry-told | 0.73 | 0.37 | 0.10 | 0.55 |
| vote-diverse3 | 0.77 | 0.60 | 0.10 | 0.68 |
| escalate to Sonnet on rejection | | | | 0.83 |
| Sonnet alone | 1.00 | 1.00 | 0.87 | 1.00 |

| Test | Verdict |
|---|---|
| P1 a reworded fallback beats an identical one | **not supported**: −0.05, interval −0.15 to 0.05 |
| P2 a fallback told of the rejection beats an identical one | **refuted**: −0.13, interval −0.27 to −0.02 |
| P3 a vote over different wordings beats one call | **not supported**: 0.00, interval −0.07 to 0.07 |
| P4 a verifier makes a cascade worth it | **not supported**: 0.83 against 1.00, calling Sonnet on 35% of tasks |

Verifier on the s0 answers: accepted 29 of 43 correct ones (0.67), rejected 32 of 46 wrong ones (0.70), the same quality as in M4. The told fallback repeated the rejected answer in only 3 of 89 cases.

## Reading

- A different wording is not a different searcher. The second sample again repeated the first; the rewordings changed answers but were not better, so a fallback on them, or a vote among them, gained nothing.
- Telling the searcher its answer was rejected made things worse. It nearly always changed its answer, including in the third of cases where the verifier had wrongly rejected a correct one. With a verifier that rejects 0.33 of correct answers, an obedient retry destroys more than it repairs.
- The only second searcher that helped was a stronger model: escalating the rejected 35% to Sonnet raised accuracy from 0.68 to 0.83 (interval of the gain 0.07 to 0.25). It still fell 0.17 short of using Sonnet on everything, because the verifier accepted wrong answers. The verifier, not the searchers, is the limit, which is what H-02 says.

For Murmur: across M4 and M5, more searchers of the same model added nothing in any form tried, and a verifier was worth what its specificity and the quality of the fallback allowed. H-M03 as stated (verify before adding searchers) is still not supported; what is supported is narrower: neither adding same-model searchers nor verifying with the same model moves accuracy, and capability does.

## Limits

One synthetic task, answer-only searchers with thinking disabled, 60 tasks in the analysis set. The Sonnet arm has adaptive thinking, so the cascade compares a constrained small model with an unconstrained large one. The verifier was not given working space; V2 suggests that would change it.
