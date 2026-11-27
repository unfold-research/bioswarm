// REP1 analysis: the two task families side by side, and the planned-search replication with simulated rule arms.
// Usage: node observatory/batch2/rep1/analyze.mjs   -> results/batch2-rep1/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exact } from '../ring/simulate-rules.mjs';
import { range } from '../ring/engine.mjs';
import { bootDiff } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), sum = (s) => JSON.parse(fs.readFileSync(path.join(ROOT, `results/batch2-${s}/summary.json`), 'utf8')), usd = (s) => fs.readFileSync(path.join(ROOT, `results/batch2-${s}/ledger.jsonl`), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0);
const out = { families: {} };
for (const f of ['search', 'count']) { const s = sum(`rep1-${f}`); out.families[f] = { tasks: s.tasks, overall: s.overall, byLevel: s.byLevel, diffs: s.diffs, samplesDiffer: s.samplesDiffer, verifier: s.verifier, tests: s.tests, usd: usd(`rep1-${f}`) }; }
const son = sum('rep1-local-sonnet'), seeds = range(33001, 60), sim = Object.fromEntries(['sweep', 'alarm', 'probe'].map((r) => [r, exact({ prefix: 'sim', scenario: 'local', seeds, regime: r })]));
const rows = seeds.map((seed) => Object.fromEntries([['seed', seed], ['sonnet', son.perTask.find((x) => x.seed === seed && x.cond === 1).correct], ...Object.entries(sim).map(([k, v]) => [k, v.perTask.find((x) => x.seed === seed && x.cond === 1).correct])]));
out.plannedSearch = { collections: 60, sonnetWithPrior: { stable: son.accuracy.stable, edited: son.accuracy.edited, editedPartsReread: son.editedPartsReread, unusableAssignments: son.unusableAssignments, usd: usd('rep1-local-sonnet') }, simulatedWithExactReaders: Object.fromEntries(Object.entries(sim).map(([k, v]) => [k, v.accuracy.edited])), sonnetMinusSweep: bootDiff(rows, 'sonnet', 'sweep', 20261311), sonnetMinusAlarm: bootDiff(rows, 'sonnet', 'alarm', 20261312), test: son.accuracy.edited >= 0.9 ? 'supported' : 'not supported' };
fs.mkdirSync(path.join(ROOT, 'results/batch2-rep1'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-rep1/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
