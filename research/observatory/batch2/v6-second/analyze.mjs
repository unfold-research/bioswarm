// Combined, preregistered analysis of V6 across the two models (P4, P5), with cost from the ledgers.
// Usage: node observatory/batch2/v6-second/analyze.mjs   -> results/batch2-v6-second/combined.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { perTask, SEEDS } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const son = rd('results/batch2-v6-second-sonnet/wave-0.scored.json'), sv = (seed, a) => (son.find((x) => x.seed === seed && x.agent === a).correct ? 1 : 0);
const rows = perTask(rd('results/batch2-v6-second/wave-0.scored.json'), rd('results/batch2-v6-second/wave-1.scored.json')).map((t) => ({ ...t, sonnetDirect: sv(t.seed, 'direct'), sonnetW60: sv(t.seed, 'w60') }));
const cost = (dir) => { const c = {}; for (const l of fs.readFileSync(path.join(ROOT, dir, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l), a = r.customId.split('-')[2]; (c[a] ||= []).push(r.usageCostUsd); } return Object.fromEntries(Object.entries(c).map(([a, v]) => [a, v.reduce((x, y) => x + y, 0) / v.length])); };
const keys = ['direct', 'single', 'vote3', 'verify3', 'w60', 'w150', 'sonnetDirect', 'sonnetW60'], accuracy = Object.fromEntries(keys.map((k) => [k, rows.reduce((n, r) => n + r[k], 0) / SEEDS.length]));
const d4 = bootDiff(rows, 'w150', 'sonnetDirect', 20261204), d5 = bootDiff(rows, 'sonnetW60', 'sonnetDirect', 20261205);
const out = { tasks: rows.length, accuracy, usdPerCall: { haiku: cost('results/batch2-v6-second'), sonnet: cost('results/batch2-v6-second-sonnet') }, haikuW150MinusSonnetDirect: d4, sonnetW60MinusSonnetDirect: d5, tests: { P4: verdictOf(d4), P5: verdictOf(d5) } };
fs.writeFileSync(path.join(ROOT, 'results/batch2-v6-second/combined.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
