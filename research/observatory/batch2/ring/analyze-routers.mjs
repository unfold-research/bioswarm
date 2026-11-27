// Preregistered analysis of the orchestrator studies (RD): model (Haiku, Sonnet) by locality prior (given, not given),
// per scenario, paired by collection with the fixed schedule and the alarm rule already run on the same collections.
// Usage: node observatory/batch2/ring/analyze-routers.mjs   -> results/ring-routers/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), sum = (s) => JSON.parse(fs.readFileSync(path.join(ROOT, `results/batch2-${s}/summary.json`), 'utf8')), usd = (s) => fs.readFileSync(path.join(ROOT, `results/batch2-${s}/ledger.jsonl`), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0);
const ARMS = {
  local: { sweep: 'r2b-sweep', alarm: 'r2b-alarm', haikuPrior: 'r2b-router', haikuNoPrior: 'rd-local-haiku-noprior', sonnetPrior: 'rd-local-sonnet-prior', sonnetNoPrior: 'rd-local-sonnet-noprior' },
  scatter: { sweep: 'r3-scatter-sweep', alarm: 'r3-scatter-alarm', haikuPrior: 'r3-scatter-router', haikuNoPrior: 'rd-scatter-haiku-noprior', sonnetPrior: 'rd-scatter-sonnet-prior', sonnetNoPrior: 'rd-scatter-sonnet-noprior' },
  poison: { sweep: 'r3-poison-sweep', alarm: 'r3-poison-alarm', verify: 'r3-poison-verify', haikuPrior: 'r3-poison-router', sonnetPrior: 'rd-poison-sonnet-prior' },
}, out = {};
for (const [sc, arms] of Object.entries(ARMS)) { const S = Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, sum(v)])), seeds = [...new Set(S.sweep.perTask.map((x) => x.seed))];
  const rows = seeds.map((seed) => Object.fromEntries([['seed', seed], ...Object.keys(arms).map((k) => [k, S[k].perTask.find((x) => x.seed === seed && x.cond === 1).correct])])), d = (a, b, s) => (a in arms && b in arms ? bootDiff(rows, a, b, s) : null);
  out[sc] = { table: Object.keys(arms).map((k) => ({ arm: k, study: arms[k], stable: S[k].accuracy.stable, edited: S[k].accuracy.edited, editedPartsReread: S[k].editedPartsReread, poisonReread: S[k].poisonReread ?? null, readsNextToPoison: S[k].readsNextToPoison ?? null, unusableAssignments: S[k].unusableAssignments ?? null, usd: usd(arms[k]) })),
    diffs: { sonnetPriorMinusHaikuPrior: d('sonnetPrior', 'haikuPrior', 20261281), sonnetPriorMinusSweep: d('sonnetPrior', 'sweep', 20261282), sonnetPriorMinusAlarm: d('sonnetPrior', 'alarm', 20261283), haikuNoPriorMinusHaikuPrior: d('haikuNoPrior', 'haikuPrior', 20261284), sonnetNoPriorMinusSonnetPrior: d('sonnetNoPrior', 'sonnetPrior', 20261285), haikuNoPriorMinusSweep: d('haikuNoPrior', 'sweep', 20261286), sonnetNoPriorMinusSweep: d('sonnetNoPrior', 'sweep', 20261287) } }; }
const v = (x) => (x ? verdictOf(x) : 'not-evaluated'), notBelow = (x) => (x ? (x.ci95[1] < 0 ? 'refuted' : 'supported') : 'not-evaluated'), L = out.local.diffs, Sc = out.scatter.diffs, P = out.poison.diffs;
out.tests = { P1: v(Sc.sonnetPriorMinusHaikuPrior), P2: v(P.sonnetPriorMinusHaikuPrior), P3: v(Sc.haikuNoPriorMinusHaikuPrior), P4: v(Sc.sonnetNoPriorMinusSonnetPrior),
  P5: v(L.sonnetNoPriorMinusSweep) === 'supported' && notBelow(Sc.sonnetNoPriorMinusSweep) === 'supported' ? 'supported' : 'not supported', P5haiku: v(L.haikuNoPriorMinusSweep) === 'supported' && notBelow(Sc.haikuNoPriorMinusSweep) === 'supported' ? 'supported' : 'not supported',
  P6: Object.values(out).flatMap((x) => x.table || []).every((x) => x.stable >= 0.9) ? 'supported' : 'not supported' };
fs.mkdirSync(path.join(ROOT, 'results/ring-routers'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/ring-routers/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
