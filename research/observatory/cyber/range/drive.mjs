// R0 bench driver (M3; the `run` the research bench calls as `node observatory/cyber/range/drive.mjs <spec>`; bench.mjs
// script-study contract). It takes the r0-pilot spec and runs the whole preregistered flow, writing one JSON record per
// episode to <out>/episodes/*-s<seed>.json (the name the bench counts). It is NOT run before the preregistration and the
// spec are on main in one PR (prereg; range/README.md): the bench only launches it after the merge. Nothing here runs an
// episode on import; a dry run with no episodes is `node drive.mjs <spec> --plan`.
//
// Flow (prereg "Baseline ... and action timing: separate episodes", "Pilot runs"):
//   1. baseline : 10 green-only episodes (no red, arm sleep, no blue action), seeds 76101-76110. Their sensor keys are
//                 frozen and hashed; the hash goes in frozen.json and the pilot uses the same lists. Since the refreeze
//                 of 2026-11-23 (canonical flow keys) the lists were frozen-lists-v2.json / frozen-v2.json; since the
//                 baseline redo (fixed harness, Cyber Research 2026-11-23) they are frozen-lists-v3.json / frozen-v3.json,
//                 and the first baseline with the v1/v2 lists is kept in archive-baseline-v2/ (archiveBaselineV2).
//   2. timing   : 5 green-only episodes, seeds 76201-76205. Each blue action is applied on a fixed schedule and its
//                 duration logged; these keys never enter the allow-lists. median Restore -> restoreSteps -> cooldowns.
//   3. pilot    : 3 arms x 3 seeds (76001-76003) x 3 repeats = 27 episodes, with the frozen lists and the cooldowns.
// Between 1 and 2 the idle diagnostic (seed 76901, not study data) checks its keys against the frozen lists, then the
// red diagnostic (seed 76902, red on, not study data) measures red's exec time and must overrun <= 2%; before
// every range the images are checked against the saved reference (ensureImages; Cyber Research, 2026-11-23).
// Containment (prereg "Pilot gate", "Stopping"): a canary from every host at the start and end of every episode; any
// success or positive-control failure writes STOP (canary.mjs/net.mjs) and the driver exits. At most one range is up at
// a time; each episode tears its range down.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { pkey, ckey, refreeze, freeze } from './sensors.mjs';
import { up, down, HOSTS, SERVICE_PORTS } from './range.mjs';
import { preflight, SUBNET, SEGMENTS, netName, stopFile } from './net.mjs';
import { canary, control, controlExec, icmpsockInfo } from './canary.mjs';
import { Mediator } from './mediator.mjs';
import { runEpisode, restoreSteps, cooldownFor, median, loadGate, MAX_LOAD1, MAX_LATE_FRAC } from './episode.mjs';
import { scheduleBlocks } from './green/green.mjs';

const routerIps = SEGMENTS.map((s) => SUBNET[s].replace(/\.0\/24$/, '.254'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sh = (c, a, o = {}) => spawnSync(c, a, { encoding: 'utf8', ...o });
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1) + '\n'); };
const token = () => 'r0h' + Math.random().toString(16).slice(2, 12);

// Containment record (gate item 1, Cyber Research review of PR #164): what every canary tested and reached, the positive
// control of the run day, and the leftover check after teardown. Pure.
export function summarizeCanary(results) {
  const rs = results || [];
  return { hosts: rs.length, targets: rs.reduce((n, r) => n + (r.targets || 0), 0), reached: rs.reduce((n, r) => n + (r.open?.length || 0), 0), at: rs[0]?.at || null };
}
// The positive controls run once per UTC run day (prereg "Pilot runs") and are logged in <out>/controls.jsonl; every
// episode record names the control of its day.
let CONTROLS = null; const controlsByDay = {};
function dayControl({ runControl = control, runControlExec = controlExec, now = () => new Date() } = {}) {
  const day = now().toISOString().slice(0, 10);
  if (!controlsByDay[day]) {
    const c = { day, at: now().toISOString(), canary: runControl(), exec: runControlExec(), icmpsock: icmpsockInfo() }; // a failure throws and writes STOP
    c.detected = !!(c.canary.detected > 0 && c.exec.tcp > 0 && c.exec.udpDns && c.exec.udpCanaryPort && c.exec.icmp > 0);
    controlsByDay[day] = c;
    if (CONTROLS) { fs.mkdirSync(path.dirname(CONTROLS), { recursive: true }); fs.appendFileSync(CONTROLS, JSON.stringify(c) + '\n'); }
  }
  const c = controlsByDay[day];
  return { day: c.day, at: c.at, detected: c.detected };
}

// Rule 4 settle (Cyber Research, 2026-11-23; a pre-data deviation in when the check is made, threshold unchanged):
// bringing up the range (19 containers under gVisor) itself lifts the 1-minute load above 2, so after up() and the
// start canary the driver waits up to SETTLE_MAX_MS for the 1-minute load to fall to <= MAX_LOAD1 before step 0. If it
// does not, the range goes down with the full leftovers check, nothing is recorded as an episode (not a harness
// failure either), the abort is logged in deviations.jsonl with its load curve, and the same seed is retried.
const SETTLE_MAX_MS = Number(process.env.R0_SETTLE_MAX_MS || 10 * 60e3);
export async function settle({ load = () => os.loadavg()[0], pollMs = 5000, maxMs = SETTLE_MAX_MS, sleepFn = sleep } = {}) {
  const t0 = Date.now(), curve = [];
  for (;;) {
    const l = load(), t = +((Date.now() - t0) / 1000).toFixed(1); curve.push({ t, load1: l });
    if (l <= MAX_LOAD1) return { ok: true, waitS: t, load1: l, curve };
    if (Date.now() - t0 >= maxMs) return { ok: false, waitS: t, load1: l, curve };
    await sleepFn(pollMs);
  }
}
// Condition 4: 3 consecutive settle aborts, or 3 on one seed, stop the queue (final): the threshold is then wrong for
// the range itself and Cyber Research decides.
const SETTLE_STOP = 3; let DEVIATIONS = null; const settleState = { consecutive: 0, bySeed: {} };

