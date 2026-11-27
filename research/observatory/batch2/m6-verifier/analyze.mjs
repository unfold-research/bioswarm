// Combined, preregistered analysis of M6 with the second-model study (P2 to P4).
// Usage: node observatory/batch2/m6-verifier/analyze.mjs   -> results/batch2-m6-verifier/combined.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { perTask } from './protocol.mjs';
import { bootDiff, verdictOf, LEVELS } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const son = new Map(rd('results/batch2-m6-verifier-sonnet/wave-0.scored.json').map((x) => [x.seed, x.correct ? 1 : 0]));
const rows = perTask(rd('results/batch2-m6-verifier/wave-0.scored.json'), rd('results/batch2-m6-verifier/wave-1.scored.json')).map((t) => ({ ...t, sonnet: son.get(t.seed), cascadeV0: t.acceptV0 ? t.single : son.get(t.seed), cascadeVw: t.acceptVw ? t.single : son.get(t.seed) }));
const keys = ['single', 'sw', 'cascadeV0', 'cascadeVw', 'sonnet'], mean = (r, f) => r.reduce((n, x) => n + f(x), 0) / r.length, acc = (r) => Object.fromEntries(keys.map((k) => [k, mean(r, (x) => x[k])]));
const all = acc(rows), escalated = { v0: mean(rows, (x) => 1 - x.acceptV0), vw: mean(rows, (x) => 1 - x.acceptVw) }, dCascade = bootDiff(rows, 'cascadeVw', 'cascadeV0', 20261141), dSw = bootDiff(rows, 'sw', 'cascadeVw', 20261142);
const out = { tasks: rows.length, overall: all, byLevel: Object.fromEntries(LEVELS.map((L) => [L, acc(rows.filter((x) => x.level === L))])), escalatedShare: escalated, cascadeVwMinusCascadeV0: dCascade, swMinusCascadeVw: dSw,
  tests: { P2: verdictOf(dCascade), P3: all.sonnet - all.cascadeVw <= 0.05 && escalated.vw < 0.7 ? 'supported' : 'not supported', P4: all.sw >= all.cascadeVw - 0.05 ? 'supported' : 'not supported' } };
fs.writeFileSync(path.join(ROOT, 'results/batch2-m6-verifier/combined.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
