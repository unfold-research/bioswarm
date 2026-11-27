// Unit tests of the driver's validity rerun and load wait (rules 3 and 4; no Docker, no episode): node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const PASS_IDLE = { overrunRate: 0.01, keysOutside: { total: 0, hosts: {} }, sensorLate: { lateSteps: 0, lateFrac: 0, valid: true }, greenSchedule: { planned: 400, executed: 400, deferred: 0, dropped: 0 } }, PASS_RED = { seed: 76902, step: { overrunRate: 0.02 }, redMs: { median: 1, p95: 2, max: 3 } };
import { _test, othersRunning, stepStats, breakerTrips, diagnosticBlocks, ensureImages, keysOutside, keysOutsideBlocks, diagFile, main, redDiagBlocks, idleGate, freezeV2, recordedBaselineObs, FROZEN_V2, redDiagFile, fieldStats, diagDetail, archiveBaselineV2, IMAGE_REF_DEFAULT } from './drive.mjs';
import crypto from 'node:crypto';
import { SERVICE_PORTS } from './range.mjs';

test('rule 3: an invalid episode is rerun with the same seed, kept as .invalid<k> and logged as a deviation', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-drive-'));
  try {
    let n = 0;
    const rec = await _test.episode(dir, 'react-rep1-s76001', async () => { n++; return { rec: { seed: 76001, valid: n === 2, sensorLate: { lateFrac: n === 2 ? 0 : 0.1 } }, obs: [] }; }, { waitLoad: async () => {} });
    assert.equal(n, 2); assert.equal(rec.attempt, 2);
    const files = fs.readdirSync(path.join(dir, 'episodes')).sort();
    assert.deepEqual(files, ['react-rep1-s76001.invalid1.json', 'react-rep1-s76001.json']);
    assert.ok(!/-s\d+\.json$/.test('react-rep1-s76001.invalid1.json'), 'the bench does not count an invalid attempt');
    const dev = fs.readFileSync(path.join(dir, 'deviations.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(dev.length, 1); assert.equal(dev[0].attempt, 1);
    // all attempts invalid: stop, never drop silently
    await assert.rejects(_test.episode(dir, 'react-rep1-s76002', async () => ({ rec: { valid: false, sensorLate: {} }, obs: [] }), { waitLoad: async () => {} }), /attempts all invalid/);
    assert.equal(fs.readFileSync(path.join(dir, 'deviations.jsonl'), 'utf8').trim().split('\n').length, 4);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('rule 4: the driver waits for the load, then gives up without starting', async () => {
  let calls = 0;
  const g = await _test.waitLoad({ load: () => (++calls < 3 ? 3.5 : 1.2), pollMs: 1, maxMs: 1000 });
  assert.equal(g.ok, true); assert.equal(calls, 3);
  await assert.rejects(_test.waitLoad({ load: () => 4, pollMs: 1, maxMs: 20 }), /stayed above 2/);
});

test('gate item 2: a pilot harness failure is recorded with its cause, not retried; a containment error still stops', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-drive-'));
  try {
    let n = 0; const harness = { kind: 'pilot', arm: 'react', seed: 76002, repeat: 2, stepMs: 2000 };
    const rec = await _test.episode(dir, 'react-rep2-s76002', async () => { n++; throw Error('ssh to web timed out'); }, { waitLoad: async () => {}, harness });
    assert.equal(n, 1, 'not retried'); assert.equal(rec.harnessFailure.cause, 'ssh to web timed out'); assert.equal(rec.steps, 0); assert.equal(rec.valid, false);
    assert.ok(fs.existsSync(path.join(dir, 'episodes', 'react-rep2-s76002.json')), 'counted by the bench as recorded');
    const again = await _test.episode(dir, 'react-rep2-s76002', async () => { throw Error('must not run'); }, { waitLoad: async () => {}, harness });
    assert.equal(again.harnessFailure.cause, 'ssh to web timed out', 'resume keeps the failure');
    assert.match(fs.readFileSync(path.join(dir, 'deviations.jsonl'), 'utf8'), /harness failure/);
    await assert.rejects(_test.episode(dir, 'sleep-rep1-s76001', async () => { throw Error('CONTAINMENT FAILURE: x'); }, { waitLoad: async () => {}, harness }), /CONTAINMENT/);
    await assert.rejects(_test.episode(dir, 'sleep-rep2-s76001', async () => { throw Object.assign(Error('x'), { final: true }); }, { waitLoad: async () => {}, harness }));
    await assert.rejects(_test.episode(dir, 'baseline-s76101', async () => { throw Error('boom'); }, { waitLoad: async () => {} }), /boom/, 'outside the pilot it still throws');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('gate item 1: canary summary and one positive control per run day', () => {
  assert.deepEqual(_test.summarizeCanary([{ targets: 5, open: [], at: 't' }, { targets: 3, open: ['OPEN tcp x'] }]), { hosts: 2, targets: 8, reached: 1, at: 't' });
  let calls = 0; const runControl = () => { calls++; return { detected: 2 }; }, runControlExec = () => ({ tcp: 1, udpDns: true, udpCanaryPort: true, icmp: 1 });
  const a = _test.dayControl({ runControl, runControlExec, now: () => new Date('2031-01-01T10:00:00Z') });
  const b = _test.dayControl({ runControl, runControlExec, now: () => new Date('2031-01-01T23:00:00Z') });
  const c = _test.dayControl({ runControl, runControlExec, now: () => new Date('2031-01-02T00:30:00Z') });
  assert.equal(calls, 2); assert.equal(a.detected, true); assert.equal(a.at, b.at); assert.equal(c.day, '2031-01-02');
});

// Rule 4 settle (Cyber Research, 2026-11-23)
const nosleep = async () => {};
const noImg = () => ({ ref: 'test', commit: 'x', ids: {}, restored: false });
test('settle: the boot load falls to <= 2 -> ok with its wait and curve; never falls -> not ok at the cap', async () => {
  const seq = [5.1, 3.2, 1.7]; let i = 0;
  const ok = await _test.settle({ load: () => seq[Math.min(i++, seq.length - 1)], maxMs: 60e3, sleepFn: nosleep });
  assert.equal(ok.ok, true); assert.equal(ok.load1, 1.7); assert.equal(ok.curve.length, 3); assert.ok(ok.waitS >= 0);
  const no = await _test.settle({ load: () => 4, maxMs: 30, pollMs: 5, sleepFn: (ms) => new Promise((r) => setTimeout(r, ms)) });
  assert.equal(no.ok, false); assert.ok(no.curve.length >= 2); assert.ok(no.curve.every((c) => c.load1 === 4));
});

const reset = () => { _test.settleState.consecutive = 0; for (const k of Object.keys(_test.settleState.bySeed)) delete _test.settleState.bySeed[k]; };
const abort = { __settleAbort: { ok: false, waitS: 600, load1: 3.1, curve: [{ t: 0, load1: 6 }, { t: 600, load1: 3.1 }], leftovers: { checked: true, containers: 0, networks: 0, removed: { containers: 19, networks: 3 } } } };
test('settles -> runs: one abort is logged (not an episode), the same seed is retried and then runs', async () => {
  reset(); const logs = []; let n = 0, waits = 0;
  const ok = { rec: { seed: 76001, valid: true, settleWaitS: 42, load1AtStep0: 1.4 } };
  const r = await _test.withRange('r0p76001', null, { once: async () => (++n === 1 ? abort : ok), waitLoadFn: async () => { waits++; }, images: noImg, log: (d) => logs.push(d) });
  assert.equal(r, ok); assert.equal(n, 2); assert.equal(waits, 1);
  assert.equal(logs.length, 1); assert.equal(logs[0].seed, 76001); assert.match(logs[0].kind, /settle abort/); assert.equal(logs[0].leftovers.containers, 0); assert.equal(logs[0].curve.length, 2);
  assert.equal(_test.settleState.consecutive, 0, 'a success resets the consecutive count');
});

test('never settles -> range down each time, no record, and the queue stops after 3 aborts on a seed', async () => {
  reset(); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-settle-'));
  try {
    const logs = [];
    await assert.rejects(_test.episode(dir, 'sleep-rep1-s76001', () => _test.withRange('r0p76001', null, { once: async () => abort, waitLoadFn: nosleep, images: noImg, log: (d) => logs.push(d) }),
      { waitLoad: nosleep, harness: { kind: 'pilot', arm: 'sleep', seed: 76001, repeat: 1 } }), (e) => e.final === true && /Cyber Research decides/.test(e.message));
    assert.equal(logs.length, 3); assert.ok(logs.every((d) => d.leftovers.checked));
    assert.ok(!fs.existsSync(path.join(dir, 'episodes', 'sleep-rep1-s76001.json')), 'no episode record, not a harness failure');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('one abort per seed followed by a run never stops the queue; 3 in a row do', async () => {
  reset(); const logs = []; let thrown = null;
  for (const id of ['r0p76101', 'r0p76102', 'r0p76103']) {
    let n = 0;
    try { await _test.withRange(id, null, { once: async () => (++n === 1 ? abort : { rec: {} }), waitLoadFn: nosleep, images: noImg, log: (d) => logs.push(d) }); } catch (e) { thrown = e; }
  }
  assert.equal(thrown, null, 'an abort followed by a success on each seed is not consecutive');
  reset(); thrown = null; const seq = [abort, abort, abort];
  try { await _test.withRange('r0p76104', null, { once: async () => seq.shift() || { rec: {} }, waitLoadFn: nosleep, images: noImg, log: () => {} }); } catch (e) { thrown = e; }
  assert.ok(thrown?.final);
});

// Scheduling rule (c) and the idle diagnostic (Cyber Research, 2026-11-23)
test('othersRunning: only other studies in stage run count', () => {
  const st = { studies: { 'r0-pilot': { key: 'r0-pilot', stage: 'run' }, gn1: { key: 'gn1', stage: 'run' }, LI41: { key: 'LI41', stage: 'published' }, x: { key: 'x', stage: 'review' } } };
  assert.deepEqual(othersRunning(st, 'r0-pilot'), ['gn1']);
});

test('exclusive: holds while another study runs, logs pause and resume; no wait when alone', async () => {
  const logs = []; let n = 0;
  const states = [{ studies: { gn1: { key: 'gn1', stage: 'run' } } }, { studies: { gn1: { key: 'gn1', stage: 'run' } } }, { studies: { gn1: { key: 'gn1', stage: 'analyse' } } }];
  const r = await _test.exclusive({ read: () => states[Math.min(n++, 2)], log: (d) => logs.push(d), sleepFn: async () => {}, before: 'sleep-rep1-s76001' });
  assert.equal(logs.length, 2); assert.match(logs[0].kind, /pilot pause/); assert.deepEqual(logs[0].others, ['gn1']); assert.match(logs[1].kind, /resume/); assert.ok(r.waitedS >= 0);
  const none = []; await _test.exclusive({ read: () => ({ studies: {} }), log: (d) => none.push(d) }); assert.equal(none.length, 0);
  let m = 0; const bad = []; await _test.exclusive({ read: () => { if (m++ < 1) throw Error('ENOENT'); return { studies: {} }; }, log: (d) => bad.push(d), sleepFn: async () => {} });
  assert.match(bad[0].others[0], /unreadable/, 'an unreadable bench state holds instead of running');
});

// Measured scheduling (Cyber Research, 2026-11-23): 15-min load gate, records, circuit breaker, idle diagnostic gate
const PSPEC = { arms: ['sleep', 'react', 'disinfect-cd10'], pilotSeeds: [76001, 76002, 76003], repeats: 3, steps: 300, stepMs: 2000 };
const okDiag = async () => ({ overrunRate: 0.01, keysOutside: { total: 0, hosts: {} }, sensorLate: { lateSteps: 0, lateFrac: 0, valid: true }, greenSchedule: { planned: 400, executed: 400, deferred: 0, dropped: 0 } });
const writer = (dir, recFor) => async (name, sched) => { const rec = { ...recFor(name), schedule: { ...sched, othersAtEnd: [] } }; fs.mkdirSync(path.join(dir, 'episodes'), { recursive: true }); fs.writeFileSync(path.join(dir, 'episodes', `${name}.json`), JSON.stringify(rec)); return rec; };

test('pilot: the 15-min load gate before every unrecorded episode, records carry the schedule, recorded episodes skipped', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-pilot-sched-'));
  try {
    const gates = [], ex = [];
    await _test.pilot(PSPEC, dir, null, { restoreSteps: 3 }, { load15Fn: async ({ before }) => { gates.push(before); return { load15: 0.4 }; }, exclusiveFn: async ({ before }) => ex.push(before),
      diagnosticFn: okDiag, others: () => [], run: writer(dir, () => ({ overrunRate: 0 })), log: () => {} });
    assert.equal(gates.length, 27); assert.equal(ex.length, 0, 'no exclusive hold by default');
    const r = JSON.parse(fs.readFileSync(path.join(dir, 'episodes', 'sleep-rep1-s76001.json'), 'utf8'));
    assert.deepEqual(r.schedule.othersAtStart, []); assert.equal(r.schedule.load15AtStart, 0.4); assert.equal(r.schedule.mode, 'load15');
    const again = []; await _test.pilot(PSPEC, dir, null, { restoreSteps: 3 }, { load15Fn: async ({ before }) => { again.push(before); return { load15: 0 }; }, diagnosticFn: okDiag, others: () => [], run: async () => { throw Error('must not run'); }, log: () => {} });
    assert.equal(again.length, 0, 'recorded episodes are not gated or rerun');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('waitLoad15: holds above 1.0 from any source, logs pause and resume', async () => {
  const logs = []; const seq = [1.6, 1.2, 0.9]; let i = 0;
  const g = await _test.waitLoad15({ load15: () => seq[Math.min(i++, 2)], log: (d) => logs.push(d), sleepFn: async () => {}, before: 'x' });
  assert.equal(g.load15, 0.9); assert.equal(logs.length, 2); assert.match(logs[0].kind, /pause/); assert.match(logs[1].kind, /resume/);
  const none = []; await _test.waitLoad15({ load15: () => 1.0, log: (d) => none.push(d) }); assert.equal(none.length, 0, '1.0 is allowed');
});

test('circuit breaker: > 1% overrun with another study running switches the rest to the exclusive rule; the episode stands', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-pilot-breaker-'));
  try {
    const logs = [], ex = []; let n = 0;
    await _test.pilot(PSPEC, dir, null, { restoreSteps: 3 }, { load15Fn: async () => ({ load15: 0.5 }), exclusiveFn: async ({ before }) => ex.push(before), diagnosticFn: okDiag,
      others: () => (n === 0 ? ['gn1'] : []), run: writer(dir, () => ({ overrunRate: n++ === 0 ? 0.02 : 0 })), log: (d) => logs.push(d) });
    assert.equal(logs.filter((d) => /circuit breaker/.test(d.kind)).length, 1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'schedule.json'), 'utf8')).mode, 'exclusive');
    assert.equal(ex.length, 26, 'every later episode goes through the exclusive hold');
    assert.ok(fs.existsSync(path.join(dir, 'episodes', 'sleep-rep1-s76001.json')), 'the tripping episode is kept');
    assert.equal(breakerTrips({ overrunRate: 0.02, schedule: { othersAtStart: [], othersAtEnd: [] } }), false, 'no trip when alone');
    assert.equal(breakerTrips({ overrunRate: 0.01, schedule: { othersAtStart: ['gn1'] } }), false, '1% exactly does not trip');
    assert.equal(breakerTrips({ harnessFailure: { cause: 'x' }, overrunRate: 0.5, schedule: { othersAtStart: ['gn1'] } }), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('idle diagnostic gate: over 2% (or missing) stops before any pilot episode, final', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-pilot-diag-'));
  try {
    let ran = 0; const opts = (d) => ({ load15Fn: async () => ({ load15: 0 }), diagnosticFn: async () => d, others: () => [], run: async () => { ran++; return {}; }, log: () => {} });
    await assert.rejects(_test.pilot(PSPEC, dir, null, { restoreSteps: 3 }, opts({ overrunRate: 0.03 })), (e) => e.final && /range itself/.test(e.message));
    await assert.rejects(_test.pilot(PSPEC, dir, null, { restoreSteps: 3 }, opts(null)), (e) => e.final);
    assert.equal(ran, 0); assert.equal(diagnosticBlocks({ overrunRate: 0.02 }), false, '2% exactly passes');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('stepStats: median, p95 and overrun rate of a step log', () => {
  const log = Array.from({ length: 100 }, (_, i) => ({ ms: 1000 + i * 20, overrun: 1000 + i * 20 > 2200 }));
  const s = stepStats(log, 2000); assert.equal(s.steps, 100); assert.equal(s.medianMs, 2000); assert.equal(s.p95Ms, 2900); assert.equal(s.overrunRate, 0.39); assert.equal(s.overrunOverMs, 2200);
});

test("timing resumes: recorded timing episodes are reused with their durations, never rerun", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "r0-timing-"));
  try {
    fs.mkdirSync(path.join(dir, "episodes"), { recursive: true });
    for (const seed of [76201, 76202]) fs.writeFileSync(path.join(dir, "episodes", `timing-s${seed}.json`), JSON.stringify({ kind: "timing", seed, actions: [{ action: "Restore", ms: 4000 + seed % 10 }, { action: "Remove", ms: 800 }] }));
    const out = await _test.timing({ timingSeeds: [76201, 76202], stepMs: 2000 }, dir);
    assert.equal(out.durationsMs.Restore.n, 2); assert.equal(out.medianRestoreMs, 4001.5);
    assert.ok(fs.existsSync(path.join(dir, "timing.json")));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// Image restore (Cyber Research, 2026-11-23): reference IDs before every range, tar restore, rebuild only as a stop
const REF_IMAGES = Object.fromEntries(['base', 'web', 'db', 'files', 'router', 'nettool'].map((h, i) => [`r0-${h}:m1`, `sha256:${String(i).repeat(64)}`]));
function refFixture({ tar = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-img-'));
  const tarPath = path.join(dir, 'ref.tar'); if (tar) fs.writeFileSync(tarPath, 'images');
  const refPath = path.join(dir, 'ref.json');
  fs.writeFileSync(refPath, JSON.stringify({ commit: '55cd240', tar: tarPath, images: REF_IMAGES, tarSha256: 'goodsha' }));
  return { dir, refPath, tarPath };
}
const fakeDocker = (initial) => { const ids = { ...initial }; return { ids, inspect: (n) => ids[n] ?? null }; };

test('images: present with the reference IDs -> no-op (no hash, no load, no build, no log)', () => {
  const { dir, refPath } = refFixture();
  try {
    const d = fakeDocker(REF_IMAGES), calls = [];
    const r = ensureImages({ refPath, inspect: d.inspect, load: () => calls.push('load'), build: () => calls.push('build'), hashFile: () => calls.push('hash'), log: (x) => calls.push(x) });
    assert.deepEqual(calls, []); assert.equal(r.restored, false); assert.deepEqual(r.ids, REF_IMAGES); assert.equal(r.commit, '55cd240'); assert.equal(r.ref, refPath);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('images: one missing -> tar sha256 checked, docker load, IDs match -> ok and logged as a restore', () => {
  const { dir, refPath, tarPath } = refFixture();
  try {
    const d = fakeDocker({ ...REF_IMAGES, 'r0-web:m1': undefined }), calls = [], logs = [];
    const r = ensureImages({ refPath, inspect: d.inspect, hashFile: (f) => { calls.push(['hash', f]); return 'goodsha'; }, load: (f) => { calls.push(['load', f]); Object.assign(d.ids, REF_IMAGES); return { ok: true }; }, build: () => calls.push(['build']), log: (x) => logs.push(x), before: 'r0p76201' });
    assert.deepEqual(calls, [['hash', tarPath], ['load', tarPath]], 'sha256 first, then load; never build');
    assert.equal(r.restored, true); assert.deepEqual(r.ids, REF_IMAGES);
    assert.equal(logs.length, 1); assert.match(logs[0].kind, /image restore: .*loaded/); assert.deepEqual(logs[0].mismatched, ['r0-web:m1']); assert.equal(logs[0].before, 'r0p76201'); assert.deepEqual(logs[0].stillMismatched, []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('images: tar sha256 differs -> final, never loaded', () => {
  const { dir, refPath } = refFixture();
  try {
    const d = fakeDocker({}), logs = []; let loaded = 0;
    assert.throws(() => ensureImages({ refPath, inspect: d.inspect, hashFile: () => 'badsha', load: () => { loaded++; return { ok: true }; }, build: () => assert.fail('no build'), log: (x) => logs.push(x) }), (e) => e.final && /sha256/.test(e.message));
    assert.equal(loaded, 0); assert.equal(logs.length, 1); assert.match(logs[0].kind, /sha256 differs/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('images: still mismatching after load, or load failing -> final error, logged', () => {
  const { dir, refPath } = refFixture();
  try {
    const d = fakeDocker({ ...REF_IMAGES, 'r0-db:m1': 'sha256:other' }), logs = [];
    assert.throws(() => ensureImages({ refPath, inspect: d.inspect, hashFile: () => 'goodsha', load: () => ({ ok: true }), build: () => assert.fail('no build'), log: (x) => logs.push(x) }), (e) => e.final && /r0-db:m1 still differ/.test(e.message));
    assert.match(logs[0].kind, /failed/); assert.deepEqual(logs[0].stillMismatched, ['r0-db:m1']);
    assert.throws(() => ensureImages({ refPath, inspect: d.inspect, hashFile: () => 'goodsha', load: () => ({ ok: false, err: 'no space' }), log: () => {} }), (e) => e.final && /docker load .* failed: no space/.test(e.message));
    assert.throws(() => ensureImages({ refPath: path.join(dir, 'none.json'), inspect: d.inspect, log: () => {} }), (e) => e.final && /unreadable/.test(e.message));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('images: tar missing -> rebuilt with build.sh, then a final stop for Cyber Research (even if the rebuild matches)', () => {
  const { dir, refPath } = refFixture({ tar: false });
  try {
    const d = fakeDocker({}), logs = []; let built = 0;
    assert.throws(() => ensureImages({ refPath, inspect: d.inspect, hashFile: () => assert.fail('no hash'), load: () => assert.fail('no load'), build: () => { built++; Object.assign(d.ids, REF_IMAGES); return { ok: true }; }, log: (x) => logs.push(x) }),
      (e) => e.final === true && /Cyber Research must decide/.test(e.message));
    assert.equal(built, 1); assert.equal(logs.length, 1); assert.match(logs[0].kind, /tar missing; images rebuilt/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('images: the IDs land in every record; a failed check means no range at all', async () => {
  reset(); const img = { ref: 'r', commit: '55cd240', ids: REF_IMAGES, restored: false }; const seen = [];
  const r1 = await _test.withRange('r0p76001', null, { once: async () => ({ rec: { seed: 76001 }, obs: [] }), images: ({ before }) => { seen.push(before); return img; }, waitLoadFn: nosleep, log: () => {} });
  assert.deepEqual(r1.rec.images, img); assert.deepEqual(seen, ['r0p76001']);
  const r2 = await _test.withRange('r0p76201', null, { once: async () => ({ kind: 'timing', actions: [] }), images: () => img, waitLoadFn: nosleep, log: () => {} });
  assert.deepEqual(r2.images, img, 'timing records carry them too');
  let ups = 0;
  await assert.rejects(_test.withRange('r0p76002', null, { once: async () => { ups++; return { rec: {} }; }, images: () => { throw Object.assign(Error('image restore: x'), { final: true }); }, waitLoadFn: nosleep, log: () => {} }), (e) => e.final);
  assert.equal(ups, 0, 'no range is brought up');
  // a final image error is never recorded as a pilot harness failure
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-img-ep-'));
  try {
    await assert.rejects(_test.episode(dir, 'sleep-rep1-s76001', () => _test.withRange('r0p76001', null, { once: async () => assert.fail('no range'), images: () => { throw Object.assign(Error('image restore: y'), { final: true }); }, waitLoadFn: nosleep, log: () => {} }), { waitLoad: nosleep, harness: { kind: 'pilot' } }), (e) => e.final);
    assert.ok(!fs.existsSync(path.join(dir, 'episodes', 'sleep-rep1-s76001.json')));
    const rec = await _test.episode(dir, 'react-rep1-s76001', () => _test.withRange('r0p76001', null, { once: async () => { throw Error('ssh timed out'); }, images: () => img, waitLoadFn: nosleep, log: () => {} }), { waitLoad: nosleep, harness: { kind: 'pilot' } });
    assert.deepEqual(rec.images, img, 'a harness-failure record names the images of its range');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// List check of the idle diagnostic (Cyber Research, 2026-11-23)
const FROZEN = { sha256: 'f', lists: { web: { procs: ['/usr/sbin/nginx|-|svc'], flows: ['ws1|web|8080|tcp'] }, db: { procs: ['/usr/bin/postgres|-|svc'], flows: [] } } };
const OBS = [
  { hosts: { web: { up: true, procs: [{ exe: '/usr/sbin/nginx', parent: '-', user: 'svc' }], conns: [{ src: 'ws1', dst: 'web', port: 8080, proto: 'tcp' }] }, db: { up: true, procs: [{ exe: '/usr/bin/postgres', parent: '-', user: 'svc' }], conns: [] } } },
  { hosts: { web: { up: true, procs: [{ exe: '/tmp/x', parent: '/usr/sbin/nginx', user: 'svc' }, { exe: '/tmp/x', parent: '/usr/sbin/nginx', user: 'svc' }], conns: [{ src: 'web', dst: 'db', port: 5432, proto: 'tcp' }] }, ws9: { up: true, procs: [{ exe: '/bin/a', parent: '-', user: 'root' }], conns: [] } } },
];
test('keysOutside: per host counts and the keys outside the frozen lists (sensors pkey/ckey); 0 when inside', () => {
  const k = keysOutside(OBS, FROZEN);
  assert.equal(k.total, 3); assert.equal(k.frozenSha256, 'f'); assert.equal(k.steps, 2);
  assert.deepEqual(k.hosts.web, { procs: 1, conns: 1, procKeys: ['/tmp/x|/usr/sbin/nginx|svc'], connKeys: ['web|db|5432|tcp'] });
  assert.deepEqual(k.hosts.db, { procs: 0, conns: 0, procKeys: [], connKeys: [] });
  assert.equal(k.hosts.ws9.procs, 1, 'a host with no frozen list: every key is outside');
  assert.equal(keysOutside([OBS[0]], FROZEN).total, 0);
  assert.equal(keysOutsideBlocks({ keysOutside: keysOutside([OBS[0]], FROZEN) }), null);
  assert.match(keysOutsideBlocks({ keysOutside: k }), /3 keys outside .*web: 1 process \[\/tmp\/x\|\/usr\/sbin\/nginx\|svc\], 1 connection \[web\|db\|5432\|tcp\]/);
  assert.match(keysOutsideBlocks({ overrunRate: 0 }), /no list check/);
});

test('pilot: any key outside the lists in the diagnostic is a final stop with the list, before any pilot episode', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-pilot-keys-'));
  try {
    let ran = 0, gotFrozen = null;
    const diag = { ...PASS_IDLE, overrunRate: 0, keysOutside: keysOutside(OBS, FROZEN) };
    await assert.rejects(_test.pilot(PSPEC, dir, FROZEN, { restoreSteps: 3 }, { load15Fn: async () => ({ load15: 0 }), diagnosticFn: async (s, o) => { gotFrozen = o.frozen; return diag; }, others: () => [], run: async () => { ran++; return {}; }, log: () => {} }),
      (e) => e.final && /list check: 3 keys outside/.test(e.message) && /\/tmp\/x/.test(e.message));
    assert.equal(ran, 0); assert.equal(gotFrozen, FROZEN, 'the diagnostic gets the frozen lists');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('idle diagnostic: v4 file outside results/, with its images and list check; needs the frozen lists', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-diag-'));
  try {
    const img = { ref: 'r', commit: '55cd240', ids: REF_IMAGES, restored: false }; let opts = null;
    const wr = async (id, fn, o) => { opts = o; return { rec: { load1: {}, sensorLate: {}, images: img }, stepLog: [{ ms: 2000, overrun: false }], obs: OBS }; };
    await assert.rejects(_test.idleDiagnostic({ steps: 1, stepMs: 2000 }, { dir, withRangeFn: wr, waitLoadFn: nosleep }), (e) => e.final && /baseline\(\) runs first/.test(e.message));
    const out = await _test.idleDiagnostic({ steps: 1, stepMs: 2000 }, { dir, frozen: FROZEN, withRangeFn: wr, waitLoadFn: nosleep });
    assert.equal(diagFile(dir), path.join(dir, 'idle-s76901-v4.json')); assert.ok(fs.existsSync(diagFile(dir)));
    const f = JSON.parse(fs.readFileSync(diagFile(dir), 'utf8'));
    assert.deepEqual(f.images, img); assert.equal(f.keysOutside.total, 3); assert.equal(f.version, 4); assert.equal(out.keysOutside.total, 3); assert.equal(typeof opts.log, 'function');
    const again = await _test.idleDiagnostic({}, { dir, frozen: FROZEN, withRangeFn: () => assert.fail('idempotent') }); assert.equal(again.keysOutside.total, 3);
    await assert.rejects(_test.idleDiagnostic({}, { dir: path.join(dir, 'results', 'r0-pilot'), frozen: FROZEN, withRangeFn: wr, waitLoadFn: nosleep }), (e) => e.final && /never study data/.test(e.message));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('main order: baseline, then the idle diagnostic with the frozen lists, then the red diagnostic, then timing, then pilot', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-main-'));
  try {
    const specPath = path.join(dir, 'spec.json'); fs.writeFileSync(specPath, JSON.stringify({ out: 'r0-test', arms: ['sleep'] }));
    const order = [], frozen = { lists: {}, sha256: 'z' };
    await main(specPath, { fns: { ensureImages: noImg, dayControl: () => order.push('control'), baseline: async () => { order.push('baseline'); return frozen; }, waitLoad15: async () => order.push('load15'),
      idleDiagnostic: async (s, o) => { order.push(o.frozen === frozen ? 'diagnostic(frozen)' : 'diagnostic(?)'); return PASS_IDLE; }, redDiagnostic: async () => { order.push('red'); return PASS_RED; },
      timing: async () => { order.push('timing'); return {}; }, pilot: async (s, out, f) => { order.push(f === frozen ? 'pilot(frozen)' : 'pilot(?)'); } } });
    const o = order.filter((x) => x !== 'load15');
    assert.deepEqual(o, ['control', 'baseline', 'diagnostic(frozen)', 'red', 'timing', 'pilot(frozen)']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// Refreeze with canonical flow keys (Cyber Research, 2026-11-23, pre-data deviation)
const BOBS = [
  { hosts: { ws1: { up: true, procs: [{ exe: '/usr/bin/dash', parent: '-', user: 'svc' }], conns: [{ src: 'ws1', dst: 'files', port: 2222, proto: 'tcp' }, { src: 'files', dst: 'ws1', port: 21794, proto: 'tcp' }] } } },
  { hosts: { ws1: { up: true, procs: [], conns: [{ src: 'web', dst: 'ws1', port: 33300, proto: 'tcp' }, { src: 'ws1', dst: 'web', port: 8080, proto: 'tcp' }] }, db: { up: true, procs: [], conns: [] } } },
];
test('freezeV2: new v2 files from the recorded observations, v1 untouched, drops and both hashes recorded, one deviation; resume re-checks', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-refreeze-'));
  try {
    const v1 = { sha256: 'f0df4e70', hosts: {} }; fs.writeFileSync(path.join(dir, 'frozen.json'), JSON.stringify(v1)); fs.writeFileSync(path.join(dir, 'frozen-lists.json'), '{"v1":true}');
    const logs = [], F = freezeV2(dir, BOBS, { log: (d) => logs.push(d) });
    assert.deepEqual(F.lists.ws1.flows, ['ws1|files|2222|tcp', 'ws1|web|8080|tcp']);
    const sum = JSON.parse(fs.readFileSync(path.join(dir, FROZEN_V2.summary), 'utf8')), lists = JSON.parse(fs.readFileSync(path.join(dir, FROZEN_V2.lists), 'utf8'));
    assert.equal(sum.version, 2); assert.equal(sum.sha256, F.sha256); assert.equal(lists.sha256, F.sha256);
    assert.equal(sum.refreeze.v1Sha256, 'f0df4e70'); assert.equal(sum.refreeze.v2Sha256, F.sha256); assert.deepEqual(sum.refreeze.droppedByHost, { db: 0, ws1: 2 }); assert.equal(sum.refreeze.droppedTotal, 2);
    assert.deepEqual(sum.refreeze.servicePorts, SERVICE_PORTS);
    assert.equal(fs.readFileSync(path.join(dir, 'frozen-lists.json'), 'utf8'), '{"v1":true}'); assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'frozen.json'), 'utf8')), v1);
    assert.equal(logs.length, 1); assert.match(logs[0].kind, /pre-data deviation.*refrozen/); assert.equal(logs[0].v1Sha256, 'f0df4e70'); assert.equal(logs[0].v2Sha256, F.sha256);
    const again = freezeV2(dir, [...BOBS].reverse(), { log: (d) => logs.push(d) });
    assert.equal(again.sha256, F.sha256); assert.equal(logs.length, 1, 'resume: checked, not rewritten or logged again');
    assert.throws(() => freezeV2(dir, [BOBS[0]], { log: () => {} }), (e) => e.final && /not reproducible/.test(e.message));
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, FROZEN_V2.lists), 'utf8')).sha256, F.sha256, 'never overwritten');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('recordedBaselineObs: reads the obs of every recorded baseline episode; a missing one is a final error (no range)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-recobs-'));
  try {
    fs.mkdirSync(path.join(dir, 'episodes'));
    fs.writeFileSync(path.join(dir, 'episodes', 'baseline-s1.json'), JSON.stringify({ obs: [BOBS[0]] }));
    assert.throws(() => recordedBaselineObs({ baselineSeeds: [1, 2] }, dir), (e) => e.final);
    fs.writeFileSync(path.join(dir, 'episodes', 'baseline-s2.json'), JSON.stringify({ obs: [BOBS[1]] }));
    assert.equal(recordedBaselineObs({ baselineSeeds: [1, 2] }, dir).length, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// Baseline redo (Cyber Research, 2026-11-23): one-shot archive, 10 episodes again, lists v3
const OK_SCHED = { planned: 100, executed: 100, deferred: 0, dropped: 0 };
const fakeBaseline = (calls, sched = OK_SCHED) => async (seed) => { calls.push(seed); const obs = [BOBS[seed % 2], { hosts: { ws1: { up: true, procs: [], conns: [{ src: 'ws1', dst: 'db', port: 6666, proto: 'tcp' }] } } }]; return { rec: { kind: 'baseline', seed, valid: true, greenSchedule: sched, obs }, obs }; };
const writeOld = (dir) => {
  const ep = path.join(dir, 'episodes'); fs.mkdirSync(ep, { recursive: true });
  const files = { 'episodes/baseline-s1.json': '{"old":1}', 'episodes/baseline-s2.json': '{"old":2}', 'episodes/baseline-s2.invalid1.json': '{"old":"inv"}',
    'frozen.json': '{"sha256":"f0df4e70"}', 'frozen-lists.json': '{"v1":true}', 'frozen-v2.json': '{"sha256":"50c7387d","version":2}', 'frozen-lists-v2.json': '{"v2":true}' };
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), c);
  fs.writeFileSync(path.join(ep, 'timing-s3.json'), '{"kind":"timing"}'); fs.writeFileSync(path.join(dir, 'deviations.jsonl'), '{"old":true}\n');
  return files;
};
const benchCount = (dir) => fs.readdirSync(path.join(dir, 'episodes')).filter((f) => /-s\d+\.json$/.test(f)); // bench.mjs and analyze-r0

test('baseline redo: one-shot archive (moved, byte-identical), the episodes rerun, v3 frozen; archived files never counted', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-redo-'));
  try {
    const files = writeOld(dir), logs = [], calls = [];
    const F = await _test.baseline({ baselineSeeds: [1, 2], steps: 1, stepMs: 2000 }, dir, { log: (d) => logs.push(d), run: fakeBaseline(calls), waitLoadFn: nosleep });
    for (const [f, c] of Object.entries(files)) {
      const to = f.startsWith('episodes/') ? path.join(dir, 'archive-baseline-v2', f) : path.join(dir, 'archive-baseline-v2', f);
      assert.equal(fs.readFileSync(to, 'utf8'), c, `${f} archived unchanged`); assert.ok(!fs.existsSync(path.join(dir, f)) || f.startsWith('episodes/baseline-s'), `${f} moved`);
    }
    assert.deepEqual(calls, [1, 2], 'the old records do not count as recorded: both seeds rerun');
    assert.deepEqual(benchCount(dir).sort(), ['baseline-s1.json', 'baseline-s2.json', 'timing-s3.json'], 'only the new baseline and the timing episode are counted');
    assert.ok(!fs.existsSync(path.join(dir, 'episodes', 'baseline-s2.invalid1.json')));
    assert.equal(fs.readFileSync(path.join(dir, 'episodes', 'timing-s3.json'), 'utf8'), '{"kind":"timing"}', 'timing untouched');
    const m = JSON.parse(fs.readFileSync(path.join(dir, 'baseline-redo-v3.json'), 'utf8'));
    assert.equal(m.state, 'archived'); assert.equal(m.plan.length, 7); assert.ok(m.plan.every((x) => /^[0-9a-f]{64}$/.test(x.sha256)));
    const v3 = JSON.parse(fs.readFileSync(path.join(dir, 'frozen-v3.json'), 'utf8'));
    assert.equal(v3.version, 3); assert.equal(v3.sha256, F.sha256); assert.deepEqual(v3.previous, { v1Sha256: 'f0df4e70', v2Sha256: '50c7387d', archive: 'archive-baseline-v2' });
    assert.ok(F.lists.ws1.flows.includes('ws1|db|6666|tcp'), 'v3 keeps the keys as the sensor emitted them (no sport-based drop)');
    assert.equal(logs.length, 2); assert.match(logs[0].kind, /baseline is redone.*not the data.*nothing deleted/); assert.match(logs[1].kind, /allow-lists v3 frozen/);
    assert.equal(fs.readFileSync(path.join(dir, 'deviations.jsonl'), 'utf8'), '{"old":true}\n', 'the test logger only: deviations untouched here');
    // resume: no second archive, nothing rerun, v3 re-derived and checked, nothing logged
    const again = await _test.baseline({ baselineSeeds: [1, 2], steps: 1, stepMs: 2000 }, dir, { log: (d) => logs.push(d), run: fakeBaseline(calls), waitLoadFn: nosleep });
    assert.equal(again.sha256, F.sha256); assert.deepEqual(calls, [1, 2]); assert.equal(logs.length, 2);
    assert.deepEqual(benchCount(dir).sort(), ['baseline-s1.json', 'baseline-s2.json', 'timing-s3.json'], 'the new records are never archived');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('baseline redo: a crash mid-archive resumes the SAME plan; a file at both ends or at neither is final', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-redo-crash-'));
  try {
    writeOld(dir); const logs = [];
    // simulate the crash: marker written with the plan, one file moved
    const plan = ['episodes/baseline-s1.json', 'episodes/baseline-s2.json'].map((f) => ({ from: f, to: path.join('archive-baseline-v2', f), sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex') }));
    fs.writeFileSync(path.join(dir, 'baseline-redo-v3.json'), JSON.stringify({ state: 'archiving', archive: 'archive-baseline-v2', plan }));
    fs.mkdirSync(path.join(dir, 'archive-baseline-v2', 'episodes'), { recursive: true });
    fs.renameSync(path.join(dir, 'episodes', 'baseline-s1.json'), path.join(dir, 'archive-baseline-v2', 'episodes', 'baseline-s1.json'));
    fs.writeFileSync(path.join(dir, 'episodes', 'baseline-s1.json'), '{"new":1}'); // a NEW record written after the crash... at both ends
    assert.throws(() => archiveBaselineV2(dir, { log: (d) => logs.push(d) }), (e) => e.final && /both in place and in the archive/.test(e.message));
    fs.renameSync(path.join(dir, 'episodes', 'baseline-s1.json'), path.join(dir, 'new-s1.keep'));
    const m = archiveBaselineV2(dir, { log: (d) => logs.push(d) });
    assert.equal(m.state, 'archived'); assert.equal(m.plan.length, 2, 'the recorded plan, not a new scan (v1/v2 files not in it stay)');
    assert.ok(fs.existsSync(path.join(dir, 'frozen.json')), 'not in the plan: untouched');
    assert.equal(logs.length, 1); assert.equal(archiveBaselineV2(dir, { log: (d) => logs.push(d) }).state, 'archived'); assert.equal(logs.length, 1, 'no-op once archived');
    fs.writeFileSync(path.join(dir, 'baseline-redo-v3.json'), JSON.stringify({ state: 'archiving', plan: [{ from: 'episodes/x-s1.json', to: 'archive-baseline-v2/episodes/x-s1.json', sha256: 'x' }] }));
    assert.throws(() => archiveBaselineV2(dir, { log: () => {} }), (e) => e.final && /neither in place nor in the archive/.test(e.message));
    const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-redo-noarch-')); fs.mkdirSync(path.join(d2, 'archive-baseline-v2'));
    assert.throws(() => archiveBaselineV2(d2, { log: () => {} }), (e) => e.final && /exists without a marker/.test(e.message)); fs.rmSync(d2, { recursive: true, force: true });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('baseline redo: deferred + dropped over 5% of planned in a baseline episode is a final stop (the episode is recorded)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-redo-sched-'));
  try {
    const calls = [];
    await assert.rejects(_test.baseline({ baselineSeeds: [1, 2], steps: 1, stepMs: 2000 }, dir, { log: () => {}, run: fakeBaseline(calls, { planned: 100, executed: 96, deferred: 4, dropped: 2 }), waitLoadFn: nosleep }),
      (e) => e.final && /baseline-s1: green deferred 4 \+ dropped 2 = 6\.0% of 100/.test(e.message));
    assert.deepEqual(calls, [1]); assert.ok(fs.existsSync(path.join(dir, 'episodes', 'baseline-s1.json'))); assert.ok(!fs.existsSync(path.join(dir, 'frozen-lists-v3.json')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('--refreeze (v2) is refused once the baseline redo marker exists', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-refreeze-off-')), cwd = process.cwd();
  try {
    process.chdir(dir);
    fs.writeFileSync('spec.json', JSON.stringify({ out: 'r0-x', arms: ['sleep'] }));
    fs.mkdirSync('results/r0-x', { recursive: true }); fs.writeFileSync('results/r0-x/baseline-redo-v3.json', '{"state":"archived"}');
    await assert.rejects(main('spec.json', { mode: 'refreeze' }), (e) => e.final && /superseded by the baseline redo/.test(e.message));
    assert.ok(!fs.existsSync('results/r0-x/frozen-lists-v2.json'));
  } finally { process.chdir(cwd); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('v4 criteria: overrun <= 2%, sensor-late <= 5%, 0 keys outside, deferred + dropped <= 5%; a missing field stops', () => {
  assert.doesNotThrow(() => idleGate(PASS_IDLE));
  assert.doesNotThrow(() => idleGate({ ...PASS_IDLE, sensorLate: { lateFrac: 0.05 }, greenSchedule: { planned: 100, deferred: 3, dropped: 2 } }), '5% exactly passes');
  assert.throws(() => idleGate({ ...PASS_IDLE, sensorLate: { lateFrac: 0.1133 } }), (e) => e.final && /sensor-late 0\.1133 > 0\.05/.test(e.message));
  assert.throws(() => idleGate({ ...PASS_IDLE, sensorLate: undefined }), (e) => e.final && /sensor-late missing/.test(e.message));
  assert.throws(() => idleGate({ ...PASS_IDLE, greenSchedule: { planned: 100, deferred: 4, dropped: 2 } }), (e) => e.final && /green schedule: green deferred 4/.test(e.message));
  assert.throws(() => idleGate({ ...PASS_IDLE, greenSchedule: undefined }), (e) => e.final && /no green schedule record/.test(e.message));
  assert.throws(() => idleGate({ ...PASS_IDLE, overrunRate: 0.03 }), (e) => e.final && /overrun/.test(e.message));
});

test('red diagnostic: outside results/, red exec time per step; also runnable alone', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-reddiag-'));
  try {
    const stepLog = Array.from({ length: 20 }, (_, i) => ({ step: i, redMs: i % 5 === 0 ? 1000 + i * 10 : 2, ms: 2000, overrun: false, greenInFlight: 1 }));
    const wr = async () => ({ rec: { load1: {}, sensorLate: {}, redLog: [0, 5, 10, 15].map((step) => ({ step, stage: 'x' })), red: { furthest: 'impact' }, green: { ok: 1 } }, stepLog, obs: [] });
    const out = await _test.redDiagnostic({ steps: 20, stepMs: 2000 }, { dir, withRangeFn: wr, waitLoadFn: nosleep, load15Fn: nosleep });
    assert.equal(redDiagFile(dir), path.join(dir, 'red-s76902-v1.json')); assert.ok(fs.existsSync(redDiagFile(dir)));
    assert.equal(out.seed, 76902); assert.deepEqual(out.redMsActingSteps, { n: 4, median: 1100, p95: 1150, max: 1150 }); assert.equal(out.redMs.max, 1150); assert.equal(out.perStep.length, 20); assert.equal(out.perStep[0].redMs, 1000); assert.ok('streamStats' in out && 'greenMs' in out);
    await assert.rejects(_test.redDiagnostic({}, { dir: path.join(dir, 'results', 'r0-pilot'), withRangeFn: wr, waitLoadFn: nosleep, load15Fn: nosleep }), (e) => e.final && /never study data/.test(e.message));
    assert.deepEqual(fieldStats([{ x: 3 }, { x: 1 }, { y: 2 }], 'x'), { n: 2, median: 3, p95: 3, max: 3 });
    const specPath = path.join(dir, 'spec.json'); fs.writeFileSync(specPath, JSON.stringify({ out: 'r0-test', arms: ['sleep'] }));
    let red = 0; const order = [];
    await main(specPath, { fns: { ensureImages: noImg, dayControl: () => {}, baseline: async () => ({ lists: {} }), waitLoad15: async () => {}, idleDiagnostic: async () => { order.push('diag'); return PASS_IDLE; }, timing: async () => ({}), pilot: async () => order.push('pilot'), redDiagnostic: async () => { red++; return PASS_RED; } } });
    assert.equal(red, 1, 'a step of the flow'); assert.deepEqual(order, ['diag', 'pilot']);
    await main(specPath, { mode: 'red-diagnostic', fns: { ensureImages: noImg, dayControl: () => assert.fail('no control logged'), baseline: () => assert.fail('no baseline'), redDiagnostic: async () => { red++; return { redMs: {}, step: {} }; } } });
    assert.equal(red, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// Red diagnostic as a gated step of the flow (Cyber Research, 2026-11-23, pre-data deviation)
const mainWith = async (dir, over) => {
  const specPath = path.join(dir, 'spec.json'); fs.writeFileSync(specPath, JSON.stringify({ out: 'r0-test', arms: ['sleep'] }));
  const order = [];
  const fns = { ensureImages: noImg, dayControl: () => {}, baseline: async () => { order.push('baseline'); return { lists: {} }; }, waitLoad15: async () => {},
    idleDiagnostic: async () => { order.push('idle'); return PASS_IDLE; }, redDiagnostic: async () => { order.push('red'); return PASS_RED; },
    timing: async () => { order.push('timing'); return {}; }, pilot: async () => { order.push('pilot'); }, ...over(order) };
  let err = null; try { await main(specPath, { fns }); } catch (e) { err = e; }
  return { order, err };
};
test('red diagnostic stop: overrun > 2% is a final stop before timing and the pilot, with redMs median/p95/max', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-redgate-'));
  try {
    const bad = { seed: 76902, step: { overrunRate: 0.031 }, redMs: { n: 300, median: 4, p95: 1810, max: 4420 }, redMsActingSteps: { n: 14, median: 1500, p95: 4420, max: 4420 } };
    const { order, err } = await mainWith(dir, (o) => ({ redDiagnostic: async () => { o.push('red'); return bad; } }));
    assert.deepEqual(order, ['baseline', 'idle', 'red'], 'no timing, no pilot');
    assert.ok(err?.final); assert.match(err.message, /step overrun 0\.031 > 0\.02: redMs median 4 ms, p95 1810 ms, max 4420 ms/); assert.match(err.message, /14 steps red acted: median 1500 ms/); assert.match(err.message, /red-s76902-v1\.json/);
    assert.equal(redDiagBlocks({ step: { overrunRate: 0.02 } }), null, '2% exactly passes');
    assert.match(redDiagBlocks(null), /missing/, 'no diagnostic is a stop');
    const ok = await mainWith(dir, () => ({})); assert.equal(ok.err, null); assert.deepEqual(ok.order, ['baseline', 'idle', 'red', 'timing', 'pilot']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('red diagnostic runs only if the idle diagnostic v3 passed (overrun and list check)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-redgate-'));
  try {
    for (const idle of [{ overrunRate: 0.03, keysOutside: { total: 0, hosts: {} } }, { overrunRate: 0, keysOutside: keysOutside(OBS, FROZEN) }, null]) {
      const { order, err } = await mainWith(dir, (o) => ({ idleDiagnostic: async () => { o.push('idle'); return idle; } }));
      assert.deepEqual(order, ['baseline', 'idle'], 'no red diagnostic, timing or pilot'); assert.ok(err?.final); assert.match(err.message, /red diagnostic, timing and the pilot do not start/);
    }
    assert.doesNotThrow(() => idleGate(PASS_IDLE));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('red diagnostic: the 15-minute load gate and rule 4 before its range, ensureImages inside withRange; never in results/', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-redorder-'));
  try {
    const seq = [];
    const wr = async (id, fn, o) => { seq.push(`range:${id}`); assert.equal(typeof o.images, 'function', 'ensureImages wrapper'); return { rec: { load1: {}, sensorLate: {}, redLog: [] }, stepLog: [{ step: 0, ms: 1, redMs: 1, overrun: false }], obs: [] }; };
    await _test.redDiagnostic({ steps: 1, stepMs: 2000 }, { dir, withRangeFn: wr, load15Fn: async () => seq.push('load15'), waitLoadFn: async () => seq.push('rule4') });
    assert.deepEqual(seq, ['load15', 'rule4', 'range:r0p76902']);
    assert.ok(!fs.readdirSync(dir).some((f) => /results/.test(f)));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// Images before the day's positive control (Cyber Research, 2026-11-23): a pruned image is restored before control() runs
test('main: a missing image is restored (and logged) before the day control runs; a failed restore means no control', async () => {
  const { dir, refPath, tarPath } = refFixture();
  try {
    const specPath = path.join(dir, 'spec.json'); fs.writeFileSync(specPath, JSON.stringify({ out: 'r0-test', arms: ['sleep'] }));
    const d = fakeDocker({ ...REF_IMAGES, 'r0-nettool:m1': undefined, 'r0-base:m1': undefined }), order = [], logs = [];
    const images = (o) => { order.push(`images:${o.before}`); return ensureImages({ ...o, refPath, inspect: d.inspect, hashFile: () => 'goodsha', load: (f) => { order.push(`load:${f === tarPath}`); Object.assign(d.ids, REF_IMAGES); return { ok: true }; }, build: () => assert.fail('no build'), log: (x) => logs.push(x) }); };
    const control = () => { order.push('control'); assert.equal(d.ids['r0-nettool:m1'], REF_IMAGES['r0-nettool:m1'], 'nettool present when the control runs'); assert.equal(d.ids['r0-base:m1'], REF_IMAGES['r0-base:m1']); };
    await main(specPath, { fns: { ensureImages: images, dayControl: control, baseline: async () => { order.push('baseline'); return { lists: {} }; }, waitLoad15: async () => {},
      idleDiagnostic: async () => PASS_IDLE, redDiagnostic: async () => PASS_RED, timing: async () => ({}), pilot: async () => {} } });
    assert.deepEqual(order.slice(0, 4), ['images:day control', 'load:true', 'control', 'baseline']);
    assert.equal(logs.length, 1); assert.match(logs[0].kind, /image restore: .*loaded/); assert.equal(logs[0].before, 'day control'); assert.deepEqual(logs[0].mismatched.sort(), ['r0-base:m1', 'r0-nettool:m1']);
    let controlled = 0;
    await assert.rejects(main(specPath, { fns: { ensureImages: () => { throw Object.assign(Error('image restore: tar missing'), { final: true }); }, dayControl: () => { controlled++; }, baseline: () => assert.fail('no baseline') } }), (e) => e.final);
    assert.equal(controlled, 0, 'no control, no baseline when the images cannot be restored');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('diagDetail: per-step sensor and host times, green in flight, load, stream stats and green durations (for the sensor-late analysis)', () => {
  const r = { rec: { streamStats: { 'ws1.svc': { timeouts: 2, late: [1600], restarts: 0 } }, greenLog: [{ step: 0, ws: 'ws1', kind: 'sftp', ok: true, ms: 1800, doneStep: 1 }] },
    stepLog: [{ step: 0, ms: 1600, sensorMs: 1550, sensorLate: true, sensorTiming: { ws1: 1550 }, hosts: { ws1: 'sensor-late' }, greenInFlight: 3, greenLaunched: 2, load1: 2.5, procErrors: { total: 1, byHost: { files: 1 } } }] };
  const d = diagDetail(r);
  assert.deepEqual(d.perStep[0], { step: 0, ms: 1600, sensorMs: 1550, sensorLate: true, sensorTiming: { ws1: 1550 }, hosts: { ws1: 'sensor-late' }, greenInFlight: 3, greenLaunched: 2, load1: 2.5, redMs: null, procErrors: 1 });
  assert.equal(d.streamStats['ws1.svc'].timeouts, 2); assert.equal(d.greenMs.median, 1800); assert.equal(d.greenActions[0].doneStep, 1);
});

test('images: every docker build of build.sh carries unfold.study=r0; the default reference is the labelled rebuild', () => {
  const b = fs.readFileSync(new URL('./images/build.sh', import.meta.url), 'utf8').split('\n').filter((l) => /docker build/.test(l) && !l.trim().startsWith('#'));
  assert.equal(b.length, 2, 'base, then web db files router nettool'); assert.ok(b.every((l) => l.includes('--label unfold.study=r0')));
  assert.match(b[1], /for i in web db files router nettool/);
  assert.equal(IMAGE_REF_DEFAULT, '/srv/bench/archive/r0-images/r0-193a3af2eb24.json');
});
