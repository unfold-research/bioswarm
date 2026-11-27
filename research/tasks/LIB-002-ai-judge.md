# LIB-002 — AI judge for the evidence cards (cap [US$ redacted])
Owner: Norevia Library. Requested by the user via Norevia, 2026-11-09: delegate the human check to an AI judge.
Key: Claude API key (ANTHROPIC_API_KEY / ANTHROPIC_API_KEY_FILE). Tested 2026-11-09: Opus 5.5, Sonnet 5.5, Fable 5.1 and Haiku 5.5 all available. Hard cap [US$ redacted] in code, own ledger, real per-model prices.

1. **Sample first:** the 50 cards of `evidence/human-check/batch-01..05.csv`.
2. **Judge = Claude Opus 5.5:** reads the paper's full text (`library/text/`) and the Haiku card; for each of compute_matched, baseline_single_agent, efficiency_result, adaptive_activation, relevance it returns `correct` or the corrected value, plus an exact supporting quote. Unknowable → `unknown`.
3. **Quote check by code:** a verdict is valid only if its quote appears verbatim (whitespace-normalised) in the paper text; otherwise discard it and retry once.
4. **Tie-break:** where the judge disagrees with Haiku, Claude Sonnet 5.5 judges blind (sees neither prior answer). Final = majority of the three; no majority → `uncertain`.
5. **Outputs:** `evidence/judge/verdicts.jsonl`, per-field accuracy of the Haiku cards with Wilson intervals, list of the ~10 most consequential disagreements (for an optional human look), corrected values applied to the 50 cards (keep originals), README section updated. Label everything as AI-judged, not human-verified.
6. **Then, only if the sample run is clean and budget remains:** apply the same judge to the 47 compute-matched cards (LIB-001) — these matter most for the theory.
Deliverable: files above, ledger ≤ [US$ redacted] one INDICE.txt line, reply to Norevia with pointers (≤ 8 lines).
