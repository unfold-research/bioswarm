# BSH7 · Stigwait versus direct JSON

Six new allocation problems crossed with two capacity conditions and two independent draws per arm. 24 assignments per arm per phase. All original freight optima enumerated and all delivered commercial and warehouse inputs verified. Fixed source replies were deterministic fixtures with zero model cost. Live warehouse calls used the same prompt and source, independently sampled.

| Phase | Arm | Queries | Exact replies | Feasible | Optimal | Model turns | API USD | Mean seconds |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| fixed | manager | 12 | 12 | 24 | 24 | 52 | [redacted] | 97.3 |
| fixed | direct | 12 | 12 | 24 | 20 | 26 | [redacted] | 62.5 |
| fixed | unfold | 12 | 12 | 24 | 23 | 26 | [redacted] | 66.4 |
| live | manager | 12 | 12 | 23 | 21 | 62 | [redacted] | 123.6 |
| live | direct | 12 | 12 | 24 | 23 | 37 | [redacted] | 71.9 |
| live | unfold | 12 | 12 | 24 | 23 | 37 | [redacted] | 70.8 |

With fixed source data, stigwait reached three more optima than direct JSON, at equal billed turns and higher total cost. In live use they tied on both optima and turns. The live optimality interval extends beyond the preregistered five-point margin in both directions. Equal observed counts are insufficient to claim equivalence. The reduction in turns relative to the manager was reproduced by direct JSON in both phases.

## Paired Unfold minus direct JSON

Differences are average per assignment. Optimality is in percentage points. Wins and losses on optimality count discordant matched runs. Six-case cluster bootstrap percentile intervals are exploratory. Same data and rules; planner prompts differ in handoff representation. Single-host concurrent latency includes service variability.

| Phase | Metric | Delta | 95% bootstrap interval |
|---|---|---:|---|
| fixed | optimal | 12.5000000 | [4.1666667, 20.8333333] |
| fixed | calls | 0.0000000 | [-0.1250000, 0.1250000] |
| fixed | usd | [redacted] | [[redacted] [redacted]] |
| fixed | seconds | 3.8569167 | [-7.8945417, 19.3110417] |
| fixed | optimal wins/losses/ties | 4/1/19 | |
| live | optimal | 0.0000000 | [-12.5000000, 12.5000000] |
| live | calls | 0.0000000 | [0.0000000, 0.0000000] |
| live | usd | [redacted] | [[redacted] [redacted]] |
| live | seconds | -1.1351250 | [-4.4081667, 2.7126667] |
| live | optimal wins/losses/ties | 1/1/22 | |

Gateway-reconciled total [US$ redacted] 240 model turns and 253 HTTP attempts.

## Transport and interpretation

A turn is a model call billed or delivered; HTTP attempts are tracked separately. Fixed-source lookups are local reads. A timeout followed by a successful retry contributes both gateway charges when billed and both active durations. Operator recovery downtime is excluded. No successful candidate plan was selectively rerun.

| Recovered assignment | Billed undelivered USD | Wait seconds |
|---|---:|---:|
| s203a fixed r2 unfold | [redacted] | 145.1 |
| s203p fixed r2 manager | [redacted] | 145.2 |

The fixed phase isolates the handoff as used here: direct JSON objects versus stigwait-formatted text containing the same facts. Data were already available at planner dispatch; this design does not test decentralized wait scheduling or asynchronous trace propagation. The live phase adds independent warehouse response draws. Percentile bootstrap intervals use six problem clusters, retaining both capacity conditions and repeats.


## Run-level data

