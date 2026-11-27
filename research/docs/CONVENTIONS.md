# Unfold — content and method conventions (English, v3 · 2026-11-17)

Unfold is the research laboratory; Fold is its swarm harness (`docs/BRAND.md`). Earlier names (Norevia, Void, Murmur) are historical: keep them in dated records, never in new material. Historical note from v2: Norevia was a **research project by Cold Code Labs**; never write "Norevia Labs" or "NOREVIA LABS". Preferred forms: "Norevia", "Norevia — a Cold Code Labs research project". **Pivot under review (2026-11-09):** proposed title **"Social Immunity for Agentic Systems"**, subtitle **"Collective Defence for Agent Systems"**. First experimental object: information integrity in LLM-based agent systems, evaluated defensively in owned or isolated environments. Social immunity supplies hypotheses, not proof of software efficacy. Compare proposed mechanisms with strong baselines (provenance, least privilege, independent verification, quarantine and rate limits) at matched cost. Do not test against third-party systems. Preserve historical results and label their original domains accurately; coding results are not cyber-defence evidence.

All research content, code comments, user-facing strings and filenames are in **English**. Translations may come later; English is canonical.

## Translation rules
- Translate faithfully. Do not add, drop or "improve" claims, numbers, confidence intervals, caveats or evidence levels. Keep every source, DOI, arXiv id/version, commit SHA and `file:line` anchor byte-identical.
- Quotations from Portuguese sources stay in the original with an English translation in brackets.
- Keep the epistemic hedging exactly as strong as in the original.
- Proper names stay as they are. Biblical/religious references keep standard English names.
- Preregistration records (`results/sims/PREREGISTRATION.jsonl`) are historical: keep entries byte-identical (they contain the original Portuguese text and old ids).

## Frontmatter schema
```
---
id: nat-response-threshold
title: Response thresholds in social insects
area: nature | literature | oss | theory | hypothesis | simulation | observatory
evidence: natural-phenomenon | author-reported | observed-implementation | hypothesis | local-validation | gap
status: open | registered | testing | preliminary-support | preliminary-refuted | inconclusive   # hypotheses only (enforced by library-site/build.mjs --strict)
registered: supported | refuted | inconclusive | supported-degenerate | pending   # LI line: the preregistered rule's verdict
posthoc: ...             # any later reading (another check, a review), never in place of the registered verdict
note: ...                # e.g. "refuted in one study", "partial support"
tags: [division-of-labor, elastic-swarm]
sources: [...]
related: [H-03, sim-response-threshold]
updated: 2026-11-07
verification: ...        # was `verificacao`
summary: One sentence for the site.
---
```
Body sections (when present): Mechanism · Evidence · Engineering analogue · Testable hypothesis · Limits / gaps.

### Evidence level mapping
| old (pt) | new (en) | label on site |
|---|---|---|
| fenomeno-natural | natural-phenomenon | Natural phenomenon |
| relato-autores | author-reported | Author-reported |
| implementacao-observada | observed-implementation | Observed implementation |
| hipotese | hypothesis | Hypothesis |
| validacao-local | local-validation | Local validation |
| lacuna | gap | Gap |

Note: purely analytical results computed here (e.g. a closed-form Condorcet calculation) use `local-validation` only if a script in the repo produced them; the card body must say "analytical, not empirical".

### Hypothesis status mapping
aberta → open · em-teste → testing · suportada-preliminar → preliminary-support · refutada-preliminar → preliminary-refuted · inconclusivo → inconclusive.

## Id and file renames (apply everywhere: `id`, `related`, links, paths in text, code)
| old id | new id | old file | new file |
|---|---|---|---|
| lit-bibliografia | lit-bibliography | research/literature/BIBLIOGRAFIA.md | research/literature/BIBLIOGRAPHY.md |
| lit-sintese | lit-synthesis | research/literature/SINTESE.md | research/literature/SYNTHESIS.md |
| oss-matriz | oss-matrix | research/oss/MATRIZ.md | research/oss/MATRIX.md |
| oss-padroes | oss-patterns | research/oss/PADROES.md | research/oss/PATTERNS.md |
| nat-mapa | nat-map | research/nature/MAPA.md | research/nature/MAP.md |
| nat-candidatas | nat-candidates | research/nature/CANDIDATAS.md | research/nature/CANDIDATES.md |
| th-modelo | th-model | research/theory/MODELO.md | research/theory/MODEL.md |
| sim-relatorio | sim-report | results/sims/RELATORIO.md | results/sims/REPORT.md |
| sim-voto-correlacionado | sim-correlated-vote | sims/sim-voto-correlacionado.mjs, results/sims/sim-voto-correlacionado.{md,json} | sim-correlated-vote.* |
| sim-verificador | sim-verifier | sim-verificador.* | sim-verifier.* |
| sim-limiar-resposta | sim-response-threshold | sim-limiar-resposta.* | sim-response-threshold.* |
| sim-estigmergia | sim-stigmergy | sim-estigmergia.* | sim-stigmergy.* |
| sim-elastico | sim-elastic | sim-elastico.* | sim-elastic.* |
| sim-quorum | sim-quorum | (unchanged) | |
| sim-clonal | sim-clonal | (unchanged) | |
| H-xx | H-xx (ids unchanged) | hypotheses/H-01-correlacao-limita-voto.md … | English slug, e.g. H-01-correlation-caps-voting.md |
| — | — | results/sims/PREREGISTRO.jsonl | results/sims/PREREGISTRATION.jsonl (content unchanged) |
| — | — | research/theory/SAIDA-model.txt, SAIDA-testes.txt | MODEL-OUTPUT.txt, TEST-OUTPUT.txt |
| — | — | research/nature/calc/teoria-coletiva.js, saida-teoria-coletiva.txt | collective-theory.js, collective-theory-output.txt |

