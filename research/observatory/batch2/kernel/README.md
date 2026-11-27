# Kernel: free tools for swarm studies

First steps proposed in `research/architecture/README.md`. No model call in any of them.

| File | What it does | State |
|---|---|---|
| `leak-probe.mjs`, `probe-regimes.mjs` | checks that the target of a perturbation cannot be read off the view an agent is shown, by ranking each feature | flags R2 (180 of 180 picks, chance 45) and finds nothing in R2b. Finds single-feature leaks only |
| `fieldlog.mjs`, `export-regimes.mjs` | one append-only event format (deposit, edit, assign, answer) and a fold that recomputes a run's outcome from it | reproduces the 13 accuracy tables of R1, R2 and R2b from the log alone |
| `check-controls.mjs` | a study must name a deep-agent control and a fixed-schedule control at a comparable reserve, or state why it is exempt | a check before freezing; it does not generate the control arms |
| `kernel.test.mjs` | tests of the three, including the two acceptance tests above | `node --test observatory/batch2/kernel/kernel.test.mjs` |

Not done: the read log as a separate artefact (the runner already stores every request of every wave, which is the full record of what each agent was shown; views are not yet named and hashed), and generation of control arms.

Rule from now on: a study with a perturbation runs the leak probe on its generator before it is frozen, and the preregistration reports the result.
