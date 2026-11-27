// G2 runner: preset grid, defence variants, greedy flag selection and single-flag effects. Free (no model calls).
// Usage: node observatory/genome/sim/run.mjs [--quick]   (--quick: 8 seeds per cell, for a smoke test only)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { simulate, TASKS, FLAGS } from './engine.mjs';

const TASK_DEFS = { maintain: () => TASKS.maintain(), 'maintain-scattered': () => TASKS.maintain({ local: 0 }), track: () => TASKS.track(), mass: () => TASKS.mass(), pipeline: () => TASKS.pipeline() };

if (!isMainThread) {
  parentPort.on('message', (jobs) => {
    parentPort.postMessage(jobs.map((j) => ({ key: j.key, seed: j.seed, ...simulate({ task: TASK_DEFS[j.task](), flags: j.flags, sched: j.sched, threat: j.threat, seed: j.seed }) })));
  });
} else await main();

async function main() {
  const { archetypes, BASELINES, DEFENCE } = await import('./regimes.mjs');
  const { ROOT } = await import('../lib.mjs');
  const quick = process.argv.includes('--quick');
  const OUT = path.join(ROOT, quick ? 'results/genome-g2/quick' : 'results/genome-g2');
  fs.mkdirSync(OUT, { recursive: true });
  const TEST = Array.from({ length: quick ? 8 : 200 }, (_, i) => 1000 + i);
  const TRAIN = Array.from({ length: quick ? 4 : 40 }, (_, i) => 2000 + i);
  const MAIN = ['maintain', 'track', 'mass', 'pipeline'], ALL = [...MAIN, 'maintain-scattered'], THREATS = [0, 0.2];
  const A = archetypes();

  const workers = Array.from({ length: Math.max(2, os.cpus().length - 2) }, () => new Worker(fileURLToPath(import.meta.url)));
  async function evalMany(cells) { // cells: {key, task, flags, sched, threat, seeds}
    const jobs = cells.flatMap((c) => c.seeds.map((seed) => ({ key: c.key, task: c.task, flags: c.flags, sched: !!c.sched, threat: c.threat, seed })));
    const chunks = Array.from({ length: workers.length }, () => []); jobs.forEach((j, i) => chunks[i % workers.length].push(j));
    const res = (await Promise.all(workers.map((wk, i) => new Promise((ok) => { wk.once('message', ok); wk.postMessage(chunks[i]); })))).flat();
    const by = new Map(); for (const r of res) (by.get(r.key) || by.set(r.key, []).get(r.key)).push(r);
    return Object.fromEntries(cells.map((c) => { const xs = by.get(c.key) || [], s = xs.map((x) => x.score), n = s.length, m = s.reduce((a, b) => a + b, 0) / n;
      const sd = Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1));
      return [c.key, { mean: m, half: 1.96 * sd / Math.sqrt(n), n, actions: xs.reduce((a, x) => a + x.actions, 0) / n, trueFlags: xs.reduce((a, x) => a + x.trueFlags, 0) / n, falseFlags: xs.reduce((a, x) => a + x.falseFlags, 0) / n }]; }));
  }
  const norm = (fl) => [...new Set(fl)].sort();
  const t0 = Date.now(), log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);

  // ---- presets ----
  const presets = { ...Object.fromEntries(Object.entries(BASELINES).map(([k, v]) => [k, { flags: v.flags, sched: !!v.sched, kind: 'control' }])),
    ...Object.fromEntries(Object.entries(A).map(([k, v]) => [k, { flags: v.flags, kind: 'archetype' }])) };
  for (const k of ['orchestrator', 'board', ...Object.keys(A)]) presets[`${k}+def`] = { flags: norm([...presets[k].flags, ...DEFENCE]), kind: 'defence-variant', base: k };
  const gridCells = []; for (const task of ALL) for (const threat of THREATS) for (const [name, r] of Object.entries(presets))
    gridCells.push({ key: `${task}|${threat}|${name}`, task, threat, flags: r.flags, sched: r.sched, seeds: TEST });
  const grid = await evalMany(gridCells); log(`grid ${gridCells.length} cells`);

  // ---- single-flag effects (exploratory) ----
  const singleCells = []; for (const task of MAIN) for (const threat of THREATS) for (const fl of FLAGS) singleCells.push({ key: `${task}|${threat}|${fl}`, task, threat, flags: [fl], seeds: TEST.slice(0, quick ? 8 : 100) });
  const single = await evalMany(singleCells); log('single flags');

  // ---- greedy flag selection ----
  const presetNames = Object.keys(presets).filter((k) => presets[k].kind !== 'defence-variant' && !presets[k].sched);
  async function greedy(cells, start) { // cells: [{task, threat}] ; objective = mean over cells on TRAIN
    const score = async (cands) => { const cc = []; cands.forEach((fl, i) => cells.forEach((c) => cc.push({ key: `${i}|${c.task}|${c.threat}`, task: c.task, threat: c.threat, flags: fl, seeds: TRAIN })));
      const r = await evalMany(cc); return cands.map((_, i) => cells.reduce((a, c) => a + r[`${i}|${c.task}|${c.threat}`].mean, 0) / cells.length); };
    let cur = norm(start), [best] = await score([cur]); const path_ = [{ flags: cur, train: best }];
    for (let step = 0; step < 6; step++) {
      const cands = FLAGS.map((fl) => norm(cur.includes(fl) ? cur.filter((x) => x !== fl) : [...cur, fl]));
      const sc = await score(cands); let bi = -1, bv = best + 0.005;
      sc.forEach((v, i) => { if (v > bv) { bv = v; bi = i; } });
      if (bi < 0) break; cur = cands[bi]; best = bv; path_.push({ flags: cur, toggled: FLAGS[bi], train: bv });
    }
    return { flags: cur, train: best, path: path_ };
  }
  const selection = { task: {}, general: null };
  for (const task of MAIN) for (const threat of THREATS) {
    const starts = await evalMany(presetNames.map((k) => ({ key: k, task, threat, flags: presets[k].flags, seeds: TRAIN })));
    const startName = presetNames.reduce((a, b) => (starts[b].mean > starts[a].mean ? b : a));
    const g = await greedy([{ task, threat }], presets[startName].flags);
    selection.task[`${task}|${threat}`] = { start: startName, ...g }; log(`hybrid ${task} ${threat}: ${g.flags.join(',')}`);
  }
  {
    const cells = MAIN.flatMap((task) => THREATS.map((threat) => ({ task, threat })));
    const starts = await evalMany(presetNames.flatMap((k) => cells.map((c) => ({ key: `${k}|${c.task}|${c.threat}`, ...c, flags: presets[k].flags, seeds: TRAIN }))));
    const mean = (k) => cells.reduce((a, c) => a + starts[`${k}|${c.task}|${c.threat}`].mean, 0) / cells.length;
    const startName = presetNames.reduce((a, b) => (mean(b) > mean(a) ? b : a));
    selection.general = { start: startName, ...(await greedy(cells, presets[startName].flags)) }; log(`general hybrid: ${selection.general.flags.join(',')}`);
  }
  // ---- hybrids on test seeds ----
  const hyb = [];
  for (const [k, s] of Object.entries(selection.task)) { const [task, threat] = k.split('|'); hyb.push({ key: `${task}|${threat}|task-hybrid`, task, threat: +threat, flags: s.flags, seeds: TEST }); }
  for (const task of ALL) for (const threat of THREATS) hyb.push({ key: `${task}|${threat}|general-hybrid`, task, threat, flags: selection.general.flags, seeds: TEST });
  Object.assign(grid, await evalMany(hyb)); log('hybrids on test seeds');
  workers.forEach((w) => w.terminate());

  fs.writeFileSync(path.join(OUT, 'grid.json'), JSON.stringify({ presets, archetypes: A, grid, single, seeds: { test: [TEST[0], TEST.at(-1)], train: [TRAIN[0], TRAIN.at(-1)] } }, null, 1));
  fs.writeFileSync(path.join(OUT, 'selection.json'), JSON.stringify(selection, null, 1));
  log('written');
}
