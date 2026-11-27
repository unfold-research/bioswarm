// Combined, preregistered analysis of V4 with the second-model study (P4, P5).
// Usage: node observatory/batch2/v4-diverse/analyze.mjs   -> results/batch2-v4-diverse/combined.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { perTask, accOf, COLLECTIVES, LEVELS } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const scored = [...rd('results/batch2-v4-diverse/wave-0.scored.json'), ...rd('results/batch2-v4-diverse-sonnet/wave-0.scored.json')];
const rows = perTask(scored, { ...COLLECTIVES, models3: ['a0', 'b', 'sonnet'] }), keys = ['a0', 'copies3', 'wordings3', 'mixed3', 'models3', 'sonnet'];
const d4 = bootDiff(rows, 'models3', 'copies3', 20261174), d5 = bootDiff(rows, 'sonnet', 'models3', 20261175);
const out = { overall: accOf(rows, keys), byLevel: Object.fromEntries(LEVELS.map((L) => [L, accOf(rows.filter((x) => x.level === L), keys)])), models3MinusCopies3: d4, sonnetMinusModels3: d5, tests: { P4: verdictOf(d4), P5: verdictOf(d5) } };
fs.writeFileSync(path.join(ROOT, 'results/batch2-v4-diverse/combined.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