// Image restore (Cyber Research, 2026-11-23): the r0 images were deleted from benchhost twice by an unknown prune and rebuilt
// at 13:2x UTC; that build is the reference (R0_IMAGE_REF: {commit, tar, images: {name: id}, tarSha256}). Before every
// range (idle diagnostic, baseline, timing, pilot) the 6 images must exist with exactly the reference IDs. If one is
// missing or differs, the reference tar is checked against tarSha256 and `docker load`ed, and the IDs are checked again.
// Only if the tar is missing are the images rebuilt with images/build.sh, and the queue then stops (final): a rebuild can
// carry different packages and Cyber Research decides. Every restore goes to deviations.jsonl; any failure, or IDs that
// still differ, is a final error and no episode runs. The IDs used go into every record (rec.images).
// Since 2026-11-24 the reference is the labelled rebuild (Cyber Research, pre-data deviation): the 55cd240 reference is
// kept in archive/r0-images/superseded/.
export const IMAGE_REF_DEFAULT = '/srv/bench/archive/r0-images/r0-193a3af2eb24.json';
const IMAGE_REF = process.env.R0_IMAGE_REF || IMAGE_REF_DEFAULT;
const BUILD_SH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'images', 'build.sh');
const imageFinal = (m) => Object.assign(Error(`image restore: ${m}`), { final: true });
const dockerImageId = (name) => { const r = sh('docker', ['image', 'inspect', '--format', '{{.Id}}', name]); return r.status === 0 ? r.stdout.trim() : null; };
const dockerLoad = (tar) => { const r = sh('docker', ['load', '-i', tar], { maxBuffer: 1 << 26 }); return { ok: r.status === 0, out: String(r.stdout || '').trim().slice(-500), err: String(r.stderr || r.error?.message || '').trim().slice(-500) }; };
const buildImages = () => { const r = sh('sh', [BUILD_SH], { maxBuffer: 1 << 26 }); return { ok: r.status === 0, out: String(r.stdout || '').trim().slice(-500), err: String(r.stderr || r.error?.message || '').trim().slice(-500) }; };
const fileSha256 = (f) => { const h = crypto.createHash('sha256'), fd = fs.openSync(f, 'r'), b = Buffer.alloc(1 << 22); try { let n; while ((n = fs.readSync(fd, b, 0, b.length, null)) > 0) h.update(b.subarray(0, n)); } finally { fs.closeSync(fd); } return h.digest('hex'); };
export function ensureImages({ refPath = IMAGE_REF, inspect = dockerImageId, load = dockerLoad, build = buildImages, hashFile = fileSha256, exists = fs.existsSync, log = devLog, before = '' } = {}) {
  let ref;
  try { ref = JSON.parse(fs.readFileSync(refPath, 'utf8')); } catch (e) { throw imageFinal(`reference ${refPath} unreadable (${String(e.message).slice(0, 120)}); no episode`); }
  const names = Object.keys(ref.images || {});
  if (names.length !== 6) throw imageFinal(`reference ${refPath} lists ${names.length} images, expected 6; no episode`);
  const check = () => { const ids = Object.fromEntries(names.map((n) => [n, inspect(n)])); return { ids, bad: names.filter((n) => ids[n] !== ref.images[n]) }; };
  const summary = (ids, restored) => ({ ref: refPath, commit: ref.commit ?? null, ids, restored });
  const first = check();
  if (!first.bad.length) return summary(first.ids, false);
  const at = new Date().toISOString(), base = { at, before, ref: refPath, mismatched: first.bad, idsBefore: first.ids };
  if (!exists(ref.tar)) {
    const b = build(), after = check();
    log({ ...base, kind: 'image restore: reference tar missing; images rebuilt with images/build.sh; the queue stops before the next episode: a rebuild can carry different packages and Cyber Research decides', tar: ref.tar, build: b, idsAfter: after.ids, stillMismatched: after.bad });
    throw imageFinal(`reference tar ${ref.tar} missing; images rebuilt with images/build.sh (${b.ok ? 'build ok' : 'build failed'}; ${after.bad.length} of 6 IDs differ from the reference). A rebuild can carry different packages: the queue stops and Cyber Research must decide`);
  }
  const sha = hashFile(ref.tar);
  if (sha !== ref.tarSha256) {
    log({ ...base, kind: 'image restore failed: reference tar sha256 differs from tarSha256; not loaded; the queue stops', tar: ref.tar, tarSha256: sha, expected: ref.tarSha256 });
    throw imageFinal(`reference tar ${ref.tar} sha256 ${sha} != tarSha256 ${ref.tarSha256}; not loaded; no episode`);
  }
  const l = load(ref.tar), after = check();
  log({ ...base, kind: after.bad.length || !l.ok ? 'image restore failed: images still differ from the reference after docker load; the queue stops' : 'image restore: images missing or different; reference tar (sha256 verified) loaded; IDs match the reference', tar: ref.tar, tarSha256: sha, load: l, idsAfter: after.ids, stillMismatched: after.bad });
  if (!l.ok) throw imageFinal(`docker load -i ${ref.tar} failed: ${l.err}; no episode`);
  if (after.bad.length) throw imageFinal(`after docker load, ${after.bad.join(', ')} still differ from the reference; no episode`);
  return summary(after.ids, true);
}
let LAST_IMAGES = null; // the images of the range being run, for a harness-failure record

async function withRange(id, fn, { once = rangeOnce, waitLoadFn = waitLoad, log = devLog, images = ensureImages } = {}) {
  for (;;) {
    const img = LAST_IMAGES = images({ before: id }); // before every range; throws final on any failure
    const r = await once(id, fn);
    if (!r?.__settleAbort) {
      settleState.consecutive = 0;
      const target = r?.rec || r; if (target && typeof target === 'object') target.images = img;
      return r;
    }
    const a = r.__settleAbort; settleState.consecutive++; settleState.bySeed[id] = (settleState.bySeed[id] || 0) + 1;
    const seed = Number(String(id).match(/(\d+)$/)?.[1]) || null; // range ids are r0p<seed>
    log({ at: new Date().toISOString(), kind: 'settle abort: the range boot load did not fall to <= 2 within the settle cap; not an episode, same seed retried', range: id, seed, settleWaitS: a.waitS, load1: a.load1, curve: a.curve, step0Check: a.step0Check || null, leftovers: a.leftovers, consecutiveAborts: settleState.consecutive, seedAborts: settleState.bySeed[id] });
    if (settleState.consecutive >= SETTLE_STOP || settleState.bySeed[id] >= SETTLE_STOP)
      throw Object.assign(Error(`settle aborts: ${settleState.consecutive} in a row, ${settleState.bySeed[id]} on ${id}; the load threshold is wrong for the range itself: the queue stops and Cyber Research decides (rule 4, condition 4)`), { final: true });
    await waitLoadFn();
  }
}

