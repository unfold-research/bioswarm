// G3b runner: what actually carries the track hybrid, plus the cap sensitivity G3a left open. Free, no model calls.
// Usage: node observatory/genome/sim/g3b.mjs
// Protocol: tasks/G3B-TRACK-PREREG.md. Seeds are separated by hypothesis: 3000-3049 for H-G20 only, 1000-1199 otherwise.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { simulate, TASKS, FLAGS } from './engine.mjs';

const TASK_DEFS = { maintain: () => TASKS.maintain(), track: () => TASKS.track(), mass: () => TASKS.mass(), pipeline: () => TASKS.pipeline() };
const MAIN = ['maintain', 'track', 'mass', 'pipeline'], THREATS = [0, 0.2];

// Frozen from the G3a run (results/genome-g3a/selection.json), so G3b does not re-select.
export const HYBRIDS = {
  'maintain|0': ['DOL-04', 'SIG-01'],
  'maintain|0.2': [],
  'track|0': ['DEC-04', 'DEF-01', 'DEF-04', 'DOL-04', 'FLD-04', 'SIG-01', 'SIG-04'],
  'track|0.2': ['DEC-04', 'DEF-01', 'DEF-04', 'DOL-04', 'REG-05', 'SIG-01', 'SIG-04'],
  'mass|0': ['ACT-02', 'DOL-04'],
  'mass|0.2': ['ACT-02', 'ACT-03', 'DEF-01', 'DOL-01', 'DOL-04', 'FLD-01', 'SIG-02'],
  'pipeline|0': ['DEC-04'],
  'pipeline|0.2': ['DEF-04'],
};
export const GENERAL = ['DEC-04', 'DEF-01', 'DOL-04'];
export const SCHOOL = ['SIG-06', 'FLD-04', 'DEC-04'];
export const BASELINES = { independent: { flags: [] }, schedule: { flags: [], sched: true }, orchestrator: { flags: ['DOL-04'] }, board: { flags: ['FLD-01', 'FLD-02'] } };
export const DEFENCE = ['DEF-01', 'DEF-04'];

if (!isMainThread) {
  parentPort.on('message', (jobs) => {
    parentPort.postMessage(jobs.map((j) => ({ key: j.key, seed: j.seed, score: simulate({ task: TASK_DEFS[j.task](), flags: j.flags, sched: !!j.sched, threat: j.threat, seed: j.seed, params: j.params || {} }).score })));
  });
} else await main();