Other `lit-*`, `oss-*`, `nat-*` ids are already English and stay. Any Portuguese tag becomes an English kebab-case tag.

Renames are done with plain `mv` (the coordinator commits; agents do not run git).


## Method rules for paid studies (v3, 2026-11-17, after the internal audit)

1. **One check.** Feedback during a run, the stopping rule and the scoring use the same check (`strictFeedback` in the LI runner). A study that scores by a check the agents never saw reports both readings and labels the verdict accordingly.
2. **Registered verdict first.** A hypothesis page's `status` is derived from the registered verdict (`results/li-verdicts.json`, checked by `node scripts/verdicts.mjs` in CI). A post hoc reading goes in `posthoc`, never in `status`.
3. **One primary hypothesis per study.** Name it in the preregistration; the rest are secondary. Report a Holm correction across the secondary hypotheses of a study.
4. **The case is the unit.** The primary test is per case (codebase); edge-level tests are secondary because edges within a case are not independent.
5. **Replication gate.** No status beyond `preliminary-*` without a rerun on fresh seeds; an arm designed after seeing data is exploratory until rerun. A claim of transfer across models needs a second model family, not two Claude models.
6. **Review every study** with an independent agent given code and data only, before the report; record the reviewer's model. At least once per line, a reviewer outside the Claude family.
7. **Ledger only through its script**, cap raises included, with the owner's approval referenced.
8. **Raw data out of git, in R2** (owner, 2026-11-19). Raw batch files (`wave-*.jsonl`), `state.json` and any results file of 2 MB or more go compressed to the Cloudflare R2 bucket `unfold-research-raw`, content-addressed by sha256 (`scripts/raw.sh put <results/study> --prune`); the repository keeps `results/<study>/RAW-MANIFEST.json` (path, bytes, sha256) and every derived file (analysis, strict, holdout, verdicts, report). `scripts/raw.sh get <results/study>|--all` restores and checks them; `verify` compares the manifests with the bucket. The 32 GitHub releases `data-<study>` (LI12 to LI35, `RAW-SHA256SUMS`) were moved to R2 on 2026-11-21: their files are in each study's manifest and each original asset is kept byte for byte under `archives` (`scripts/raw.sh get-archive`); nothing in the repository reads releases any more. History was not rewritten: earlier commits still contain the old blobs.
9. **Parallel by default** (owner, 2026-11-17). Studies, sizes and replications that do not depend on each other's results run at the same time; the shared ledger is locked across processes and every study keeps its own cap. Only the rounds within a study are sequential (each round repairs the previous one). A study whose design depends on another's result says so in its preregistration and waits.
10. **Amendments and deviations** (Research Leader, 2026-11-23, from LI42). An *amendment* is any change to a registered prereg or spec after it is on `main`. It is a numbered, dated section at the end of the prereg (`## Amendment N`, never an in-place edit), merged before the data it could affect, and states: when (before which wave or episode), what data had been seen (none, or progress counts only), the change, the reason, what stays the same, and what the report must say. A clarification that only reads the registered text literally may be registered as `## Clarification`, with the same fields. A *deviation* is something that happened that the prereg did not foresee (a lost worktree, rebuilt images, a redone baseline): it is recorded in the run's `deviations.jsonl` and in the report. Approval: the Research Leader for transport, route, runner and accounting changes that touch no hypothesis, arm, seed, threshold or cap; the owner (through the Leader) for any cap, reallocation between caps, hypothesis, arm or threshold change. Urgency is not an approval category.
11. **Caps** (2026-11-23). A study's total is the sum of its stage caps (pilot, study, review), each enforced on its own by the runner, which reserves ahead. Incident spend (discarded waves, cut calls, retries) counts against the cap of the stage where it happened and is named in the report; when billing is unknown it is charged at full reservation. Projections used by stop rules use the cost of a normal case; incident entries are excluded only if named in a registered amendment or clarification. A cap stop leaves the run incomplete, with no verdicts and no cases removed. Moving money between stage caps within an approved total needs the owner.
12. **Run identity** (2026-11-23). Every run records the commit it executed, any difference from that commit, the transport and route, and the reportNote version used; the report names one commit per phase. Changing executed code mid-run is an amendment or a deviation, never a silent copy.
