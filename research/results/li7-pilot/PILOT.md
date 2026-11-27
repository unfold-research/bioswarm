# LI7 pilot (2026-11-17)

Two cases (seeds 7900, 7901), all five arms, rounds 0 to 2, Sonnet 5.5 at effort low, Message Batches API, about [US$ redacted] in total (`batches.json`). Used only for cost, prompts and checker sanity; these cases are not part of LI7.

- **Checker bug found and fixed before registration.** The record round trip compared with `JSON.stringify`, so a correct decode that built the record with another key order counted as failing. The pilot ran with the bug: its symmetric counts, and the failure texts members saw on symmetric edges, are wrong. Fixed in `observatory/batch2/rc/code.mjs` (canonical comparison); with the fix the one-agent arm passes both cases from round 0.
- **Round 0 behaves as designed:** every local check passed, every cross-module edge failed (directed: the helper owner has no specification; symmetric: different house styles).
- **Messages carry the requirement:** in the messaging arms callers wrote, e.g., "Please make M2.mintRef(s) return s reversed ... it breaks M4.packTerm"; one member added a fallback inside its own function while waiting (a workaround the checker classifies as a local failure only when the caller stops using the helper's result).
- **Cost:** first repair round [US$ redacted] for 37 calls (mean 860 output tokens, one reply truncated at 5,000 tokens with no text).
- Indicative only (buggy checker): after two rounds `routed` solved 1 of 2, `solo` 2 of 2, the other arms 0.
