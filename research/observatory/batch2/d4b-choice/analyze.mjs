// Preregistered analysis of D4b: each variant against D4 (marks) and the R2b regimes, paired by collection.
// Usage: node observatory/batch2/d4b-choice/analyze.mjs   -> results/batch2-d4b-choice/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEEDS } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), sum = (s) => JSON.parse(fs.readFileSync(path.join(ROOT, `results/batch2-${s}/summary.json`), 'utf8'));
const studies = { told: 'd4b-told', wide: 'd4b-wide', draw: 'd4b-draw', marks: 'd4-marks', alarm: 'r2b-alarm', router: 'r2b-router', sweep: 'r2b-sweep' }, S = Object.fromEntries(Object.entries(studies).map(([k, v]) => [k, sum(v)]));
const usd = (s) => fs.readFileSync(path.join(ROOT, `results/batch2-${s}/ledger.jsonl`), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0);
const rows = SEEDS.map((seed) => Object.fromEntries([['seed', seed], ...Object.keys(studies).map((k) => [k, S[k].perTask.find((x) => x.seed === seed && x.cond === 1).correct])]));
const d = (a, b, seed) => bootDiff(rows, a, b, seed), diffs = { toldMinusMarks: d('told', 'marks', 20261271), wideMinusMarks: d('wide', 'marks', 20261272), drawMinusMarks: d('draw', 'marks', 20261273), toldMinusAlarmRule: d('told', 'alarm', 20261274), wideMinusAlarmRule: d('wide', 'alarm', 20261275), drawMinusAlarmRule: d('draw', 'alarm', 20261276) };
const out = { collections: rows.length, table: Object.keys(studies).map((k) => ({ regime: k, study: studies[k], stable: S[k].accuracy.stable, edited: S[k].accuracy.edited, editedPartsReread: S[k].editedPartsReread, usd: usd(studies[k]) })), choices: Object.fromEntries(['told', 'wide', 'draw', 'marks'].map((k) => [k, S[k].choices])), diffs,
  tests: { P1: verdictOf(diffs.toldMinusMarks), P2: verdictOf(diffs.wideMinusMarks), P3: verdictOf(diffs.drawMinusMarks), P4: ['told', 'wide', 'draw'].every((k) => S[k].accuracy.stable >= 0.9) ? 'supported' : 'not supported' } };
fs.mkdirSync(path.join(ROOT, 'results/batch2-d4b-choice'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-d4b-choice/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
