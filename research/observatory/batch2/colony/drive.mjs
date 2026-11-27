// LI15 driver: runs one Colony team per (case, arm) through the lab bench of the local Colony app, with real agents (Pi,
// tools, shell, files) on a materialized repository, then scores the final code. Arms: `market` (Colony default: a
// parent that delegates to 4 ants talking by ant_send) and `field` (the same team with the field on: each ant owns its
// files, may change only those, and asks for what it needs with field_trace, delivered only to the owner).
// Usage: node observatory/batch2/colony/drive.mjs <config.json>   (config: out, k, seed0, cases, arms, model, capMinutes, parallel)
// Benches: by default the one of the Colony app on this Mac. With `endpoints` (a file, or COLONY_LAB_ENDPOINTS) the teams
// are spread over headless lab runtimes (Colony docs/lab-fleet.md): each entry is {name, url, tokenFile, work}, `work`
// being a folder this driver and that runtime both see at the same path; `perEndpoint` teams run on each at once.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { materialize } from './materialize.mjs';
import { score } from './evaluate.mjs';
import { jevFor } from './classifier.mjs';
import { exportRecord } from './record.mjs';

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const OUT = path.join(ROOT, 'results', cfg.out);
fs.mkdirSync(OUT, { recursive: true });
function localBench() {
  const SUPPORT = path.join(os.homedir(), 'Library', 'Application Support');
  const D = fs.readdirSync(SUPPORT).map((n) => path.join(SUPPORT, n)).filter((d) => fs.existsSync(path.join(d, 'lab-token.txt'))).sort((a, b) => fs.statSync(path.join(b, 'lab-token.txt')).mtimeMs - fs.statSync(path.join(a, 'lab-token.txt')).mtimeMs)[0];
  const port = (() => { try { return Number(new URL(JSON.parse(fs.readFileSync(path.join(D, 'local-web.json'), 'utf8')).url).port) + 2; } catch { return 4319; } })();
  return [{ name: 'app', url: `http://127.0.0.1:${port}`, tokenFile: path.join(D, 'lab-token.txt'), work: path.join(os.homedir(), 'li15-work'), slots: cfg.parallel || 2 }];
}
function benches(source = cfg.endpoints || process.env.COLONY_LAB_ENDPOINTS) {
  if (!source) return localBench();
  const list = Array.isArray(source) ? source : JSON.parse(fs.readFileSync(path.resolve(path.dirname(process.argv[2]), source), 'utf8'));
  return list.map((e) => { for (const key of ['url', 'tokenFile', 'work']) if (!e[key]) throw Error(`endpoint ${e.name || '?'} sem ${key}`); return { ...e, slots: e.slots || cfg.perEndpoint || 2 }; });
}
const BENCHES = benches();
// The token is read on every call: a headless runtime renews it in place, and an old copy would fail mid-study.
async function call(bench, route, body) {
  const token = fs.readFileSync(bench.tokenFile, 'utf8').trim();
  const r = await fetch(bench.url + route, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : null, signal: AbortSignal.timeout(120000) });
  const data = await r.json().catch(() => ({})); if (!r.ok) throw Error(`${bench.name} ${route}: ${data.error || r.status}`); return data;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (o) => { const line = JSON.stringify({ at: new Date().toISOString(), ...o }); fs.appendFileSync(path.join(OUT, 'run.log'), line + '\n'); console.log(line); };
const per = cfg.k / 4, files = (a) => Array.from({ length: per }, (_, j) => `src/m${a * per + j + 1}.js`);
// LI20: arms by configuration ({ name: { field: false | true | 'wait', antLimits, instructions } }); the default keeps LI15's two arms
const armSpec = (arm) => (cfg.armSpecs || {})[arm] || {};
for (const arm of cfg.arms) jevFor(cfg, arm); // a Jev arm without a pinned version fails before any run starts
const TASK = (k) => `Nesta pasta há um projeto JavaScript de ${k} módulos (src/m1.js a src/m${k}.js), cada um especificado em specs/ (leia o README.md). Implemente todos os módulos para que \`node test/run.mjs\` imprima "all checks pass". Trabalhe em equipe: crie exatamente 4 formigas operárias, uma para cada grupo de módulos: ${[0, 1, 2, 3].map((a) => `formiga ${a + 1}: ${files(a).join(', ')}`).join('; ')}. Você coordena e não escreve os módulos. Quando \`node test/run.mjs\` imprimir "all checks pass", responda com o resultado.`;

