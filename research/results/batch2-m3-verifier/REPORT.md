# M3 verifier sensitivity and specificity (H-M03, H-02)

Preregistration `tasks/M3-VERIFIER-PREREG.md`. Run 2026-11-11 on `claude-haiku-5-5`, batch API, 192 requests, all succeeded and valid. Usage estimate [US$ redacted] The Sonnet 5.5 replication is in `results/batch2-r1-sonnet/REPORT.md`.

## Result

| Arm | Sensitivity (corrupted reports flagged) | Specificity (faithful reports passed) |
|---|---|---|
| Grounded: sees records and report | 48 / 48 (95% interval 0.93–1) | 48 / 48 (0.93–1) |
| Blind: sees the report only | 11 / 48 (0.13–0.37) | 45 / 48 (0.83–0.98) |

Detection by error type, grounded and blind: wrong citation 12 and 1 of 12; flipped value 12 and 1; dropped finding 12 and 5; invented conflict 12 and 4. The grounded verifier named the right indicator in all 48 corrupted reports.

**P1 supported** (grounded specificity and sensitivity both 1.00, thresholds 0.95 and 0.90). **P2 supported** (grounded sensitivity exceeds blind by 0.77, threshold 0.40).

## Reading

- With the sources in hand, a small model is a reliable verifier of provenance on this instrument: no miss and no false alarm in 96 reports. Sonnet 5.5 gave the same 48 of 48 and 48 of 48.
- Without the sources the verifier is close to useless and not harmless: Haiku flagged 3 faithful reports and caught under a quarter of the corrupted ones, mostly those whose shape looked odd (a missing finding, a conflict). Sonnet blind flagged nothing wrong and caught 1 of 48.
- For Murmur this sets a design rule that can be tested at product scale: a check only counts if the checker reads the cited source. A reviewer that reads only the report adds cost and, on Haiku, some false alarms.

## What this does not show

H-M03 claims that verification raises precision more than adding searchers. This run measures the verifier alone; the comparison with more searchers has not run. The reports are small and structured with four simple error types; real reports are prose with partial support, where specificity is the harder number.

## Limits

48 cases, one prompt per arm, opaque ids, errors planted one at a time. Costs are list-price estimates from returned tokens.