// bring up a range, run fn(range, pods, router, key, tok), canary at start and end, tear down; returns fn's value with
// its containment record and settle wait attached (out.rec.containment, or out.containment), or { __settleAbort }.
async function rangeOnce(id, fn) {
  if (fs.existsSync(stopFile())) throw Object.assign(Error('STOP is set; the Research Leader decides before any episode'), { final: true });
  const ctl = dayControl();
  preflight(id);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-key-'));
  sh('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', path.join(dir, 'k')]);
  const key = fs.readFileSync(path.join(dir, 'k.pub'), 'utf8').trim();
  const { router, pods } = up(id, key);
  const own = SEGMENTS.map((s) => netName(id, s));
  let out, start, end, teardown, st, abort = null;
  try {
    // wait for sshd on the servers, then the start-of-episode canary (any success throws + writes STOP)
    const t0 = Date.now(); const P = Object.fromEntries(pods.map((p) => [p.host, p]));
    while (Date.now() - t0 < 60000 && sh('docker', ['exec', P.web.service, 'timeout', '2', 'bash', '-c', 'echo > /dev/tcp/127.0.0.1/2222']).status !== 0) await sleep(2000);
    start = summarizeCanary(canary([...pods.map((p) => ({ name: p.service, exec: true })), { name: router }], own));
    st = await settle(); // the range's own boot load settles before step 0
    if (!st.ok) abort = st;
    else {
      try { out = await fn(id, pods, router, path.join(dir, 'k'), token()); }
      catch (e) { if (!e.load) throw e; abort = { ...st, ok: false, step0Check: String(e.message) }; } // the step-0 check of runEpisode
      if (!abort) end = summarizeCanary(canary([...pods.map((p) => ({ name: p.service, exec: true })), { name: router }], own)); // end-of-episode canary
    }
  } finally { teardown = down(id); fs.rmSync(dir, { recursive: true, force: true }); } // down() throws if anything is left
  if (abort) return { __settleAbort: { ...abort, leftovers: { checked: true, containers: 0, networks: 0, removed: teardown.removed } } };
  const target = out?.rec || out;
  if (target) { target.settleWaitS = st.waitS; target.load1AtStep0 = out?.rec ? (out.rec.load1?.atStart ?? st.load1) : st.load1; }
  const containment = { canaryStart: start, canaryEnd: end, control: ctl, icmpsock: icmpsockInfo(), leftovers: { checked: true, containers: 0, networks: 0, removed: teardown.removed } };
  if (out?.rec) out.rec.containment = containment; else if (out) out.containment = containment;
  return out;
}

