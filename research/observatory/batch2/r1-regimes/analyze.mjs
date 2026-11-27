// Cross-regime, preregistered analysis of R1 from the five per-regime submissions, with cost from the ledgers.
// Usage: node observatory/batch2/r1-regimes/analyze.mjs   -> results/batch2-r1-regimes/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGIMES, SEEDS } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), dir = (r) => path.join(ROOT, `results/batch2-r1-${r}`);
const sum = Object.fromEntries(REGIMES.map((r) => [r, JSON.parse(fs.readFileSync(path.join(dir(r), 'summary.json'), 'utf8'))]));
const usd = Object.fromEntries(REGIMES.map((r) => [r, fs.readFileSync(path.join(dir(r), 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0)]));
const rows = (cond) => SEEDS.map((seed) => Object.fromEntries([['seed', seed], ...REGIMES.map((r) => [r, sum[r].perTask.find((x) => x.seed === seed && x.cond === cond).correct])]));
const edited = rows(1), stable = rows(0), d = (a, b, seed, set = edited) => bootDiff(set, a, b, seed);
const d1 = d('stig-decay', 'stig-nodecay', 20261221), d2 = d('sweep', 'stig-decay', 20261222), d3 = d('router', 'sweep', 20261223), d4 = d('deep', 'sweep', 20261224), d5 = d('sweep', 'stig-decay', 20261225, stable);
const table = REGIMES.map((r) => ({ regime: r, stable: sum[r].accuracy.stable, edited: sum[r].accuracy.edited, editedPartReread: sum[r].editedPartRereadAfterEdit, partsCovered: sum[r].partsCovered, readsExact: sum[r].readsExact, readCalls: sum[r].readCalls, usd: usd[r] }));
const out = { tasks: SEEDS.length, table, edited: { stigDecayMinusStigNodecay: d1, sweepMinusStigDecay: d2, routerMinusSweep: d3, deepMinusSweep: d4 }, stable: { sweepMinusStigDecay: d5 }, tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: verdictOf(d3), P4: verdictOf(d4) } };
fs.mkdirSync(path.join(ROOT, 'results/batch2-r1-regimes'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-r1-regimes/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
