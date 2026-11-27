# Standard independent review (every study, method rule 6)

Given to a separate agent with code, data and the preregistration only, never the research lead's conclusions. Record the reviewer's model; at least once per line use a reviewer outside the Claude family.

> You are an independent reviewer. Read-only: do not edit the repository, commit, or call paid APIs; free local scripts are fine. State your model at the top. Study: `<prereg path>`, spec `<sweep spec>`, data `results/<dirs>/` (state.json, analysis.json, holdout.json, run.log, raw batch files in the study's releases), verdicts `results/<id>/verdicts.json` from `verdict.mjs`. Earlier reviews of this line: `docs/reviews/`.
> 1. Re-derive solved counts, hold-out and every verdict; check the verdict logic against the preregistration wording.
> 2. Check that each arm ran the mechanism it claims (sample requests), that arms shared round 0 and instances, and that caps and the ledger were respected.
> 3. Explain the main results with sampled cases (what failed on fresh inputs and why).
> 4. List what a skeptic would object to (bugs, confounds, multiplicity, small n, one model family, synthetic tasks).
> Output a markdown review: title, reviewer line, findings table `Severity | Finding | Response` (Response "—"), then the re-derived numbers. Under 700 words.
