# Contributing to BioSwarm

Thank you for looking. BioSwarm is open research: a contribution can be code, but it can also be a replication, a
critique of a result, or a mechanism from nature we have not considered.

By participating you agree to the [Code of Conduct](https://github.com/unfold-research/.github/blob/main/CODE_OF_CONDUCT.md).

## Ways to contribute

| You want to | Do this |
|---|---|
| Question a result | Open an issue with **Research question**. Quote the belief or hypothesis, say what evidence would change it (each row of [FINDINGS](research/FINDINGS.md) lists one), and link your data. |
| Replicate a study | Start from its preregistration in [`research/tasks/`](research/tasks). Keep the arms, seeds and stopping rules, or say what you changed and why. Share the report in an issue; another model family is the most useful replication. |
| Propose a mechanism from nature | Open an issue with **Natural mechanism**. Give the phenomenon, a source, the engineering analogue and its evidence level (see [research/README.md](research/README.md#evidence-discipline)). |
| Fix a bug or improve the SDK, protocol or harness | Open a pull request here. Plugin changes go to [bioswarm-plugin](https://github.com/unfold-research/bioswarm-plugin). |
| Report a vulnerability | Do **not** open an issue. Follow [SECURITY](https://github.com/unfold-research/.github/blob/main/SECURITY.md). |

## Research rules we keep

- **Claims follow evidence.** Do not upgrade the wording of a result: keep its confidence, caveats and "not yet shown"
  parts. A simulation is support inside a model, never a claim about LLMs.
- **Preregister before paid runs.** New studies need a preregistration (hypotheses, arms, seeds, stopping rules,
  analysis) merged before the first model call.
- **Matched baselines.** Compare against a strong conventional baseline (a manager agent, a group chat, a single agent)
  at matched cost.
- **Failures are results.** Refuted and inconclusive outcomes are reported as carefully as supported ones.
- **No secrets, no spending figures, no personal data** in issues, pull requests or committed files.

## Before you commit: leak check

This repository is public and the lab behind it is not. Every commit passes a leak check, locally and in CI:

- `npm install` turns on the pre-commit hook (`.githooks/pre-commit`; by hand: `git config core.hooksPath .githooks`).
  It runs `scripts/leak-check.mjs` on staged files and, when installed, `gitleaks` on the staged diff.
- It blocks secrets and tokens, private keys, personal e-mail addresses, home-directory paths, agent identifiers,
  dollar amounts, public IP addresses and a list of private terms kept as salted hashes in `.leakcheck/terms`.
- Commits must use your GitHub noreply e-mail (`<id>+<login>@users.noreply.github.com`).
- The `leak-check` workflow repeats all of this on every pull request, over the whole tree and history; it is a
  required check on `main`, which only changes through pull requests.
- A false positive is allowed only after review, as one line in `.leakcheck/allow` (the checker prints it), with a
  comment saying why.

## Development

```sh
git clone --recurse-submodules https://github.com/unfold-research/bioswarm
cd bioswarm && npm ci
npm test && node --test bench/*.test.mjs
(cd research && node sims/run-all.mjs && node scripts/verdicts.mjs && node scripts/hypotheses-index.mjs --check)
```

- Node.js 22 or later. No API key is needed for the tests.
- Keep pull requests focused; describe what changed and how you checked it.
- New hypotheses use the card format in [research/docs/CONVENTIONS.md](research/docs/CONVENTIONS.md); regenerate the
  index with `node research/scripts/hypotheses-index.mjs`.
- By contributing you agree that code is licensed under Apache-2.0 and research content under CC BY 4.0.

## Where decisions are made

Unfold maintains BioSwarm. What enters [FINDINGS](research/FINDINGS.md) is decided by the lab after review; issues and
pull requests are where you can influence it, in public.
