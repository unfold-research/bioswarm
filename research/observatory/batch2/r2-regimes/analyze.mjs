// Cross-regime, preregistered analysis of R2 from the four per-regime submissions, with cost from the ledgers.
// Usage: node observatory/batch2/r2-regimes/analyze.mjs   -> results/batch2-r2-regimes/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGIMES, SEEDS } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), dir = (r) => path.join(ROOT, `results/batch2-r2-${r}`);
const sum = Object.fromEntries(REGIMES.map((r) => [r, JSON.parse(fs.readFileSync(path.join(dir(r), 'summary.json'), 'utf8'))]));
const usd = Object.fromEntries(REGIMES.map((r) => [r, fs.readFileSync(path.join(dir(r), 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0)]));
const rows = (cond) => SEEDS.map((seed) => Object.fromEntries([['seed', seed], ...REGIMES.map((r) => [r, sum[r].perTask.find((x) => x.seed === seed && x.cond === cond).correct])]));
const edited = rows(1), d1 = bootDiff(edited, 'alarm', 'sweep', 20261231), d2 = bootDiff(edited, 'alarm', 'random', 20261232), d3 = bootDiff(edited, 'router', 'alarm', 20261233), d4 = bootDiff(edited, 'router', 'sweep', 20261234);
const table = REGIMES.map((r) => ({ regime: r, stable: sum[r].accuracy.stable, edited: sum[r].accuracy.edited, atLeastTwoEditedReread: sum[r].atLeastTwoEditedReread, editedPartsReread: sum[r].editedPartsReread, distinctPartsReread: sum[r].distinctPartsReread, alarmsStable: sum[r].alarmsPerCollection.stable, alarmsEdited: sum[r].alarmsPerCollection.edited, readsExact: sum[r].readsExact, readCalls: sum[r].readCalls, assignCalls: sum[r].assignCalls, unusableAssignments: sum[r].unusableAssignments, usd: usd[r] }));
const out = { collections: SEEDS.length, table, edited: { alarmMinusSweep: d1, alarmMinusRandom: d2, routerMinusAlarm: d3, routerMinusSweep: d4 },
  tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: verdictOf(d3), P4: REGIMES.every((r) => sum[r].accuracy.stable >= 0.9) ? 'supported' : 'not supported' } };
fs.mkdirSync(path.join(ROOT, 'results/batch2-r2-regimes'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-r2-regimes/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
