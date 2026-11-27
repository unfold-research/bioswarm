// D6 analysis: the single agent against the regimes already run on the same collections, paired by collection.
// Usage: node observatory/batch2/d6-deep/analyze.mjs   -> results/batch2-d6-deep/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootDiff, verdictOf } from '../littask.mjs';
import { exact } from '../ring/simulate-rules.mjs';
import { SEEDS_OF } from './protocol.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), sum = (s) => JSON.parse(fs.readFileSync(path.join(ROOT, `results/batch2-${s}/summary.json`), 'utf8')), usd = (s) => fs.readFileSync(path.join(ROOT, `results/batch2-${s}/ledger.jsonl`), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0);
const ARMS = { local: { deep: 'd6-deep-local', sweep: 'r2b-sweep', alarm: 'r2b-alarm', haikuRouter: 'r2b-router', sonnetRouter: 'rd-local-sonnet-prior' }, scatter: { deep: 'd6-deep-scatter', sweep: 'r3-scatter-sweep', alarm: 'r3-scatter-alarm', haikuRouter: 'r3-scatter-router', sonnetRouter: 'rd-scatter-sonnet-prior' } }, out = {};
for (const [sc, arms] of Object.entries(ARMS)) { const S = Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, sum(v)])), probe = exact({ prefix: 'sim', scenario: sc, seeds: SEEDS_OF[sc], regime: 'probe' });
  const rows = SEEDS_OF[sc].map((seed) => Object.fromEntries([['seed', seed], ...Object.keys(arms).map((k) => [k, S[k].perTask.find((x) => x.seed === seed && x.cond === 1).correct]), ['probeRule', probe.perTask.find((x) => x.seed === seed && x.cond === 1).correct]])), d = (a, b, s) => bootDiff(rows, a, b, s);
  out[sc] = { table: [...Object.keys(arms).map((k) => ({ arm: k, study: arms[k], stable: S[k].accuracy.stable, edited: S[k].accuracy.edited, editedPartsReread: S[k].editedPartsReread, usd: usd(arms[k]) })), { arm: 'probeRule (simulated, exact readers)', stable: probe.accuracy.stable, edited: probe.accuracy.edited, editedPartsReread: probe.editedPartsReread, usd: 0 }],
    deep: { repeatsPerRun: S.deep.repeatsPerRun, recountsExact: S.deep.recountsExact, unusableNext: S.deep.unusableNext, truncated: S.deep.truncated },
    diffs: { deepMinusSweep: d('deep', 'sweep', 20261331), deepMinusHaikuRouter: d('deep', 'haikuRouter', 20261332), deepMinusAlarm: d('deep', 'alarm', 20261333), deepMinusSonnetRouter: d('deep', 'sonnetRouter', 20261334) } }; }
out.tests = { P1: verdictOf(out.local.diffs.deepMinusSweep), P2: verdictOf(out.local.diffs.deepMinusHaikuRouter), P3: out.scatter.diffs.deepMinusSweep.ci95[0] > 0 ? 'refuted' : 'supported', P4: out.local.table[0].stable >= 0.9 && out.scatter.table[0].stable >= 0.9 ? 'supported' : 'not supported' };
fs.mkdirSync(path.join(ROOT, 'results/batch2-d6-deep'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-d6-deep/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
