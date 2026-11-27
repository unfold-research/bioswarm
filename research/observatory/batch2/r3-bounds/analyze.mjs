// Preregistered analysis of R3: per scenario, the regimes against the fixed schedule and against each other.
// Usage: node observatory/batch2/r3-bounds/analyze.mjs   -> results/batch2-r3-bounds/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGIMES, SEEDS_OF } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), dir = (sc, r) => path.join(ROOT, `results/batch2-r3-${sc}-${r}`), out = {};
for (const sc of Object.keys(REGIMES)) {
  const S = Object.fromEntries(REGIMES[sc].map((r) => [r, JSON.parse(fs.readFileSync(path.join(dir(sc, r), 'summary.json'), 'utf8'))])), usd = (r) => fs.readFileSync(path.join(dir(sc, r), 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0);
  const rows = SEEDS_OF[sc].map((seed) => Object.fromEntries([['seed', seed], ...REGIMES[sc].map((r) => [r, S[r].perTask.find((x) => x.seed === seed && x.cond === 1).correct])])), d = (a, b, seed) => bootDiff(rows, a, b, seed);
  out[sc] = { table: REGIMES[sc].map((r) => ({ regime: r, stable: S[r].accuracy.stable, edited: S[r].accuracy.edited, editedPartsReread: S[r].editedPartsReread, poisonReread: S[r].poisonReread, readsNextToPoison: S[r].readsNextToPoison, readsExact: S[r].readsExact, unusableAssignments: S[r].unusableAssignments, usd: usd(r) })),
    diffs: { alarmMinusSweep: d('alarm', 'sweep', 20261261), routerMinusSweep: d('router', 'sweep', 20261262), routerMinusAlarm: d('router', 'alarm', 20261263), ...(sc === 'poison' ? { verifyMinusAlarm: d('verify', 'alarm', 20261264), verifyMinusSweep: d('verify', 'sweep', 20261265) } : {}) } };
}
const v = (x) => verdictOf(x), s = out.scatter.diffs, p = out.poison.diffs;
// P1 and P3 predict that the alarm rule loses its advantage: supported when the interval of alarm minus sweep is not above zero.
out.tests = { P1: s.alarmMinusSweep.ci95[0] > 0 ? 'refuted' : 'supported', P2: v(s.routerMinusAlarm), P3: p.alarmMinusSweep.ci95[0] > 0 ? 'refuted' : 'supported', P4: v(p.verifyMinusAlarm), P5: v(p.routerMinusAlarm),
  P6: [...out.scatter.table, ...out.poison.table].every((x) => x.stable >= 0.9) ? 'supported' : 'not supported' };
fs.mkdirSync(path.join(ROOT, 'results/batch2-r3-bounds'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-r3-bounds/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
