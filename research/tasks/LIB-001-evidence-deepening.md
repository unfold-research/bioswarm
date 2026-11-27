# LIB-001 — Evidence deepening (cap [US$ redacted] Haiku 5.5)
Owner: Norevia Library. See OVERNIGHT-2026-11-09.md.
1. Full-text cards for the next ~800 highest-priority working-set records (same schema and code as library/cards/extract-cards.mjs, via the Anthropic API with the key from the environment).
2. For every card with basis=fulltext and compute_matched=yes, extract structured quantitative claims: setup, model(s), baselines, budget unit, accuracy and cost numbers, with the sentence/table they come from (quote), so Norevia can compare against our LAB results.
3. Rebuild evidence/ (evidence.csv, summary.json, README reliability section) and produce `evidence/compute-matched.md`: a table of all compute-matched comparisons and which way they point (multi-agent better / worse / mixed at equal compute).
4. Prepare (do not send) the human-check sample: 50 cards (35 random seeded + 15 compute-matched) as `evidence/human-check/batch-01..05.csv`.
Deliverable: files above, ledger ≤ 20, all machine extractions labelled unverified.
