// T1 analysis: the rule triggers by simulation (3,000 fields and the 90 fields of the study), and the central triggers
// decided by a model on those 90 fields, paired by field.
// Usage: node observatory/batch2/t1-trigger/analyze.mjs   -> results/batch2-t1-trigger/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEEDS, WORLDS, RULES, makeField, roundsOf, outcome, evaluateRules, worldOf } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), sum = (s) => JSON.parse(fs.readFileSync(path.join(ROOT, `results/batch2-${s}/summary.json`), 'utf8')), usd = (s) => fs.readFileSync(path.join(ROOT, `results/batch2-${s}/ledger.jsonl`), 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + JSON.parse(l).usageCostUsd, 0);
const big = Array.from({ length: 3000 }, (_, i) => 700001 + i), central = { haiku: sum('t1-central-haiku'), sonnet: sum('t1-central-sonnet') };
const rows = SEEDS.map((seed) => { const f = makeField(seed), r = { seed, world: f.world }; for (const rule of RULES) { const o = outcome(f, roundsOf(rule, f)); r[`${rule}_ok`] = o.correct; r[`${rule}_n`] = o.recounts; } for (const m of ['haiku', 'sonnet']) { const x = central[m].perField.find((y) => y.seed === seed); r[`${m}_ok`] = x.correct; r[`${m}_n`] = x.recounts; } r.two = 2; return r; });
const d = (a, b, seed, set = rows) => bootDiff(set, a, b, seed), edited = rows.filter((r) => r.world !== 'stable'), stable = rows.filter((r) => r.world === 'stable');
const out = { rulesOn3000: evaluateRules(big), rulesOnTheStudyFields: evaluateRules(SEEDS), central: Object.fromEntries(['haiku', 'sonnet'].map((m) => [m, { byWorld: central[m].byWorld, decisionCalls: central[m].decisionCalls, invalid: central[m].invalid, usd: usd(`t1-central-${m}`) }])),
  diffs: { sonnetMinusThr8flip_correct: d('sonnet_ok', 'thr8flip_ok', 20261321), sonnetMinusThr8flip_recounts: d('sonnet_n', 'thr8flip_n', 20261322), haikuMinusThr8flip_correct: d('haiku_ok', 'thr8flip_ok', 20261323), haikuMinusThr8flip_recounts: d('haiku_n', 'thr8flip_n', 20261324), sonnetMinusAlways_correct_edited: d('sonnet_ok', 'always_ok', 20261325, edited), sonnetMinusOneRound_recounts_stable: d('sonnet_n', 'two', 20261326, stable), haikuMinusOneRound_recounts_stable: d('haiku_n', 'two', 20261327, stable) } };
const notAbove = (x) => (x.ci95[0] > 0 ? 'refuted' : 'supported');
out.tests = { P1: notAbove(out.diffs.sonnetMinusThr8flip_correct), P1haiku: notAbove(out.diffs.haikuMinusThr8flip_correct), P2: verdictOf(out.diffs.sonnetMinusOneRound_recounts_stable), P2haiku: verdictOf(out.diffs.haikuMinusOneRound_recounts_stable) };
fs.mkdirSync(path.join(ROOT, 'results/batch2-t1-trigger'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-t1-trigger/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