// Rule 4 (Cyber Research, 2026-11-22): an episode starts only with the 1-minute load at or below MAX_LOAD1. The driver
// waits for it (up to LOAD_WAIT_MS), then exits non-final so the bench retries later.
const LOAD_WAIT_MS = Number(process.env.R0_LOAD_WAIT_MS || 30 * 60e3);
async function waitLoad({ load = () => os.loadavg()[0], pollMs = 15000, maxMs = LOAD_WAIT_MS } = {}) {
  const t0 = Date.now();
  for (;;) { const g = loadGate(load()); if (g.ok) return g; if (Date.now() - t0 > maxMs) throw Error(`1-minute load ${g.load1.toFixed(2)} stayed above ${MAX_LOAD1} for ${Math.round(maxMs / 1000)} s: no episode started`); await sleep(pollMs); }
}
// Rule 3: an episode with more than 5% sensor-late steps is invalid and is rerun with the same seed. Every invalid
// attempt is kept (<name>.invalid<k>.json, which the bench does not count) and logged in deviations.jsonl.
const MAX_ATTEMPTS = Number(process.env.R0_MAX_ATTEMPTS || 3);
// Gate item 2: in the pilot, a harness failure (an error that is not a containment STOP) is not retried; it is recorded
// as the episode's record with its cause (harnessFailure, valid false, steps 0) and the driver goes on. The analysis
// counts it against the "at most 1 of 27" limit. Containment errors (final) still stop everything.
const CONTAINMENT_ERR = /STOP|CONTAINMENT|POSITIVE CONTROL|teardown left|leftover objects/;
async function episode(outDir, name, run, { waitLoad: wl = waitLoad, harness = null } = {}) {
  const file = path.join(outDir, 'episodes', `${name}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); // resume: already recorded
  for (let k = 1; k <= MAX_ATTEMPTS; k++) {
    await wl();
    let res; LAST_IMAGES = null;
    try { res = await run(); }
    catch (e) {
      if (!harness || e.final || CONTAINMENT_ERR.test(String(e.message))) throw e;
      const rec = { ...harness, at: new Date().toISOString(), steps: 0, valid: false, attempt: k, images: LAST_IMAGES, harnessFailure: { cause: String(e.message || e).slice(0, 500) } };
      writeJson(file, rec);
      fs.appendFileSync(path.join(outDir, 'deviations.jsonl'), JSON.stringify({ at: rec.at, episode: name, attempt: k, kind: 'harness failure: recorded, not retried', cause: rec.harnessFailure.cause }) + '\n');
      return rec;
    }
    if (res.rec.valid) { res.rec.attempt = k; writeJson(file, res.rec); res.rec._obs = res.obs; return res.rec; }
    writeJson(path.join(outDir, 'episodes', `${name}.invalid${k}.json`), res.rec);
    fs.appendFileSync(path.join(outDir, 'deviations.jsonl'), JSON.stringify({ at: new Date().toISOString(), episode: name, attempt: k, kind: 'sensor-late over 5%: rerun with the same seed', sensorLate: res.rec.sensorLate }) + '\n');
  }
  throw Error(`${name}: ${MAX_ATTEMPTS} attempts all invalid (sensor-late over 5%); stopping for a decision`);
}

// Baseline (redone with the fixed harness; Cyber Research, 2026-11-23, pre-data deviation motivated by the instrument,
// not the data): first the one-shot archive of the previous baseline (archiveBaselineV2: never twice, never deleting),
// then the 10 baseline episodes (recorded ones are resumed, never rerun), each checked against the green schedule rule
// (deferred + dropped <= 5% of planned, else a final stop), then the v3 lists frozen from their observations.
async function baseline(spec, outDir, { log = devLog, run = null, waitLoadFn = waitLoad } = {}) {
  archiveBaselineV2(outDir, { log });
  const allObs = [];
  for (const seed of spec.baselineSeeds) {
    const rec = await episode(outDir, `baseline-s${seed}`, run ? () => run(seed) : async () => { const r = await withRange(`r0p${seed}`, (range, pods, router, keyPath, tok) =>
      runEpisode({ range, seed, arm: 'sleep', pods, router, routerIps, frozen: null, steps: spec.steps, stepMs: spec.stepMs, keyPath, token: tok, noRed: true, collectObs: true })); r.rec.kind = 'baseline'; r.rec.obs = r.obs; return r; }, { waitLoad: waitLoadFn });
    const sb = scheduleBlocks(rec.greenSchedule);
    if (sb) throw Object.assign(Error(`baseline-s${seed}: ${sb}; the episode is recorded, the queue stops and Cyber Research decides`), { final: true });
    // the observations are kept in the baseline record so a resumed run freezes the same lists
    allObs.push(...(rec._obs || rec.obs || []));
  }
  return freezeV3(outDir, allObs, { log });
}

// One-shot archive of the previous baseline (Cyber Research, 2026-11-23). Layout, inside the study's data folder so
// the bench keeps it with the data, and outside results/r0-pilot/episodes so neither the bench's count nor analyze-r0
// (both read only the top level of episodes/) ever sees it:
//   results/r0-pilot/archive-baseline-v2/episodes/baseline-s761NN.json   (and any .invalid<k>.json of a baseline)
//   results/r0-pilot/archive-baseline-v2/{frozen.json, frozen-lists.json, frozen-v2.json, frozen-lists-v2.json}
// Files are MOVED (renamed, never deleted, never rewritten): the marker results/r0-pilot/baseline-redo-v3.json records
// the plan with the sha256 of every file BEFORE the first move; the sha256 after the move must match. The marker is
// written first (state "archiving"), so a crash mid-way resumes the SAME plan (never a new scan, which would move new
// baseline records); state "archived" makes every later call a no-op. The deviation line is written once, on that
// transition. A file found at both ends, or at neither, is a final error.
export const REDO = { marker: 'baseline-redo-v3.json', archive: 'archive-baseline-v2' };
const sha256File = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export function archiveBaselineV2(outDir, { log = devLog, now = () => new Date() } = {}) {
  const mk = path.join(outDir, REDO.marker);
  let m = fs.existsSync(mk) ? JSON.parse(fs.readFileSync(mk, 'utf8')) : null;
  if (m?.state === 'archived') return m;
  const final = (msg) => Object.assign(Error(`baseline redo archive: ${msg}; nothing deleted, Cyber Research decides`), { final: true });
  if (!m) {
    const ep = path.join(outDir, 'episodes'), plan = [];
    let names = []; try { names = fs.readdirSync(ep).filter((f) => /^baseline-s\d+(\.invalid\d+)?\.json$/.test(f)).sort(); } catch {}
    for (const f of names) plan.push({ from: path.join('episodes', f), to: path.join(REDO.archive, 'episodes', f) });
    for (const f of ['frozen.json', 'frozen-lists.json', 'frozen-v2.json', 'frozen-lists-v2.json']) if (fs.existsSync(path.join(outDir, f))) plan.push({ from: f, to: path.join(REDO.archive, f) });
    for (const x of plan) x.sha256 = sha256File(path.join(outDir, x.from));
    if (fs.existsSync(path.join(outDir, REDO.archive))) throw final(`${REDO.archive}/ exists without a marker`);
    m = { redo: 'baseline v3', decision: 'Cyber Research, 2026-11-23, pre-data deviation motivated by the instrument, not the data', state: 'archiving', startedAt: now().toISOString(), archive: REDO.archive, plan };
    fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(mk, JSON.stringify(m, null, 1) + '\n', { flag: 'wx' });
  }
  for (const x of m.plan) {
    const a = path.join(outDir, x.from), b = path.join(outDir, x.to), ea = fs.existsSync(a), eb = fs.existsSync(b);
    if (ea && eb) throw final(`${x.from} exists both in place and in the archive`);
    if (!ea && !eb) throw final(`${x.from} is neither in place nor in the archive`);
    if (ea) { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.renameSync(a, b); }
    if (sha256File(b) !== x.sha256) throw final(`${x.to} sha256 differs from the plan`);
  }
  m = { ...m, state: 'archived', archivedAt: now().toISOString() };
  fs.writeFileSync(mk, JSON.stringify(m, null, 1) + '\n');
  log({ at: m.archivedAt, kind: 'pre-data deviation (Cyber Research, 2026-11-23): the baseline is redone with the fixed harness (green after the sensor read with at most one action in flight per workstation; canonical flow keys; harness descendants excluded; reader error lines dropped); motivated by the instrument, not the data; the previous baseline records and the v1/v2 list files are archived (moved, sha256 checked, nothing deleted)', archive: REDO.archive, marker: REDO.marker, files: m.plan.length, episodes: m.plan.filter((x) => x.from.startsWith('episodes')).length });
  return m;
}

// Lists v3 (Cyber Research, 2026-11-23): frozen with freeze() from the redone baseline's recorded observations. Their
// flow keys are already canonical (the sensors canonicalise at parse time, with the source port), so they are taken as
// recorded: a refreeze through canonicalFlow without a source port would drop the keys the sensor itself emits unchanged.
// New files; once written they are only re-derived and checked (a different hash is a final error, never an overwrite).
export const FROZEN_V3 = { lists: 'frozen-lists-v3.json', summary: 'frozen-v3.json' };
export function freezeV3(outDir, observations, { log = devLog, now = () => new Date() } = {}) {
  const F = freeze(observations), lists = path.join(outDir, FROZEN_V3.lists), summ = path.join(outDir, FROZEN_V3.summary);
  if (fs.existsSync(lists)) {
    const prev = JSON.parse(fs.readFileSync(lists, 'utf8'));
    if (prev.sha256 !== F.sha256) throw Object.assign(Error(`v3 lists not reproducible: ${FROZEN_V3.lists} has ${prev.sha256}, the recorded baseline gives ${F.sha256}; nothing overwritten, Cyber Research decides`), { final: true });
    return prev;
  }
  const old = (f) => { try { return JSON.parse(fs.readFileSync(path.join(outDir, REDO.archive, f), 'utf8')).sha256 ?? null; } catch { return null; } };
  const at = now().toISOString();
  const summary = { version: 3, at, sha256: F.sha256, excludeSha256: F.excludeSha256,
    hosts: Object.fromEntries(Object.entries(F.lists).map(([h, L]) => [h, { procs: L.procs.length, flows: L.flows.length }])),
    from: 'the redone baseline (episodes/baseline-s76101..76110, fixed harness), its recorded observations as the sensor keyed them',
    decision: 'Cyber Research, 2026-11-23, pre-data deviation motivated by the instrument, not the data (the prereg is unchanged)',
    observations: (observations || []).length, previous: { v1Sha256: old('frozen.json'), v2Sha256: old('frozen-v2.json'), archive: REDO.archive } };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(lists, JSON.stringify(F), { flag: 'wx' });
  fs.writeFileSync(summ, JSON.stringify(summary, null, 1) + '\n', { flag: 'wx' });
  log({ at, kind: 'pre-data deviation (Cyber Research, 2026-11-23): allow-lists v3 frozen from the redone baseline (fixed harness); motivated by the instrument, not the data; the driver uses v3', v3Sha256: F.sha256, previous: summary.previous, observations: summary.observations, files: [FROZEN_V3.lists, FROZEN_V3.summary] });
  return F;
}

// Refreeze with canonical flow keys (Cyber Research, 2026-11-23, pre-data deviation; the prereg is unchanged): the
// allow-lists are frozen again from the RECORDED baseline observations (the baseline is not rerun) with sensors.mjs
// refreeze(), the same canonical function the sensors now use. Keys that cannot be canonicalised (no source port in
// the record) drop out; the drops per host, the v1 hash and the v2 hash are recorded. v2 goes to NEW files; the v1
// files (frozen.json, frozen-lists.json) are never written again. Once written, v2 is only re-derived and checked: a
// different hash is a final error, never an overwrite. The refreeze is logged once in deviations.jsonl.
export const FROZEN_V2 = { lists: 'frozen-lists-v2.json', summary: 'frozen-v2.json' };
export function freezeV2(outDir, observations, { svc = SERVICE_PORTS, log = devLog, now = () => new Date() } = {}) {
  const r = refreeze(observations, svc), lists = path.join(outDir, FROZEN_V2.lists), summ = path.join(outDir, FROZEN_V2.summary);
  if (fs.existsSync(lists)) {
    const prev = JSON.parse(fs.readFileSync(lists, 'utf8'));
    if (prev.sha256 !== r.frozen.sha256) throw Object.assign(Error(`refreeze not reproducible: ${FROZEN_V2.lists} has ${prev.sha256}, the recorded baseline gives ${r.frozen.sha256}; nothing overwritten, Cyber Research decides`), { final: true });
    return prev;
  }
  const v1 = (() => { try { return JSON.parse(fs.readFileSync(path.join(outDir, 'frozen.json'), 'utf8')); } catch { return null; } })();
  const at = now().toISOString(), F = r.frozen;
  const droppedTotal = Object.values(r.droppedByHost).reduce((a, b) => a + b, 0);
  const summary = { version: 2, at, sha256: F.sha256, excludeSha256: F.excludeSha256,
    hosts: Object.fromEntries(Object.entries(F.lists).map(([h, L]) => [h, { procs: L.procs.length, flows: L.flows.length }])),
    refreeze: { decision: 'Cyber Research, 2026-11-23, pre-data deviation (the prereg is unchanged)', from: 'recorded baseline observations (episodes/baseline-s*.json obs); the baseline was not rerun',
      rule: 'flow key = client -> server:service-port when one side uses a declared TCP service port of its host (sensors.mjs canonicalFlow); a recorded key has no source port, so a key whose port is not a service port of its destination cannot be canonicalised and drops out; process keys unchanged',
      servicePorts: svc, observations: (observations || []).length, v1Sha256: v1?.sha256 ?? null, v1Files: ['frozen.json', 'frozen-lists.json'], v2Sha256: F.sha256, droppedByHost: r.droppedByHost, droppedTotal, droppedKeys: r.droppedKeys } };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(lists, JSON.stringify(F), { flag: 'wx' });
  fs.writeFileSync(summ, JSON.stringify(summary, null, 1) + '\n', { flag: 'wx' });
  log({ at, kind: 'pre-data deviation (Cyber Research, 2026-11-23): allow-lists refrozen from the recorded baseline observations with canonical flow keys (client -> server:service-port); the baseline was not rerun; v1 files kept unchanged; the driver uses v2', v1Sha256: v1?.sha256 ?? null, v2Sha256: F.sha256, droppedByHost: r.droppedByHost, droppedTotal, files: [FROZEN_V2.lists, FROZEN_V2.summary] });
  return F;
}
// The recorded baseline observations, for a refreeze without any range (all baseline episodes must be recorded).
export function recordedBaselineObs(spec, outDir) {
  const allObs = [];
  for (const seed of spec.baselineSeeds) {
    const f = path.join(outDir, 'episodes', `baseline-s${seed}.json`);
    if (!fs.existsSync(f)) throw Object.assign(Error(`${f} is not recorded: the refreeze needs every baseline episode`), { final: true });
    allObs.push(...(JSON.parse(fs.readFileSync(f, 'utf8')).obs || []));
  }
  return allObs;
}

// timing episodes: apply each action once on a fixed schedule, log its duration; keys never enter the lists.
async function timing(spec, outDir) {
  const durs = { Restore: [], Remove: [], Analyse: [], Block: [], Allow: [] };
  for (const seed of spec.timingSeeds) {
    // resume: a recorded timing episode is reused (its durations count), never rerun or overwritten
    const done = path.join(outDir, 'episodes', `timing-s${seed}.json`);
    if (fs.existsSync(done)) { for (const a of JSON.parse(fs.readFileSync(done, 'utf8')).actions || []) durs[a.action]?.push(a.ms); continue; }
    await waitLoad();
    const rec = await withRange(`r0p${seed}`, async (range, pods, router, keyPath, tok) => {
      const med = new Mediator({ range, pods, router, token: tok });
      const log = [];
      // a short green-free schedule: Analyse web, Remove web, Block user-dmz, Allow user-dmz, Restore web
      log.push(med.analyse('web')); log.push(med.remove('web'));
      log.push(med.block('user', 'dmz')); log.push(med.allow('user', 'dmz'));
      log.push(med.restore('web'));
      for (const a of log) durs[a.action].push(a.ms);
      return { kind: 'timing', seed, actions: log };
    });
    writeJson(path.join(outDir, 'episodes', `timing-s${seed}.json`), rec);
  }
  const medianRestore = median(durs.Restore);
  const rs = restoreSteps(medianRestore, spec.stepMs);
  const timingOut = { medianRestoreMs: medianRestore, restoreSteps: rs, reactCooldownSteps: cooldownFor('react', rs), disinfectCooldownSteps: cooldownFor('disinfect-cd10', rs), durationsMs: Object.fromEntries(Object.entries(durs).map(([k, v]) => [k, { median: median(v), n: v.length }])) };
  writeJson(path.join(outDir, 'timing.json'), timingOut);
  return timingOut;
}

// Scheduling (Cyber Research, instrument rule (c), 2026-11-23): pilot episodes run with no other study in its run stage
// on benchhost. Before each pilot episode the queue holds while another bench study is in stage "run"; a study that starts
// mid-episode does not abort it (the check is only between episodes). Pauses are logged in deviations.jsonl. No
// threshold, step or gate changes and no data is discarded. Baseline and timing episodes are not held.
const BENCH_STATE = process.env.BENCH_STATE || '/srv/bench/state.json';
const SELF = process.env.R0_STUDY_KEY || 'r0-pilot';
export function othersRunning(state, self = SELF) { return Object.values(state?.studies || {}).filter((s) => s.key !== self && s.stage === 'run').map((s) => s.key); }
const devLog = (d) => { if (DEVIATIONS) { fs.mkdirSync(path.dirname(DEVIATIONS), { recursive: true }); fs.appendFileSync(DEVIATIONS, JSON.stringify(d) + '\n'); } };
async function exclusive({ read = () => JSON.parse(fs.readFileSync(BENCH_STATE, 'utf8')), pollMs = 60e3, log = devLog, before = '', sleepFn = sleep } = {}) {
  const others = () => { try { return othersRunning(read()); } catch (e) { return [`bench state unreadable: ${String(e.message).slice(0, 80)}`]; } };
  let o = others(); if (!o.length) return { waitedS: 0 };
  const t0 = Date.now();
  log({ at: new Date().toISOString(), kind: 'pilot pause: another study is in its run stage on benchhost (instrument rule c); scheduling only, nothing discarded', before, others: o });
  while ((o = others()).length) await sleepFn(pollMs);
  const waitedS = Math.round((Date.now() - t0) / 1000);
  log({ at: new Date().toISOString(), kind: 'pilot resume', before, waitedS });
  return { waitedS };
}

// Diagnostic (Cyber Research, 2026-11-23): once, before the pilot block, with benchhost otherwise idle, one green-only
// episode on the non-prereg seed 76901 measures the step time without parallel load. It is written outside the
// study's data (R0_DIAG_DIR), is never an episode record and is never read by analyze-r0.
const DIAG_DIR = process.env.R0_DIAG_DIR || '/srv/bench/archive/r0-diagnostics';
export function stepStats(stepLog, stepMs) {
  const ms = stepLog.map((s) => s.ms).filter((x) => typeof x === 'number').sort((a, b) => a - b);
  const q = (p) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] : null);
  return { steps: ms.length, medianMs: q(0.5), p95Ms: q(0.95), maxMs: ms.length ? ms[ms.length - 1] : null, overrunRate: stepLog.length ? stepLog.filter((s) => s.overrun).length / stepLog.length : null, overrunOverMs: Math.round(stepMs * 1.1) };
}
// List check (Cyber Research, 2026-11-23): the diagnostic runs after baseline() froze the lists, collects its
// observations and reports, per host, the process and connection keys (sensors.mjs pkey/ckey, as freeze() builds them)
// that are not in the frozen allow-lists. Any such key stops the queue before the pilot (final): the restored images
// must still behave like the ones the baseline ran on. v3 file name (after the async green and the v2 lists of
// 2026-11-23): never confused with an earlier diagnostic, which is kept.
export function keysOutside(observations, frozen) {
  const hosts = {}, uniq = (a) => [...new Set(a)].sort();
  for (const obs of observations || []) for (const [h, o] of Object.entries(obs.hosts || {})) {
    const L = frozen?.lists?.[h] || { procs: [], flows: [] }, H = (hosts[h] ||= { procs: [], conns: [] });
    H.procs.push(...(o.procs || []).map(pkey).filter((k) => !L.procs.includes(k)));
    H.conns.push(...(o.conns || []).map(ckey).filter((k) => !L.flows.includes(k)));
  }
  const out = {}; let total = 0;
  for (const h of Object.keys(hosts).sort()) {
    const procKeys = uniq(hosts[h].procs), connKeys = uniq(hosts[h].conns);
    out[h] = { procs: procKeys.length, conns: connKeys.length, procKeys, connKeys }; total += procKeys.length + connKeys.length;
  }
  return { total, frozenSha256: frozen?.sha256 ?? null, steps: (observations || []).length, hosts: out };
}
export const DIAG_VERSION = 4;
export const diagFile = (dir = DIAG_DIR, seed = 76901) => path.join(dir, `idle-s${seed}-v${DIAG_VERSION}.json`);
// What a diagnostic keeps of its episode (Cyber Research, 2026-11-23): v3 kept only aggregates, so its 11% sensor-late
// could not be split by host or stream. Per step: step and sensor time, each host's read time and state, green in flight
// and launched, the load and the reader's dropped error lines; plus every stream's timeouts and late replies and the
// green action durations. Outside the study data, like the diagnostic itself. Pure.
export function diagDetail(r) {
  return {
    perStep: (r?.stepLog || []).map((s) => ({ step: s.step, ms: s.ms, sensorMs: s.sensorMs, sensorLate: s.sensorLate, sensorTiming: s.sensorTiming ?? null, hosts: s.hosts,
      greenInFlight: s.greenInFlight, greenLaunched: s.greenLaunched, load1: s.load1, redMs: s.redMs ?? null, procErrors: s.procErrors?.total ?? null })),
    streamStats: r?.rec?.streamStats ?? null, greenSchedule: r?.rec?.greenSchedule ?? null, procErrors: r?.rec?.procErrors?.byHost ?? null,
    greenMs: fieldStats((r?.rec?.greenLog || []), 'ms'),
    greenActions: (r?.rec?.greenLog || []).map((g) => ({ step: g.step, ws: g.ws, kind: g.kind, ok: g.ok, ms: g.ms, doneStep: g.doneStep })),
  };
}
// per-step numbers of a step log (median, p95, max), e.g. greenInFlight or redMs. Pure.
export function fieldStats(stepLog, field) {
  const xs = (stepLog || []).map((s) => s[field]).filter((x) => typeof x === 'number').sort((a, b) => a - b);
  const q = (p) => (xs.length ? xs[Math.min(xs.length - 1, Math.floor(p * xs.length))] : null);
  return { n: xs.length, median: q(0.5), p95: q(0.95), max: xs.length ? xs[xs.length - 1] : null };
}
async function idleDiagnostic(spec, { seed = 76901, frozen = null, dir = DIAG_DIR, withRangeFn = withRange, waitLoadFn = waitLoad } = {}) {
  if (path.resolve(dir).split(path.sep).includes('results')) throw Object.assign(Error(`diagnostic dir ${dir} is inside results/: the diagnostic is never study data`), { final: true });
  const file = diagFile(dir, seed);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!frozen?.lists) throw Object.assign(Error('idle diagnostic needs the frozen lists: baseline() runs first'), { final: true });
  await waitLoadFn();
  const diagLog = path.join(dir, `idle-s${seed}-v${DIAG_VERSION}.deviations.jsonl`), log = (d) => { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(diagLog, JSON.stringify(d) + '\n'); };
  const r = await withRangeFn(`r0p${seed}`, (range, pods, router, keyPath, tok) =>
    runEpisode({ range, seed, arm: 'sleep', pods, router, routerIps, frozen: null, steps: spec.steps, stepMs: spec.stepMs, keyPath, token: tok, noRed: true, collectObs: true }), { log });
  const out = { diagnostic: 'idle step time and list check; not an episode of the pilot and never analysed by analyze-r0', version: DIAG_VERSION, at: new Date().toISOString(), seed, stepMs: spec.stepMs,
    ...stepStats(r.stepLog, spec.stepMs), greenInFlight: fieldStats(r.stepLog, 'greenInFlight'), green: r.rec.green ?? null, load1: r.rec.load1, settleWaitS: r.rec.settleWaitS, load1AtStep0: r.rec.load1AtStep0, sensorLate: r.rec.sensorLate, containment: r.rec.containment,
    images: r.rec.images ?? null, keysOutside: keysOutside(r.obs, frozen), ...diagDetail(r) };
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  return out;
}

// Red exec-time diagnostic (Cyber Research, 2026-11-23): red stays synchronous inside the step clock (red -> sensor
// matters for time-to-detect); this measures what it costs. One episode with red on (arm sleep, no blue action) on the
// non-prereg seed 76902, written to the diagnostics folder, never to results/r0-pilot, never read by analyze-r0. Since
// Cyber Research's decision of 2026-11-23 (pre-data deviation) it is a step of the flow: after the idle diagnostic v3
// passed and before timing; its step overrun must be <= 2% (redDiagBlocks) or the queue stops (final) before timing and
// the pilot. The 15-minute load gate, rule 4 and ensureImages run before its range, as for every range. It can also be
// run alone: `node drive.mjs <spec> --red-diagnostic` (idempotent: a recorded file is reused, never rerun).
export const redDiagFile = (dir = DIAG_DIR, seed = 76902) => path.join(dir, `red-s${seed}-v1.json`);
async function redDiagnostic(spec, { seed = 76902, dir = DIAG_DIR, withRangeFn = withRange, waitLoadFn = waitLoad, load15Fn = waitLoad15 } = {}) {
  if (path.resolve(dir).split(path.sep).includes('results')) throw Object.assign(Error(`diagnostic dir ${dir} is inside results/: the diagnostic is never study data`), { final: true });
  const file = redDiagFile(dir, seed);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const diagLog = path.join(dir, `red-s${seed}-v1.deviations.jsonl`), log = (d) => { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(diagLog, JSON.stringify(d) + '\n'); };
  await load15Fn({ before: `red diagnostic s${seed}`, log });
  await waitLoadFn();
  const r = await withRangeFn(`r0p${seed}`, (range, pods, router, keyPath, tok) =>
    runEpisode({ range, seed, arm: 'sleep', pods, router, routerIps, frozen: null, steps: spec.steps, stepMs: spec.stepMs, keyPath, token: tok }), { log, images: (o) => ensureImages({ ...o, log }) });
  const acted = new Set((r.rec.redLog || []).map((x) => x.step));
  const out = { diagnostic: 'red exec time per step (red on, arm sleep, no blue action); not an episode of the pilot and never analysed by analyze-r0', version: 1, at: new Date().toISOString(), seed, stepMs: spec.stepMs,
    redMs: fieldStats(r.stepLog, 'redMs'), redMsActingSteps: fieldStats(r.stepLog.filter((s) => acted.has(s.step)), 'redMs'), redActingSteps: [...acted].sort((a, b) => a - b),
    step: stepStats(r.stepLog, spec.stepMs), greenInFlight: fieldStats(r.stepLog, 'greenInFlight'), red: r.rec.red, green: r.rec.green,
    load1: r.rec.load1, settleWaitS: r.rec.settleWaitS, load1AtStep0: r.rec.load1AtStep0, sensorLate: r.rec.sensorLate, containment: r.rec.containment, images: r.rec.images ?? null,
    ...diagDetail(r) };
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  return out;
}

// Measured scheduling (Cyber Research, 2026-11-23, replaces the exclusive rule (c) as the default; spec rule, pre-data):
// before each pilot episode the 15-minute load must be <= MAX_LOAD15, whatever its source (study, CI, build); rule 4 is
// unchanged. Every pilot record carries the bench studies in their run stage at start and end and the load during the
// episode. Circuit breaker: a pilot episode that closes with overrunRate > BREAKER_OVERRUN while another study was in its
// run stage switches the rest of the pilot back to the exclusive rule (c) (persisted in schedule.json) and is logged;
// the recorded episode stands as it is.
export const MAX_LOAD15 = 1.0, BREAKER_OVERRUN = 0.01, DIAG_MAX_OVERRUN = 0.02;
const LOAD15_WAIT_POLL = 30e3;
async function waitLoad15({ load15 = () => os.loadavg()[2], max = MAX_LOAD15, pollMs = LOAD15_WAIT_POLL, log = devLog, before = '', sleepFn = sleep } = {}) {
  let l = load15(); if (l <= max) return { waitedS: 0, load15: l };
  const t0 = Date.now();
  log({ at: new Date().toISOString(), kind: 'pilot pause: 15-minute load above the measured scheduling limit; scheduling only, nothing discarded', before, load15: l, max });
  while ((l = load15()) > max) await sleepFn(pollMs);
  const waitedS = Math.round((Date.now() - t0) / 1000);
  log({ at: new Date().toISOString(), kind: 'pilot resume (15-minute load)', before, waitedS, load15: l });
  return { waitedS, load15: l };
}
const readOthers = () => { try { return othersRunning(JSON.parse(fs.readFileSync(BENCH_STATE, 'utf8'))); } catch (e) { return [`bench state unreadable: ${String(e.message).slice(0, 80)}`]; } };
export function breakerTrips(rec, max = BREAKER_OVERRUN) {
  const others = [...(rec?.schedule?.othersAtStart || []), ...(rec?.schedule?.othersAtEnd || [])];
  return !rec?.harnessFailure && typeof rec?.overrunRate === 'number' && rec.overrunRate > max && others.length > 0;
}
export function diagnosticBlocks(diag, max = DIAG_MAX_OVERRUN) { return !diag || typeof diag.overrunRate !== 'number' || diag.overrunRate > max; }
// The idle diagnostic's two criteria (overrun <= 2%, 0 keys outside the lists): throws final when either fails.
// v4 criteria (Cyber Research, 2026-11-23): overrun <= 2%, sensor-late <= 5% of steps, 0 keys outside the v3 lists,
// green deferred + dropped <= 5% of planned. A missing field fails its criterion.
export function idleGate(diag, what = 'the pilot does not start') {
  const stop = (m) => { throw Object.assign(Error(`idle diagnostic ${m}; ${what} and Cyber Research decides`), { final: true }); };
  if (diagnosticBlocks(diag)) stop(`overrun ${diag?.overrunRate} > ${DIAG_MAX_OVERRUN}: the range itself overruns`);
  const lf = diag?.sensorLate?.lateFrac;
  if (typeof lf !== 'number' || lf > MAX_LATE_FRAC) stop(`sensor-late ${lf ?? 'missing'} > ${MAX_LATE_FRAC} of steps`);
  const ko = keysOutsideBlocks(diag);
  if (ko) stop(`list check: ${ko}; the restored images may not match the baseline`);
  const sb = scheduleBlocks(diag?.greenSchedule);
  if (sb) stop(`green schedule: ${sb}`);
}
// The red diagnostic's criterion: null when its step overrun is <= 2%; otherwise the reason with red's exec times.
export function redDiagBlocks(d, max = DIAG_MAX_OVERRUN) {
  const r = d?.step?.overrunRate, ms = (x) => (x == null ? 'n/a' : `${x} ms`);
  if (typeof r === 'number' && r <= max) return null;
  return `red diagnostic (seed ${d?.seed ?? 76902}, red on) step overrun ${typeof r === 'number' ? r : 'missing'} > ${max}: redMs median ${ms(d?.redMs?.median)}, p95 ${ms(d?.redMs?.p95)}, max ${ms(d?.redMs?.max)} over all steps` +
    `; on the ${d?.redMsActingSteps?.n ?? 0} steps red acted: median ${ms(d?.redMsActingSteps?.median)}, p95 ${ms(d?.redMsActingSteps?.p95)}, max ${ms(d?.redMsActingSteps?.max)} (${redDiagFile()})`;
}
// null when the diagnostic's list check passed (0 keys outside); otherwise the reason, with every key outside
export function keysOutsideBlocks(diag) {
  const k = diag?.keysOutside;
  if (!k || typeof k.total !== 'number') return 'no list check in the diagnostic';
  if (k.total === 0) return null;
  const list = Object.entries(k.hosts).filter(([, v]) => v.procs || v.conns).map(([h, v]) => `${h}: ${v.procs} process [${v.procKeys.join('; ')}], ${v.conns} connection [${v.connKeys.join('; ')}]`);
  return `${k.total} keys outside the frozen lists: ${list.join(' / ')}`;
}

async function pilot(spec, outDir, frozen, timingOut, { exclusiveFn = exclusive, load15Fn = waitLoad15, diagnosticFn = idleDiagnostic, others = readOthers, run = null, log = devLog } = {}) {
  // item 1: the idle diagnostic must show <= 2% overrun before any pilot episode; otherwise the range itself is the problem
  // list check: any key outside the frozen lists in the idle diagnostic stops the queue before the pilot
  idleGate(await diagnosticFn(spec, { frozen }));
  const schedFile = path.join(outDir, 'schedule.json');
  const mode = () => { try { return JSON.parse(fs.readFileSync(schedFile, 'utf8')).mode; } catch { return 'load15'; } };
  for (const arm of spec.arms) for (const seed of spec.pilotSeeds) for (let rep = 1; rep <= spec.repeats; rep++) {
    const name = `${arm}-rep${rep}-s${seed}`, file = path.join(outDir, 'episodes', `${name}.json`);
    if (fs.existsSync(file)) continue;
    if (mode() === 'exclusive') await exclusiveFn({ before: name });
    const gate = await load15Fn({ before: name });
    const othersAtStart = others(), sched = { mode: mode(), othersAtStart, load15AtStart: gate.load15 };
    let rec;
    if (run) rec = await run(name, sched); // tests only
    else {
      const cd = cooldownFor(arm, timingOut.restoreSteps);
      rec = await episode(outDir, name, async () => { const r = await withRange(`r0p${seed}`, (range, pods, router, keyPath, tok) =>
        runEpisode({ range, seed, arm, pods, router, routerIps, frozen, cooldownSteps: cd, steps: spec.steps, stepMs: spec.stepMs, keyPath, token: tok }));
        Object.assign(r.rec, { kind: 'pilot', repeat: rep, cooldownSteps: cd, restoreSteps: timingOut.restoreSteps, schedule: { ...sched, othersAtEnd: others() } });
        r.rec.loadDuringEpisode = { median: r.rec.load1?.median ?? null, max: r.rec.load1?.max ?? null }; return r; },
        { harness: { kind: 'pilot', arm, seed, repeat: rep, stepMs: spec.stepMs } });
    }
    if (mode() !== 'exclusive' && breakerTrips(rec)) {
      fs.writeFileSync(schedFile, JSON.stringify({ mode: 'exclusive', at: new Date().toISOString(), trippedBy: name, overrunRate: rec.overrunRate, others: rec.schedule }, null, 1) + '\n');
      log({ at: new Date().toISOString(), kind: 'circuit breaker: a pilot episode overran > 1% while another study ran; the rest of the pilot goes back to the exclusive rule (c); the recorded episode stands, nothing discarded; Cyber Research to be told', episode: name, overrunRate: rec.overrunRate, schedule: rec.schedule });
    }
  }
}

export async function main(specPath, { plan = false, mode = null, fns = {} } = {}) {
  const F = { ensureImages, dayControl, baseline, waitLoad15, idleDiagnostic, timing, pilot, redDiagnostic, ...fns }; // fns: tests only
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const s = { steps: 300, stepMs: 2000, repeats: 3,
    baselineSeeds: spec.baselineSeeds || range(76101, 76110), timingSeeds: spec.timingSeeds || range(76201, 76205),
    pilotSeeds: spec.pilotSeeds || range(76001, 76003), arms: spec.arms, ...spec };
  const outDir = spec.out.startsWith('results/') ? spec.out : `results/${spec.out}`;
  if (plan) { const expected = s.baselineSeeds.length + s.timingSeeds.length + s.arms.length * s.pilotSeeds.length * s.repeats; console.log(JSON.stringify({ outDir, expected, ...s }, null, 1)); return 0; }
  // operator-only modes, never part of the flow below: the refreeze from the recorded baseline (no range), and the red
  // exec-time diagnostic (one range, outside the study data; no controls or deviations are written to results/)
  if (mode === 'refreeze' && fs.existsSync(path.join(outDir, REDO.marker))) throw Object.assign(Error(`--refreeze (v2 from the first baseline) is superseded by the baseline redo (${REDO.marker}); the v3 lists are frozen by the baseline step`), { final: true });
  if (mode === 'refreeze') { DEVIATIONS = path.join(outDir, 'deviations.jsonl'); const f = freezeV2(outDir, recordedBaselineObs(s, outDir)); console.log(JSON.stringify(JSON.parse(fs.readFileSync(path.join(outDir, FROZEN_V2.summary), 'utf8')), null, 1)); return f ? 0 : 1; }
  if (mode === 'red-diagnostic') { const d = await F.redDiagnostic(s); console.log(JSON.stringify({ redMs: d.redMs, redMsActingSteps: d.redMsActingSteps, step: d.step }, null, 1)); return 0; }
  // once per run day: the positive controls (prereg "Pilot runs"), logged and named in every episode record
  // the images first (Cyber Research, 2026-11-23): the day's positive controls run containers from r0-nettool:m1 and
  // r0-base:m1, so a pruned image is restored (and logged in deviations.jsonl) before them; a failure is final and no
  // control runs. Every later control runs inside withRange, which checks the images before the range.
  CONTROLS = path.join(outDir, 'controls.jsonl'); DEVIATIONS = path.join(outDir, 'deviations.jsonl');
  F.ensureImages({ before: 'day control' }); F.dayControl();
  // order (Cyber Research, 2026-11-23): baseline first (it resumes recorded episodes and freezes the v2 lists), then the
  // idle diagnostic v3 with its list check against those lists (under the 15-minute load limit; idempotent); only if it
  // passed (overrun <= 2%, 0 keys outside the lists), the red diagnostic (seed 76902, outside the data; its overrun must
  // be <= 2%); then timing, then the pilot (which checks the idle diagnostic again). Any failed criterion is final.
  const frozen = await F.baseline(s, outDir);
  if (!fs.existsSync(diagFile())) await F.waitLoad15({ before: 'idle diagnostic s76901' });
  idleGate(await F.idleDiagnostic(s, { frozen }), 'the red diagnostic, timing and the pilot do not start');
  const rb = redDiagBlocks(await F.redDiagnostic(s));
  if (rb) throw Object.assign(Error(`${rb}; timing and the pilot do not start and Cyber Research decides`), { final: true });
  const timingOut = await F.timing(s, outDir);
  await F.pilot(s, outDir, frozen, timingOut);
  return 0;
}
export const _test = { episode, waitLoad, dayControl, summarizeCanary, withRange, settle, settleState, exclusive, pilot, waitLoad15, timing, idleDiagnostic, baseline, redDiagnostic };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

if (import.meta.url === `file://${process.argv[1]}`) {
  const spec = process.argv[2], plan = process.argv.includes('--plan');
  const mode = process.argv.includes('--refreeze') ? 'refreeze' : process.argv.includes('--red-diagnostic') ? 'red-diagnostic' : null;
  if (!spec) { console.error('usage: node drive.mjs <spec.json> [--plan | --refreeze | --red-diagnostic]'); process.exit(2); }
  main(spec, { plan, mode }).then((c) => process.exit(c), (e) => { console.error(String(e.message || e)); process.exit(e.final ? 3 : 1); });
}
