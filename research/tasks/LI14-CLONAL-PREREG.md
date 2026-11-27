# LI14 preregistration: clonal selection on top of agent-written stigmergy (2026-11-17)

**Status:** registered 2026-11-17 before any LI14 result, while LI12 (k = 80) was running; LI12's k = 40 raw counts had been seen (agent-written stigmergy solved 4 of 8 there, the harness trace 8 of 8). Runs in parallel with LI12R and LI13 (rule 9). Pilot: `results/li13-li14-pilot/`.

## Why

The adaptive immune system does not ask one cell to get it right: many variants compete and the environment selects (clonal selection, `docs/NATURE-MECHANISMS.md` row 10). Here the field already exists (the strict check); LI14 asks whether letting it select among several attempts closes the gap between agent-written traces and the oracle.

## Design

Fresh seeds 14400 to 14407 (40 modules) and 14800 to 14807 (80). Arms: `stig` (LI12: the caller writes a persistent trace, the helper owner acts), `clonal` (the same, but a helper owner acting on a failing directed check produces 3 independent variants of its module; the strict check keeps the variant that leaves the fewest failing checks on that module), and `manager`. Strict live check, 8 act rounds. Configs `li14-k40.json` (cap [US$ redacted]), `li14-k80.json` (cap [US$ redacted]). Verdicts: `observatory/batch2/rc/analyze-li14.mjs`.

## Hypotheses (16 cases pooled)

- **H-LI44 (primary).** `clonal` solves at least 3 more cases than `stig` and ends lower in more cases (sign test p < 0.05). Refuted if it solves no more.
- **H-LI45 (secondary).** `clonal` ends lower than `manager` in more cases (sign test p < 0.05).
- **H-LI46 (secondary).** `clonal` uses fewer output tokens per solved case than `manager`.


## Amendment before any LI14 data (2026-11-17)

Both `stig` and `clonal` use the corrected trace parser (see the amendment in `tasks/LI12R-REPLICATION-PREREG.md`). The motivation figure above (agent-written stigmergy 4 of 8 in LI12) was measured with most traces dropped by that bug.