const LIVE = new Map(); // run -> bench name, for the runs this driver has live
const runOne = (bench, arm, i) => runOneInner(bench, arm, i).finally(() => LIVE.delete(`${cfg.out}-${arm}-s${cfg.seed0 + i}`));
async function runOneInner(bench, arm, i) {
  const seed = cfg.seed0 + i, run = `${cfg.out}-${arm}-s${seed}`, ws = path.join(bench.work, cfg.out, `${arm}-s${seed}`), rec = path.join(OUT, `${arm}-s${seed}.json`);
  if (fs.existsSync(rec)) return log({ run, skip: 'done' });
  LIVE.set(run, bench.name);
  const lab = (route, body) => call(bench, route, body);
  // a run that never got its record starts over: its old agents (and their history) go with the old workspace
  await lab('/lab/remove', { run }).catch(() => {});
  fs.rmSync(ws, { recursive: true, force: true }); const inst = materialize(cfg.k, seed, ws, cfg.shape);
  const [provider, ...rest] = cfg.model.split('/');
  await lab('/lab/create', { run, name: `${arm} k${cfg.k} s${seed} ${cfg.out}`, count: 1, workspace: ws, permission: cfg.permission || 'standard', model: { provider, model: rest.join('/') }, field: armSpec(arm).field ?? (arm === 'field'), antLimits: armSpec(arm).antLimits || cfg.antLimits || null, jev: jevFor(cfg, arm), instructions: armSpec(arm).instructions || cfg.instructions || null });
  // LI39 (cfg.pairing.logConcurrency): what else the runtime is doing when this run starts. Colony's /lab/list only
  // lists the agents of one run ({agents}, filtered by ?run=), so the other runs come from this driver's own registry
  // of live runs per bench and their agents from /lab/list?run=<other>. fleetPeak keeps the most seen at any poll.
  let fleetAtStart = null, fleetPeak = null;
  const fleetNow = async () => { const others = [...LIVE].filter(([r, b]) => r !== run && b === bench.name).map(([r]) => r); let agents = 0;
    for (const r of others) { try { agents += ((await lab('/lab/list?run=' + encodeURIComponent(r))).agents || []).length; } catch {} }
    return { bench: bench.name, otherRuns: others.length, agents }; };
  const notePeak = async () => { if (!cfg.pairing?.logConcurrency) return; const f = await fleetNow(); if (!fleetPeak || f.otherRuns > fleetPeak.otherRuns || f.agents > fleetPeak.agents) fleetPeak = { ...f, at: Date.now() }; };
  if (cfg.pairing?.logConcurrency) { await sleep(2000); fleetAtStart = await fleetNow(); fleetPeak = { ...fleetAtStart, at: Date.now() }; } // 2 s: a paired run started in the same instant is registered by then
  const t0 = Date.now(); await lab('/lab/say', { run, text: TASK(cfg.k) }); log({ run, bench: bench.name, started: true, fleetAtStart });
  let quietSince = null, last = null, resent = false;
  // LI31: a snapshot per poll (cfg.timeline): which module files changed and which checks failed, to count format pairs
  // where both sides changed at once and checks that passed and then failed again
  const timeline = [], snap = () => { if (!cfg.timeline) return; const files = Array.from({ length: cfg.k }, (_, m) => { try { return crypto.createHash('sha1').update(fs.readFileSync(path.join(ws, 'src', `m${m + 1}.js`))).digest('hex').slice(0, 10); } catch { return null; } });
    let fails = null; try { fails = JSON.parse(execFileSync(process.execPath, ['test/run.mjs', '--json'], { cwd: ws, timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] }).toString()).fails; } catch (e) { try { fails = JSON.parse(String(e.stdout || '')).fails; } catch { fails = null; } }
    timeline.push({ t: Date.now() - t0, files, fails }); };
  while (Date.now() - t0 < cfg.capMinutes * 60e3) {
    await sleep(15000);
    const { chats } = await lab('/lab/chats?run=' + encodeURIComponent(run));
    await notePeak();
    snap();
    const busy = chats.some((c) => ['running', 'transcribing'].includes(c.status)); last = chats;
    // the task message must have reached the team before silence means "done" (pilot: two teams created at the same
    // instant, one never received its message and was scored after 2 minutes of silence)
    // a turn in progress counts as started: the first message only enters the transcript when its turn ends
    const started = busy || chats.some((c) => (c.mensagens || []).length > 0) || chats.length > 1;
    if (!started) { if (Date.now() - t0 > 180000 && !resent) { resent = true; await lab('/lab/say', { run, text: TASK(cfg.k) }); log({ run, resent: true }); } continue; }
    if (busy) quietSince = null; else if (!quietSince) quietSince = Date.now(); else if (Date.now() - quietSince > (cfg.quietMs || 90000)) break;
  }
  const wall = Date.now() - t0, capped = wall >= cfg.capMinutes * 60e3;
  const exported = await lab('/lab/export?run=' + encodeURIComponent(run));
  const code = Array.from({ length: cfg.k }, (_, m) => { try { return fs.readFileSync(path.join(ws, 'src', `m${m + 1}.js`), 'utf8'); } catch { return ''; } });
  const s = score(inst, code, cfg.k, seed, cfg.shape);
  const { costUsd, calls, tokens, ...fromExport } = exportRecord(exported, jevFor(cfg, arm)); // record.mjs
  const result = { run, arm, seed, bench: bench.name, colony: cfg.colonyCommit || null, fleetAtStart, fleetPeak, startedAt: t0, wallMs: wall, capped, ...s, costUsd, calls, tokens,
    ...(cfg.timeline ? { timeline } : {}),
    ...fromExport };
  fs.writeFileSync(path.join(OUT, `${arm}-s${seed}.export.json`), JSON.stringify(exported));
  fs.writeFileSync(path.join(OUT, `${arm}-s${seed}.code.json`), JSON.stringify(code));
  fs.writeFileSync(rec, JSON.stringify(result, null, 1)); log({ done: run, solved: s.solved, holdout: s.holdout, failing: s.failing, wallMin: +(wall / 60e3).toFixed(1), capped });
  if (cfg.removeAfter !== false) await lab('/lab/remove', { run }).catch(() => {});
}
const slotList = BENCHES.flatMap((b) => Array.from({ length: b.slots }, () => b));
log({ benches: BENCHES.map((b) => ({ name: b.name, url: b.url, slots: b.slots })), pairing: cfg.pairing?.mode || 'free', slots: slotList.length });
if (cfg.pairing?.mode === 'simultaneous' && cfg.arms.length === 2) {
  // both arms of a seed begin at the same instant (the primary is in minutes, so a pair must share fleet conditions);
  // floor(slots/2) seeds run at once, each arm on its own slot. The two arms may land on different runtimes.
  const [A, B] = cfg.arms; let si = 0; const workers = Math.max(1, Math.floor(slotList.length / 2));
  await Promise.all(Array.from({ length: workers }, (_, w) => (async () => {
    const bA = slotList[(w * 2) % slotList.length], bB = slotList[(w * 2 + 1) % slotList.length];
    for (;;) { const i = si++; if (i >= cfg.cases) break;
      const run = (bench, arm) => runOne(bench, arm, i).catch((e) => log({ arm, case: i, bench: bench.name, error: String(e.message || e).slice(0, 200) }));
      await Promise.all([run(bA, A), run(bB, B)]); // started together
    }
  })()));
} else {
  const jobs = []; for (let i = 0; i < cfg.cases; i++) for (const arm of cfg.arms) jobs.push([arm, i]);
  let next = 0; log({ jobs: jobs.length });
  await Promise.all(slotList.map((bench) => (async () => { while (next < jobs.length) { const [arm, i] = jobs[next++]; try { await runOne(bench, arm, i); } catch (e) { log({ arm, case: i, bench: bench.name, error: String(e.message || e).slice(0, 200) }); } } })()));
}
log({ finished: true, mode: cfg.pairing?.mode || 'free' });
