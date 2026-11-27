// Combined, preregistered analysis of V7 with the second-model study (P4), with cost from the ledgers.
// Usage: node observatory/batch2/v7-hard/analyze.mjs   -> results/batch2-v7-hard/combined.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { perTask, accOf, LEVELS } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const son = new Map(rd('results/batch2-v7-hard-sonnet/wave-0.scored.json').map((x) => [x.seed, x.correct ? 1 : 0]));
const rows = perTask(rd('results/batch2-v7-hard/wave-0.scored.json'), rd('results/batch2-v7-hard/wave-1.scored.json')).map((t) => ({ ...t, sonnet: son.get(t.seed), escalate: t.accepted0 ? t.deep : son.get(t.seed) }));
const cost = (dir, key) => { const c = {}; for (const l of fs.readFileSync(path.join(ROOT, dir, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l), a = key(r.customId.split('-')); (c[a] ||= []).push(r.usageCostUsd); } return Object.fromEntries(Object.entries(c).map(([a, v]) => [a, v.reduce((x, y) => x + y, 0) / v.length])); };
const keys = ['deep', 'deepvote3', 'select3', 'escalate', 'sonnet'], d4 = bootDiff(rows, 'escalate', 'deep', 20261214), d5 = bootDiff(rows, 'sonnet', 'escalate', 20261215);
const out = { tasks: rows.length, overall: accOf(rows, keys), byLevel: Object.fromEntries(LEVELS.map((L) => [L, accOf(rows.filter((x) => x.level === L), keys)])), escalatedShare: rows.filter((t) => !t.accepted0).length / rows.length, usdPerCall: { haiku: cost('results/batch2-v7-hard', (p) => (p[2] === 'v' ? 'verifier' : 'deep')), sonnet: cost('results/batch2-v7-hard-sonnet', () => 'w60') }, escalateMinusDeep: d4, sonnetMinusEscalate: d5, tests: { P4: verdictOf(d4) } };
fs.writeFileSync(path.join(ROOT, 'results/batch2-v7-hard/combined.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
