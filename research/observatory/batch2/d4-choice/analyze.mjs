// Preregistered analysis of D4: the two variants against each other and, paired by collection, against the R2b regimes.
// Usage: node observatory/batch2/d4-choice/analyze.mjs   -> results/batch2-d4-choice/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEEDS } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), sum = (s) => JSON.parse(fs.readFileSync(path.join(ROOT, `results/batch2-${s}/summary.json`), 'utf8'));
const studies = { marks: 'd4-marks', blind: 'd4-blind', sweep: 'r2b-sweep', alarm: 'r2b-alarm', router: 'r2b-router', random: 'r2b-random' }, S = Object.fromEntries(Object.entries(studies).map(([k, v]) => [k, sum(v)]));
const usd = (s) => fs.readFileSync(path.join(ROOT, `results/batch2-${s}/ledger.jsonl`), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0);
const rows = SEEDS.map((seed) => Object.fromEntries([['seed', seed], ...Object.keys(studies).map((k) => [k, S[k].perTask.find((x) => x.seed === seed && x.cond === 1).correct])]));
const d1 = bootDiff(rows, 'marks', 'blind', 20261251), d2 = bootDiff(rows, 'marks', 'alarm', 20261252), d3 = bootDiff(rows, 'marks', 'sweep', 20261253), d4 = bootDiff(rows, 'marks', 'router', 20261254);
const out = { collections: rows.length, table: Object.keys(studies).map((k) => ({ regime: k, study: studies[k], stable: S[k].accuracy.stable, edited: S[k].accuracy.edited, editedPartsReread: S[k].editedPartsReread, usd: usd(studies[k]) })), choices: { marks: S.marks.choices, blind: S.blind.choices },
  edited: { marksMinusBlind: d1, marksMinusAlarmRule: d2, marksMinusSweep: d3, marksMinusRouter: d4 }, tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: verdictOf(d3), P4: S.marks.accuracy.stable >= 0.9 && S.blind.accuracy.stable >= 0.9 ? 'supported' : 'not supported' } };
fs.mkdirSync(path.join(ROOT, 'results/batch2-d4-choice'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-d4-choice/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