async function main() {
  const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');
  const OUT = path.join(ROOT, 'results/genome-g3b');
  fs.mkdirSync(OUT, { recursive: true });
  const TEST = Array.from({ length: 200 }, (_, i) => 1000 + i);
  const SENS = Array.from({ length: 50 }, (_, i) => 3000 + i);
  const workers = Array.from({ length: Math.max(2, os.cpus().length - 2) }, () => new Worker(fileURLToPath(import.meta.url)));
  const t0 = Date.now(), log = (m) => { console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`); fs.appendFileSync(path.join(OUT, 'run.log'), `[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}\n`); };

  async function perSeed(cells) { // cells: {key, task, flags, sched, threat, seeds, params}
    const jobs = cells.flatMap((c) => c.seeds.map((seed) => ({ key: c.key, task: c.task, flags: c.flags, sched: c.sched, threat: c.threat, seed, params: c.params })));
    const chunks = Array.from({ length: workers.length }, () => []); jobs.forEach((j, i) => chunks[i % workers.length].push(j));
    const res = (await Promise.all(workers.map((wk, i) => new Promise((ok) => { wk.once('message', ok); wk.postMessage(chunks[i]); })))).flat();
    const by = new Map(); for (const r of res) { if (!by.has(r.key)) by.set(r.key, []); by.get(r.key).push(r); }
    return Object.fromEntries(cells.map((c) => [c.key, by.get(c.key).sort((a, b) => a.seed - b.seed).map((r) => r.score)]));
  }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, b) => x + (b - m) ** 2, 0) / Math.max(1, a.length - 1)); };
  const half = (a) => (1.96 * sd(a)) / Math.sqrt(a.length);
  const paired = (x, y) => { const d = x.map((v, i) => v - y[i]); return { mean: mean(d), half: half(d) }; };

  const presets = { ...Object.fromEntries(Object.entries(BASELINES).map(([k, v]) => [k, { flags: v.flags, sched: !!v.sched }])) };

  // ---- H-G19: the informed perception edge is not load-bearing on track (test seeds) ----
  const trackHyb = HYBRIDS['track|0'];
  const h19 = await perSeed([
    { key: 'edge09', task: 'track', flags: trackHyb, threat: 0, seeds: TEST },
    { key: 'edge065', task: 'track', flags: trackHyb, threat: 0, seeds: TEST, params: { informedP: 0.65 } },
  ]);
  log('H-G19 edge');

  // ---- H-G21: DOL-04 alone against the track hybrid (test seeds) ----
  const h21 = await perSeed([
    { key: 'hybrid', task: 'track', flags: trackHyb, threat: 0, seeds: TEST },
    { key: 'orch', task: 'track', flags: ['DOL-04'], threat: 0, seeds: TEST },
  ]);
  // ablation of the track hybrid (diagnostic, same seeds)
  const abl = await perSeed(trackHyb.map((f) => ({ key: f, task: 'track', flags: trackHyb.filter((x) => x !== f), threat: 0, seeds: TEST })));
  log('H-G21 + ablation');

  // ---- H-G22: can any leaderless regime beat the orchestrator under threat? ----
  const leaderless = { ...presets, school: { flags: SCHOOL }, general: { flags: GENERAL } };
  for (const [k, fl] of Object.entries(HYBRIDS)) { const [task, th] = k.split('|'); if (+th === 0.2 && !fl.includes('DOL-04')) leaderless[`hybrid-${task}`] = { flags: fl }; }
  const h22cells = [];
  for (const task of MAIN) {
    h22cells.push({ key: `${task}|orchestrator`, task, flags: ['DOL-04'], threat: 0.2, seeds: TEST });
    h22cells.push({ key: `${task}|orchestrator-def`, task, flags: ['DOL-04', ...DEFENCE], threat: 0.2, seeds: TEST });
    for (const [n, r] of Object.entries(leaderless)) if (!r.flags.includes('DOL-04')) h22cells.push({ key: `${task}|${n}`, task, flags: r.flags, sched: r.sched, threat: 0.2, seeds: TEST });
  }
  const h22raw = await perSeed(h22cells); log(`H-G22 ${h22cells.length} cells`);

  // ---- H-G20: cap sensitivity on 3000-3049 only ----
  const sensCells = [];
  for (const cap of [0, 2, 4, 8]) for (const task of MAIN) {
    sensCells.push({ key: `${task}|school|${cap}`, task, flags: SCHOOL, threat: 0, seeds: SENS, params: { informedSense: cap } });
    sensCells.push({ key: `${task}|hybrid|${cap}`, task, flags: HYBRIDS[`${task}|0`], threat: 0, seeds: SENS, params: { informedSense: cap } });
  }
  const sens = await perSeed(sensCells); log('H-G20 sensitivity');

  // ---- analysis ----
  const analysis = {};
  { const p = paired(h19.edge09, h19.edge065);
    analysis.H_G19 = { mean09: +mean(h19.edge09).toFixed(4), mean065: +mean(h19.edge065).toFixed(4), paired: +p.mean.toFixed(4), half: +p.half.toFixed(4), verdict: Math.abs(p.mean) < 0.02 ? 'supported' : 'refuted' }; }
  { const ratio = mean(h21.orch) / mean(h21.hybrid);
    analysis.H_G21 = { hybrid: +mean(h21.hybrid).toFixed(4), orchestrator: +mean(h21.orch).toFixed(4), ratio: +ratio.toFixed(3), verdict: ratio >= 0.9 ? 'supported' : 'refuted',
      ablation: Object.fromEntries(Object.entries(abl).map(([f, a]) => [f, +(mean(h21.hybrid) - mean(a)).toFixed(4)])) }; }
  { const rows = [];
    for (const task of MAIN) {
      const orch = h22raw[`${task}|orchestrator`], orchDef = h22raw[`${task}|orchestrator-def`];
      const bestOrch = mean(orchDef) > mean(orch) ? ['orchestrator+defence', mean(orchDef)] : ['orchestrator', mean(orch)];
      const cands = Object.keys(h22raw).filter((k) => k.startsWith(`${task}|`) && !k.includes('orchestrator'));
      const best = cands.reduce((a, b) => (mean(h22raw[b]) > mean(h22raw[a]) ? b : a));
      const diff = mean(h22raw[best]) - bestOrch[1];
      // separable against the stronger orchestrator
      const ref = mean(orchDef) > mean(orch) ? orchDef : orch;
      const p = paired(h22raw[best], ref);
      rows.push({ task, bestLeaderless: best.split('|')[1], leaderless: +mean(h22raw[best]).toFixed(4), bestOrchestrator: bestOrch[0], orchestrator: +bestOrch[1].toFixed(4), diff: +diff.toFixed(4), paired: +p.mean.toFixed(4), half: +p.half.toFixed(4), separable: Math.abs(p.mean) > p.half && p.mean > 0 });
    }
    analysis.H_G22 = { rows, verdict: rows.some((r) => r.separable && r.paired > 0) ? 'supported' : 'refuted' }; }
  { const rows = [];
    for (const task of MAIN) for (const reg of ['school', 'hybrid']) {
      const vals = [0, 2, 4, 8].map((c) => mean(sens[`${task}|${reg}|${c}`]));
      const range = Math.max(...vals) - Math.min(...vals);
      rows.push({ task, regime: reg, byCap: Object.fromEntries([0, 2, 4, 8].map((c, i) => [c, +vals[i].toFixed(4)])), range: +range.toFixed(4), ok: range < 0.02 });
    }
    analysis.H_G20 = { rows, verdict: rows.every((r) => r.ok) ? 'supported' : 'refuted' }; }

  fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(analysis, null, 1));
  fs.writeFileSync(path.join(OUT, 'sensitivity.json'), JSON.stringify({ seeds: [SENS[0], SENS.at(-1)], mean: Object.fromEntries(Object.entries(sens).map(([k, v]) => [k, +mean(v).toFixed(4)])) }, null, 1));
  fs.writeFileSync(path.join(OUT, 'ablation.json'), JSON.stringify(analysis.H_G21.ablation, null, 1));
  fs.writeFileSync(path.join(OUT, 'grid.json'), JSON.stringify({ hybrids: HYBRIDS, general: GENERAL, school: SCHOOL, baselines: BASELINES, perSeed: Object.fromEntries(Object.entries(h22raw).map(([k, v]) => [k, v.map((x) => +x.toFixed(4))])) }, null, 1));
  log('written');
  workers.forEach((w) => w.terminate());
  for (const k of ['H_G19', 'H_G20', 'H_G21', 'H_G22']) console.log(k, analysis[k].verdict);
}