| Case | Repeat | Phase | Arm | Queried | Freight | Optimum | Turns | USD | Seconds |
|---|---:|---|---|---|---:|---:|---:|---:|---:|
| s201a | 1 | fixed | direct | True | 74 | 74 | 1 | [redacted] | 31.62 |
| s201a | 1 | fixed | manager | True | 74 | 74 | 3 | [redacted] | 111.91 |
| s201a | 1 | fixed | unfold | True | 74 | 74 | 1 | [redacted] | 30.63 |
| s201a | 2 | fixed | direct | True | 74 | 74 | 1 | [redacted] | 35.49 |
| s201a | 2 | fixed | manager | True | 74 | 74 | 2 | [redacted] | 40.85 |
| s201a | 2 | fixed | unfold | True | 74 | 74 | 1 | [redacted] | 19.34 |
| s201a | 1 | live | direct | True | 74 | 74 | 2 | [redacted] | 73.41 |
| s201a | 1 | live | manager | True | 74 | 74 | 3 | [redacted] | 160.03 |
| s201a | 1 | live | unfold | True | 74 | 74 | 2 | [redacted] | 45.63 |
| s201a | 2 | live | direct | True | 74 | 74 | 2 | [redacted] | 38.23 |
| s201a | 2 | live | manager | True | 74 | 74 | 3 | [redacted] | 81.91 |
| s201a | 2 | live | unfold | True | 74 | 74 | 2 | [redacted] | 48.40 |
| s201p | 1 | fixed | direct | False | 74 | 74 | 1 | [redacted] | 35.95 |
| s201p | 1 | fixed | manager | False | 74 | 74 | 2 | [redacted] | 81.35 |
| s201p | 1 | fixed | unfold | False | 74 | 74 | 1 | [redacted] | 36.87 |
| s201p | 2 | fixed | direct | False | 74 | 74 | 1 | [redacted] | 28.18 |
| s201p | 2 | fixed | manager | False | 74 | 74 | 2 | [redacted] | 63.32 |
| s201p | 2 | fixed | unfold | False | 74 | 74 | 1 | [redacted] | 21.32 |
| s201p | 1 | live | direct | False | 74 | 74 | 1 | [redacted] | 51.22 |
| s201p | 1 | live | manager | False | 74 | 74 | 2 | [redacted] | 67.76 |
| s201p | 1 | live | unfold | False | 74 | 74 | 1 | [redacted] | 42.45 |
| s201p | 2 | live | direct | False | 74 | 74 | 1 | [redacted] | 17.99 |
| s201p | 2 | live | manager | False | 74 | 74 | 2 | [redacted] | 53.47 |
| s201p | 2 | live | unfold | False | 74 | 74 | 1 | [redacted] | 25.46 |
| s202a | 1 | fixed | direct | True | 91 | 91 | 1 | [redacted] | 56.81 |
| s202a | 1 | fixed | manager | True | 91 | 91 | 2 | [redacted] | 69.21 |
| s202a | 1 | fixed | unfold | True | 91 | 91 | 1 | [redacted] | 49.50 |
| s202a | 2 | fixed | direct | True | 91 | 91 | 1 | [redacted] | 48.12 |
| s202a | 2 | fixed | manager | True | 91 | 91 | 2 | [redacted] | 72.04 |
| s202a | 2 | fixed | unfold | True | 91 | 91 | 1 | [redacted] | 88.83 |
| s202a | 1 | live | direct | True | 91 | 91 | 2 | [redacted] | 108.18 |
| s202a | 1 | live | manager | True | 91 | 91 | 3 | [redacted] | 146.17 |
| s202a | 1 | live | unfold | True | 91 | 91 | 2 | [redacted] | 113.30 |
| s202a | 2 | live | direct | True | 91 | 91 | 2 | [redacted] | 67.25 |
| s202a | 2 | live | manager | True | 91 | 91 | 3 | [redacted] | 73.99 |
| s202a | 2 | live | unfold | True | 91 | 91 | 2 | [redacted] | 84.43 |
| s202p | 1 | fixed | direct | False | 94 | 91 | 1 | [redacted] | 105.54 |
| s202p | 1 | fixed | manager | False | 91 | 91 | 2 | [redacted] | 99.25 |
| s202p | 1 | fixed | unfold | False | 91 | 91 | 1 | [redacted] | 95.23 |
| s202p | 2 | fixed | direct | False | 91 | 91 | 1 | [redacted] | 43.81 |
| s202p | 2 | fixed | manager | False | 91 | 91 | 2 | [redacted] | 110.46 |
| s202p | 2 | fixed | unfold | False | 91 | 91 | 1 | [redacted] | 65.18 |
| s202p | 1 | live | direct | False | 91 | 91 | 1 | [redacted] | 61.03 |
| s202p | 1 | live | manager | False | 91 | 91 | 2 | [redacted] | 202.61 |
| s202p | 1 | live | unfold | False | 91 | 91 | 1 | [redacted] | 68.07 |
| s202p | 2 | live | direct | False | 91 | 91 | 1 | [redacted] | 117.00 |
| s202p | 2 | live | manager | False | 91 | 91 | 2 | [redacted] | 125.73 |
| s202p | 2 | live | unfold | False | 91 | 91 | 1 | [redacted] | 61.03 |
| s203a | 1 | fixed | direct | True | 111 | 111 | 1 | [redacted] | 83.56 |
| s203a | 1 | fixed | manager | True | 111 | 111 | 2 | [redacted] | 111.34 |
| s203a | 1 | fixed | unfold | True | 118 | 111 | 1 | [redacted] | 92.52 |
| s203a | 2 | fixed | direct | True | 118 | 111 | 1 | [redacted] | 80.34 |
| s203a | 2 | fixed | manager | True | 111 | 111 | 3 | [redacted] | 136.32 |
| s203a | 2 | fixed | unfold | True | 111 | 111 | 2 | [redacted] | 232.34 |
| s203a | 1 | live | direct | True | 111 | 111 | 2 | [redacted] | 106.81 |
| s203a | 1 | live | manager | True | 111 | 111 | 4 | [redacted] | 148.03 |
| s203a | 1 | live | unfold | True | 111 | 111 | 2 | [redacted] | 137.39 |
| s203a | 2 | live | direct | True | 111 | 111 | 2 | [redacted] | 84.02 |
| s203a | 2 | live | manager | True | 111 | 111 | 3 | [redacted] | 156.04 |
| s203a | 2 | live | unfold | True | 111 | 111 | 2 | [redacted] | 68.56 |
| s203p | 1 | fixed | direct | False | 111 | 111 | 1 | [redacted] | 125.39 |
| s203p | 1 | fixed | manager | False | 111 | 111 | 2 | [redacted] | 128.00 |
| s203p | 1 | fixed | unfold | False | 111 | 111 | 1 | [redacted] | 137.08 |
| s203p | 2 | fixed | direct | False | 111 | 111 | 1 | [redacted] | 103.61 |
| s203p | 2 | fixed | manager | False | 111 | 111 | 3 | [redacted] | 280.52 |
| s203p | 2 | fixed | unfold | False | 111 | 111 | 1 | [redacted] | 86.00 |
| s203p | 1 | live | direct | False | 111 | 111 | 1 | [redacted] | 126.67 |
| s203p | 1 | live | manager | False | 111 | 111 | 2 | [redacted] | 209.34 |
| s203p | 1 | live | unfold | False | 111 | 111 | 1 | [redacted] | 126.31 |
| s203p | 2 | live | direct | False | 128 | 111 | 1 | [redacted] | 111.69 |
| s203p | 2 | live | manager | False | 111 | 111 | 2 | [redacted] | 131.04 |
| s203p | 2 | live | unfold | False | 111 | 111 | 1 | [redacted] | 127.00 |
| s204a | 1 | fixed | direct | True | 85 | 85 | 1 | [redacted] | 21.58 |
| s204a | 1 | fixed | manager | True | 85 | 85 | 2 | [redacted] | 63.99 |
| s204a | 1 | fixed | unfold | True | 85 | 85 | 1 | [redacted] | 31.85 |
| s204a | 2 | fixed | direct | True | 90 | 85 | 2 | [redacted] | 85.99 |
| s204a | 2 | fixed | manager | True | 85 | 85 | 2 | [redacted] | 74.12 |
| s204a | 2 | fixed | unfold | True | 85 | 85 | 1 | [redacted] | 49.89 |
| s204a | 1 | live | direct | True | 85 | 85 | 2 | [redacted] | 53.07 |
| s204a | 1 | live | manager | True | 85 | 85 | 3 | [redacted] | 82.28 |
| s204a | 1 | live | unfold | True | 85 | 85 | 2 | [redacted] | 38.19 |
| s204a | 2 | live | direct | True | 85 | 85 | 2 | [redacted] | 42.03 |
| s204a | 2 | live | manager | True | 85 | 85 | 3 | [redacted] | 58.98 |
| s204a | 2 | live | unfold | True | 85 | 85 | 2 | [redacted] | 45.94 |
| s204p | 1 | fixed | direct | False | 85 | 85 | 1 | [redacted] | 44.84 |
| s204p | 1 | fixed | manager | False | 85 | 85 | 2 | [redacted] | 88.09 |
| s204p | 1 | fixed | unfold | False | 85 | 85 | 1 | [redacted] | 75.38 |
| s204p | 2 | fixed | direct | False | 85 | 85 | 1 | [redacted] | 44.33 |
| s204p | 2 | fixed | manager | False | 85 | 85 | 2 | [redacted] | 55.43 |
| s204p | 2 | fixed | unfold | False | 85 | 85 | 1 | [redacted] | 32.86 |
| s204p | 1 | live | direct | False | 85 | 85 | 1 | [redacted] | 42.19 |
| s204p | 1 | live | manager | False | 85 | 85 | 2 | [redacted] | 108.44 |
| s204p | 1 | live | unfold | False | 85 | 85 | 1 | [redacted] | 36.82 |
| s204p | 2 | live | direct | False | 85 | 85 | 1 | [redacted] | 21.33 |
| s204p | 2 | live | manager | False | 85 | 85 | 2 | [redacted] | 57.83 |
| s204p | 2 | live | unfold | False | 85 | 85 | 1 | [redacted] | 26.88 |
| s205a | 1 | fixed | direct | True | 91 | 91 | 1 | [redacted] | 55.70 |
| s205a | 1 | fixed | manager | True | 91 | 91 | 2 | [redacted] | 102.86 |
| s205a | 1 | fixed | unfold | True | 91 | 91 | 1 | [redacted] | 35.60 |
| s205a | 2 | fixed | direct | True | 91 | 91 | 1 | [redacted] | 52.94 |
| s205a | 2 | fixed | manager | True | 91 | 91 | 2 | [redacted] | 81.66 |
| s205a | 2 | fixed | unfold | True | 91 | 91 | 1 | [redacted] | 45.20 |
| s205a | 1 | live | direct | True | 91 | 91 | 2 | [redacted] | 57.52 |
| s205a | 1 | live | manager | True | 93 | 91 | 3 | [redacted] | 130.60 |
| s205a | 1 | live | unfold | True | 91 | 91 | 2 | [redacted] | 91.60 |
| s205a | 2 | live | direct | True | 91 | 91 | 2 | [redacted] | 59.29 |
| s205a | 2 | live | manager | True | 91 | 91 | 3 | [redacted] | 118.70 |
| s205a | 2 | live | unfold | True | 91 | 91 | 2 | [redacted] | 73.08 |
| s205p | 1 | fixed | direct | False | 91 | 91 | 1 | [redacted] | 43.35 |
| s205p | 1 | fixed | manager | False | 91 | 91 | 2 | [redacted] | 92.83 |
| s205p | 1 | fixed | unfold | False | 91 | 91 | 1 | [redacted] | 73.48 |
| s205p | 2 | fixed | direct | False | 93 | 91 | 1 | [redacted] | 67.01 |
| s205p | 2 | fixed | manager | False | 91 | 91 | 2 | [redacted] | 87.00 |
| s205p | 2 | fixed | unfold | False | 91 | 91 | 1 | [redacted] | 47.04 |
| s205p | 1 | live | direct | False | 91 | 91 | 1 | [redacted] | 93.61 |
| s205p | 1 | live | manager | False | 91 | 91 | 2 | [redacted] | 174.13 |
| s205p | 1 | live | unfold | False | 91 | 91 | 1 | [redacted] | 62.98 |
| s205p | 2 | live | direct | False | 91 | 91 | 1 | [redacted] | 48.81 |
| s205p | 2 | live | manager | False | 91 | 91 | 2 | [redacted] | 128.65 |
| s205p | 2 | live | unfold | False | 91 | 91 | 1 | [redacted] | 27.99 |
| s206a | 1 | fixed | direct | True | 103 | 103 | 1 | [redacted] | 119.12 |
| s206a | 1 | fixed | manager | True | 103 | 103 | 3 | [redacted] | 144.65 |
| s206a | 1 | fixed | unfold | True | 103 | 103 | 1 | [redacted] | 43.01 |
| s206a | 2 | fixed | direct | True | 103 | 103 | 2 | [redacted] | 73.38 |
| s206a | 2 | fixed | manager | True | 103 | 103 | 2 | [redacted] | 75.15 |
| s206a | 2 | fixed | unfold | True | 103 | 103 | 1 | [redacted] | 71.59 |
| s206a | 1 | live | direct | True | 103 | 103 | 2 | [redacted] | 126.81 |
| s206a | 1 | live | manager | True | 109 | 103 | 3 | [redacted] | 149.29 |
| s206a | 1 | live | unfold | True | 109 | 103 | 3 | [redacted] | 141.95 |
| s206a | 2 | live | direct | True | 103 | 103 | 2 | [redacted] | 76.18 |
| s206a | 2 | live | manager | True | None | 103 | 4 | [redacted] | 120.52 |
| s206a | 2 | live | unfold | True | 103 | 103 | 2 | [redacted] | 98.84 |
| s206p | 1 | fixed | direct | False | 103 | 103 | 1 | [redacted] | 37.67 |
| s206p | 1 | fixed | manager | False | 103 | 103 | 2 | [redacted] | 72.50 |
| s206p | 1 | fixed | unfold | False | 103 | 103 | 1 | [redacted] | 47.76 |
| s206p | 2 | fixed | direct | False | 103 | 103 | 1 | [redacted] | 75.93 |
| s206p | 2 | fixed | manager | False | 103 | 103 | 2 | [redacted] | 91.49 |
| s206p | 2 | fixed | unfold | False | 103 | 103 | 2 | [redacted] | 84.31 |
| s206p | 1 | live | direct | False | 103 | 103 | 2 | [redacted] | 81.38 |
| s206p | 1 | live | manager | False | 103 | 103 | 2 | [redacted] | 120.93 |
| s206p | 1 | live | unfold | False | 103 | 103 | 1 | [redacted] | 58.25 |
| s206p | 2 | live | direct | False | 103 | 103 | 1 | [redacted] | 59.90 |
| s206p | 2 | live | manager | False | 103 | 103 | 2 | [redacted] | 160.06 |
| s206p | 2 | live | unfold | False | 103 | 103 | 1 | [redacted] | 47.77 |
