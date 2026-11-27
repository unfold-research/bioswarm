# M3 preregistration: verifier sensitivity and specificity (H-M03, H-02)

Registered 2026-11-11, before any paid call and before the results of B1 and B2 were read. Code: `observatory/batch2/m3-verifier/protocol.mjs`. Frozen config hash in `results/batch2-m3-verifier/frozen-lock.json`.

## Question
How well does a verifier agent catch provenance errors in a research report, with and without access to the sources? The theory says verifier specificity and sensitivity dominate swarm quality; this measures them on our instrument.

## Design
- 48 cases (seeds 9001–9048): six evidence records about three indicators from two sources, opaque ids. Each case has a faithful report and a corrupted twin with one planted error: wrong citation, flipped value, dropped finding or invented conflict (12 each). A deterministic checker confirms every twin is unfaithful.
- GROUNDED sees records and report. BLIND sees the report only. 192 calls, one wave.
- Model `claude-haiku-5-5`, batch API, thinking disabled, JSON schema output.

## Endpoints
Per arm: sensitivity (corrupted reports flagged), specificity (faithful reports passed), with Wilson 95% intervals; detection per error type; whether the flagged issue names the right indicator.

## Predictions
- **P1**: GROUNDED specificity at least 0.95 and sensitivity at least 0.90.
- **P2**: GROUNDED sensitivity exceeds BLIND sensitivity by at least 0.40.

## Stopping
Any wave with more than 10% invalid outputs stops the study. Any missing, duplicated, failed or unpriced provider result stops it with the reservation kept. No request is ever resubmitted.

## Budget
Study cap [US$ redacted] reserved wave by wave in the shared cumulative ledger (cap [US$ redacted]). Approved by the owner on 2026-11-11 (request to launch as many independent batches as possible).

## Limits stated in advance
Small structured reports and four simple error types; real reports are prose with partial support. BLIND is a control, not a realistic design. One model, one prompt.
