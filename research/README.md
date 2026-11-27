# Unfold Research: the lab

What collective mechanisms from nature can do for teams of AI agents, tested against the coordination people ship.
Biological collectives inspire hypotheses; matched, preregistered experiments decide.

This folder is the lab's working record, opened on 2026-11-27 as part of [BioSwarm](../README.md). It is a curated copy
of the private research repository with a fresh history: see [what was left out](#what-was-left-out).

**Start here:** [`FINDINGS.md`](FINDINGS.md) (what we believe now, one page) ·
[`hypotheses/README.md`](hypotheses/README.md) (every hypothesis and its state) ·
[`docs/NATURE-MECHANISMS.md`](docs/NATURE-MECHANISMS.md) (the map of mechanisms) ·
[`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) (how cards and studies are written).

## Programmes

- **Coordination** ([programs/coordination.md](programs/coordination.md), since 2026-11-17): at equal N, on work that
  needs N agents, do mechanisms from natural collectives (lateral inhibition, polarity, stigmergy, quorum, recruitment,
  ...) beat a manager agent or a group chat? Studies LI1 onward.
- **Cyber** ([programs/cyber.md](programs/cyber.md)): swarm defence of a network, CybORG CAGE 4 (CY series) and a
  container range (R0).
- **Genome** ([programs/genome.md](programs/genome.md), GN series, since 2026-11-21): the traits of biological swarms
  ([catalog/genome/](catalog/genome)), free screens then preregistered studies.
- **Autonomy** ([programs/autonomy.md](programs/autonomy.md), AU series): how many agents, how much effort, how long to
  keep going.
- **Collective defence of the swarm itself** ([programs/defence.md](programs/defence.md)): paused on 2026-11-17, not
  closed; its threat model and studies D1 to D6 stand.
- **Harness** ([programs/harness.md](programs/harness.md)): what Colony must enforce in the agent loop. BioSwarm is
  where those rules ship.

No proven advantage of any swarm over a single agent or a manager agent is claimed.

> [!WARNING]
> **The field tests did not favour the trace rules.** [FINDINGS](FINDINGS.md) comes from synthetic tasks. In BioSwarm's two
> field tests on a simulated multichannel retail close, the arm with addressed traces and tie-break finished later than
> the shared field alone (4 of 6 pairs in phase 1b, 4 of 4 in phase 1b-r) and was not cheaper; quality was
> inconclusive. Internal reports, not independently reviewed: [phase 1b](../results/phase1b/REPORT.md) ·
> [phase 1b-r](../results/phase1b-r/REPORT.md). That is why the recommended policy is the shared field with the hash
> tie-break, and waiting for a trace stays experimental.

## Evidence discipline

Every card carries exactly one evidence level: **natural phenomenon** (an analogy, not proof), **author-reported**
(published, not reproduced here), **observed implementation** (code inspected at a pinned commit), **hypothesis**
(falsifiable, untested), **local validation** (produced here, with script, data and seed) or **gap**. A simulation
result is support inside a model, never a claim about LLMs. Paid runs are preregistered with seeds, stopping rules and
a spending cap, and compared with a strong conventional baseline at matched cost.

## Layout

| Folder | Contents |
|---|---|
| [`FINDINGS.md`](FINDINGS.md) | what we believe now, with confidence, evidence and what would change each belief |
| [`hypotheses/`](hypotheses) | one card per hypothesis; families H-LI (coordination), H-D (defence), H-G (genome), H-H (harness), H-01…27 (collective efficiency), H-I (instincts), H-V and H-M (retired programmes) |
| [`tasks/`](tasks) | preregistrations, frozen before each run |
| [`results/`](results) | reports, analyses, holdout checks and raw-data manifests of every study; [`results/li-verdicts.json`](results/li-verdicts.json) holds the LI verdicts |
| [`docs/reviews/`](docs/reviews) | independent reviews and reproduction checks |
| [`sims/`](sims) | deterministic agent-based simulations (10 simulations, 46 predictions) |
| [`observatory/`](observatory), [`experiments/`](experiments) | the benchmark harness on real models and stand-alone instrument experiments |
| [`research/`](research) | literature, open-source inspections, natural mechanisms, theory model |
| [`catalog/`](catalog) | features `F-xx`, swarms `S-xx` and the genome traits |
| [`papers/`](papers) | architecture of the papers planned from this work |
| [`programs/`](programs) | the research programmes |
| [`allocator/`](allocator) | the budget allocator from LAB-006 |
| [`docs/`](docs) | conventions, threat models, mechanism maps, autonomy requirements |

## Reproduce

```bash
node sims/run-all.mjs                       # all simulations, deterministic, free
node --test research/theory/model.test.mjs  # theory checks
(cd allocator && node --test)                # allocator tests
node scripts/verdicts.mjs                   # LI hypothesis pages match results/li-verdicts.json
node scripts/hypotheses-index.mjs --check   # hypotheses/README.md is current
```

Observatory and LAB runs call real models and cost money; each needs its own API key and is bound by its
preregistration. Read the preregistration and the report before rerunning or citing a study.

## What was left out

The private repository keeps material that is not research output or that cannot be published:

- **Raw model replies, transcripts and per-call logs.** The `RAW-MANIFEST.json` and `RAW-SHA256SUMS` files list them by
  digest, so a later release can be verified.
- **Budgets and spending.** Absolute dollar amounts in text are replaced by `[US$ redacted]`; cost, spend, budget and
  price fields are removed from JSON. Ratios, tokens and waves are kept.
- **Internal case studies** (`internal/`), the team's state and history (`STATE.md`), team rules (`AGENTS.md`), the
  archive of earlier workspaces (`archive/`), operations (`ops/`, bench host services), the private library site and
  run-economics notes.
- **Retired programme records** (`programs/historical/`).

Some files still mention these paths; they point to the private record. In the published files, private identifiers
were replaced in place: agent IDs, local paths, the bench server's host name, paths, service users and platform (now
"the bench server", `/srv/bench`, `svc-*`), and the owner's name in decisions (now "the owner"). Nothing else was
edited.

## License

Text, figures and data: [CC BY 4.0](LICENSE). Code: Apache-2.0, as the rest of the repository.
