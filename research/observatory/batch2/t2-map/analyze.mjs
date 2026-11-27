// Analysis of the T2 map: share right and cost for every task, size and number of agents; fire and quiet cells; the four
// registered predictions. Usage: node observatory/batch2/t2-map/analyze.mjs   (writes results/batch2-t2-map/analysis.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STUDIES, idOf, study, TASKS, SIZES, sizesOf, tasksOf } from './protocol.mjs';
import { tokensByRun, runId } from '../silo/tasks.mjs';
import { mulberry32 } from '../littask.mjs';

const RES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../results'), OUT = path.join(RES, 'batch2-t2-map');
const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8')), lines = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const mean = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : null), sum = (a, f) => a.reduce((n, x) => n + f(x), 0), key = (x) => `${x.task}/${x.M}/${x.i}`;
const runs = [], calls = [];
for (const [regime, k] of STUDIES) { const dir = path.join(RES, `batch2-${idOf(regime, k)}`), s = study(regime, k), tokens = new Map(tokensByRun(lines(path.join(dir, 'ledger.jsonl'))).map((r) => [r.run, r]));
  for (let w = 0; w < s.WAVES; w++) for (const x of json(path.join(dir, `wave-${w}.scored.json`))) { if (x.kind === 'run') { const t = tokens.get(runId(x.task, x.M, x.i, k)); runs.push({ ...x, regime, input: t.input, output: t.output, usd: t.usd, calls: t.calls }); } else calls.push({ ...x, regime, k }); } }
const of = (task, M, k) => runs.filter((x) => x.task === task && x.M === M && x.k === k), by = new Map(runs.map((x) => [`${key(x)}/${x.k}`, x]));
const cells = TASKS.flatMap((task) => SIZES.flatMap((M) => [1, 2, 4, 8].filter((k) => sizesOf(k).includes(M)).map((k) => { const r = of(task, M, k), right = r.filter((x) => x.right).length;
  return { task, M, k, n: r.length, right, share: +(right / r.length).toFixed(3), tokens: Math.round(mean(r.map((x) => x.input + x.output))), input: Math.round(mean(r.map((x) => x.input))), output: Math.round(mean(r.map((x) => x.output))), usdPerRun: +mean(r.map((x) => x.usd)).toFixed(6), usdPerRight: right ? +(sum(r, (x) => x.usd) / right).toFixed(6) : null,
    agentsRight: k > 1 && r[0].agentsAnswering !== undefined ? +(sum(r, (x) => x.agentsRight) / sum(r, (x) => x.agentsAnswering || 0 || 1)).toFixed(3) : null }; })));
const cellOf = (task, M, k) => cells.find((c) => c.task === task && c.M === M && c.k === k);
const map = TASKS.flatMap((task) => SIZES.map((M) => { const solo = cellOf(task, M, 1), others = cells.filter((c) => c.task === task && c.M === M && c.k > 1), best = others.reduce((b, c) => (c.share > b.share ? c : b), others[0]), gain = +(best.share - solo.share).toFixed(3);
  return { task, M, solo: solo.share, bestK: best.k, bestShare: best.share, gain, kind: gain >= 0.15 ? 'fire' : 'quiet', nearLine: Math.abs(gain - 0.15) <= 0.05, tokenRatioBest: +(best.tokens / solo.tokens).toFixed(2) }; }));
const rnd = mulberry32(20261113);
function paired(filter, k) { const d = runs.filter((x) => x.k === k && filter(x)).map((x) => (x.right ? 1 : 0) - (by.get(`${key(x)}/1`).right ? 1 : 0)), draws = Array.from({ length: 4000 }, () => mean(d.map(() => d[Math.floor(rnd() * d.length)]))).sort((a, b) => a - b);
  return { k, n: d.length, diff: +mean(d).toFixed(3), low: +draws[100].toFixed(3), high: +draws[3899].toFixed(3) }; }
const falling = ['I-05', 'I-06'], controls = ['I-01', 'III-22'];
const p1 = paired((x) => falling.includes(x.task) && x.M === 16, 4), p2 = [2, 4, 8].map((k) => paired((x) => controls.includes(x.task), k)), p3 = paired((x) => x.M === 4, 2);
const p4 = [2, 4, 8].map((k) => ({ k, ratios: controls.flatMap((t) => sizesOf(k).map((M) => ({ task: t, M, ratio: +(cellOf(t, M, k).tokens / cellOf(t, M, 1).tokens).toFixed(2) }))) }));
const predictions = { P1: { ...p1, verdict: p1.low > 0 ? 'supported' : p1.high < 0 ? 'refuted' : 'not supported' }, P2: p2.map((x) => ({ ...x, verdict: x.low > 0 ? 'refuted' : 'supported' })), P3: { ...p3, verdict: p3.low > 0 ? 'refuted' : 'supported' }, P4: p4.map((x) => ({ ...x, verdict: x.ratios.every((r) => r.ratio > 1) ? 'supported' : 'not supported' })) };
const gate = json(path.join(RES, 'batch2-t2-gate-think', 'wave-0.scored.json')), gateBy = new Map(gate.map((x) => [key(x), x.right]));
const shared = runs.filter((x) => x.k === 1 && x.i < 12 && gateBy.has(key(x))), retest = { n: shared.length, sameOutcome: shared.filter((x) => x.right === gateBy.get(key(x))).length, rightHere: shared.filter((x) => x.right).length, rightInGate: shared.filter((x) => gateBy.get(key(x))).length };
const result = { predictions, map, cells, retest, cutReplies: calls.filter((x) => x.truncated).length, invalidReplies: calls.filter((x) => !x.valid).length, calls: calls.length, usd: +sum(runs, (x) => x.usd).toFixed(4), usdByArm: Object.fromEntries(STUDIES.map(([r, k]) => [idOf(r, k), +sum(runs.filter((x) => x.regime === r && x.k === k), (x) => x.usd).toFixed(4)])) };
fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(predictions)); console.log(JSON.stringify(retest), 'cut', result.cutReplies, 'invalid', result.invalidReplies, 'calls', result.calls, 'usd', result.usd, JSON.stringify(result.usdByArm));
for (const task of TASKS) console.table(Object.fromEntries(SIZES.map((M) => [`M=${M}`, Object.fromEntries([1, 2, 4, 8].map((k) => { const c = cellOf(task, M, k); return [`k=${k}`, c ? `${c.right}/${c.n} tok ${c.tokens}` : '']; }))])));
console.table(map);
void tasksOf;
