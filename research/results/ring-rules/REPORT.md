# R4 a rule that hedges: no rule tried stays above the fixed schedule in both the local and the scattered case

Free: no model call. `node observatory/batch2/ring/simulate-rules.mjs 2000` → `summary.json` here. Run 2026-11-11.

## Why this was run without models

In R2b and R3 the readers counted exactly in 0.99 of calls, and the regimes whose choices are made by code (sweep, alarm, verify) landed on exactly the accuracy that the same seeded schedules give with exact readers, collection for collection in aggregate (0.48 and 0.70; 0.47 and 0.28; 0.38, 0.17 and 0.38). For rule regimes the model adds cost and no information. They are therefore evaluated here by simulation with exact readers, on 2,000 collections per scenario instead of 60. The engine is `observatory/batch2/ring/engine.mjs`; a test checks that it reproduces the R2b collections and the R3 figures.

## Result

Share of collections right in the edited condition, with 95% intervals. Every regime is right on every collection when nothing changes.

| Regime | local edit | scattered edit | local edit and a false count |
|---|---|---|---|
| sweep (fixed schedule) | 0.52 (0.50 to 0.54) | 0.50 (0.48 to 0.53) | 0.42 (0.40 to 0.44) |
| alarm (follow alarms to neighbours) | 0.67 (0.65 to 0.69) | 0.31 (0.29 to 0.33) | 0.21 (0.19 to 0.22) |
| hedge (one worker follows alarms, one explores) | 0.60 (0.58 to 0.63) | 0.39 (0.36 to 0.41) | 0.17 (0.16 to 0.19) |
| adapt (follow alarms until the board contradicts locality) | 0.65 (0.63 to 0.67) | 0.33 (0.31 to 0.35) | 0.18 (0.17 to 0.20) |
| probe (planned search, added after RD: neighbours of alarms first, otherwise probes three apart) | 1.00 (0.998 to 1.00) | 0.29 (0.27 to 0.31) | 0.39 (0.37 to 0.42) |

## Reading

- With 2,000 collections the R2b advantage of the alarm rule under local change is 0.15 (0.67 against 0.52), smaller than the 0.22 seen on 60, and its cost under scattered change is 0.19.
- Hedging buys nothing: it gives up 0.07 where change is local and still loses 0.12 to the schedule where it is scattered. The adaptive rule has too few rounds to learn in: by the time two neighbours have come back unchanged, the budget is spent.
- So with six re-counts there is no rule of this family that is safe in both worlds. The choice between a schedule and a trace-following rule has to be made before the work starts, from what is known about how the field changes. That is the "trigger" question of `programs/historical/trigger.md` in its simplest form.
- These figures also correct the scale of earlier claims: results on 60 collections carry intervals of about ±0.15, and the point estimates moved by up to 0.07 at 2,000.

## Added after the orchestrator studies

The `probe` row was added after `results/ring-routers/REPORT.md`: the Sonnet orchestrator, given the locality prior, planned a search that was right on 59 of 60 collections, and the same plan written in code is right on every simulated collection under local change. The alarm rule of R2 and R2b was therefore not the best rule for that world, only the first one tried. The conclusion above stands and is sharper: the planned search is the best policy under local change and among the worst under scattered change.

## Limits

Exact readers. That is justified for this task and reader, and would not be for a task where counts are noisy (R1, with 48 records per part, had 0.84 exact). Three hand-written rules; six re-counts; one size of edit. A longer horizon would give an adaptive rule room that it does not have here.
