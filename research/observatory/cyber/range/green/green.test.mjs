// Unit tests of the green pure logic (no Docker): node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { rng, classifyFailure, schedule } from './green.mjs';

test('rng is deterministic per seed and differs across seeds', () => {
  const a = rng(76101), b = rng(76101), c = rng(76102);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, [c(), c(), c()]);
  assert.ok(seqA.every((x) => x >= 0 && x < 1));
});

test('classifyFailure maps the probe to the prereg causes', () => {
  assert.equal(classifyFailure({ serviceUp: false, reachable: false, impacted: false }), 'blue_restore');
  assert.equal(classifyFailure({ serviceUp: true, reachable: false, impacted: false }), 'blue_block');
  assert.equal(classifyFailure({ serviceUp: true, reachable: true, impacted: true }), 'red_impact');
  assert.equal(classifyFailure({ serviceUp: true, reachable: true, impacted: false }), 'other');
});

test('schedule is deterministic, right length, and only http/sftp from workstations', () => {
  const s1 = schedule(76001, 20), s2 = schedule(76001, 20);
  assert.deepEqual(s1, s2);
  assert.equal(s1.length, 20);
  for (const step of s1) for (const a of step) { assert.ok(['ws1', 'ws2', 'ws3'].includes(a.ws)); assert.ok(['http', 'sftp'].includes(a.kind)); }
  assert.notDeepEqual(schedule(76002, 20), s1);
});

// ---- async green (Cyber Research, 2026-11-23, pre-data deviation): launch, in-flight, launch-step attribution, timeout
import { Green, dxAsync, EXEC_TIMEOUT_MS } from './green.mjs';
const PODS = [{ host: 'web', ip: '10.90.2.10', port: 8080, segment: 'dmz', service: 'r0-t-web-svc' }, { host: 'files', ip: '10.90.2.20', segment: 'dmz', service: 'r0-t-files-svc' },
  ...['ws1', 'ws2', 'ws3'].map((h, i) => ({ host: h, ip: `10.90.1.1${i + 1}`, segment: 'user', service: `r0-t-${h}-svc` }))];
const tick = () => new Promise((r) => setImmediate(r));
// a fake docker: every call waits until the test answers it
function fakeRun() {
  const calls = [];
  const run = (args, o) => new Promise((res) => calls.push({ args, o, res }));
  const open = () => calls.filter((c) => !c.done);
  const answer = (pred, r) => { for (const c of open().filter(pred)) { c.done = true; c.res(r); } };
  return { run, calls, open, answer };
}
const OK = (c) => (/GET \//.test(c.args.at(-1)) ? { status: 0, stdout: 'HTTP/1.1 200 OK\r\n\r\nr0-web ok', stderr: '' } : { status: 0, stdout: '', stderr: '' });
const firstBusy = (g, from = 0) => { for (let i = from; i < g.plan.length; i++) if (g.plan[i].length) return i; return -1; };

test('async launch: step() returns before any action is back; the log and tally fill when they return; drain waits', async () => {
  const f = fakeRun(), g = new Green({ pods: PODS, token: 't', seed: 76101, steps: 50, run: f.run });
  const i = firstBusy(g), n = g.plan[i].length;
  const t0 = Date.now(), launched = g.step(i, {});
  assert.ok(Date.now() - t0 < 50, 'step() does not block');
  assert.equal(launched.length, n); assert.equal(f.calls.length, n, 'every action is launched at once');
  assert.equal(g.log.length, 0); assert.equal(g.tally.ok + g.tally.fail, 0);
  let drained = false; const d = g.drain().then(() => { drained = true; });
  await tick(); assert.equal(drained, false, 'drain waits for the actions in flight');
  for (const c of f.open()) { c.done = true; c.res(OK(c)); }
  await d;
  assert.equal(g.log.length, n); assert.equal(g.tally.ok, n); assert.equal(g.inFlight, 0);
  assert.ok(g.log.every((r) => r.step === i && r.ok && typeof r.ms === 'number'));
});

test('in-flight count: actions of earlier steps still out are counted until they return', async () => {
  const f = fakeRun(), g = new Green({ pods: PODS, token: 't', seed: 76102, steps: 50, run: f.run });
  const a = firstBusy(g), b = firstBusy(g, a + 1), na = g.plan[a].length, nb = g.plan[b].length;
  g.step(a, {}); assert.equal(g.inFlight, na);
  g.step(b, {}); assert.equal(g.inFlight, na + nb);
  const first = f.calls.slice(0, na); for (const c of first) { c.done = true; c.res(OK(c)); }
  await tick(); await tick(); assert.equal(g.inFlight, nb, 'step a returned, step b still out');
  for (const c of f.open()) { c.done = true; c.res(OK(c)); }
  await g.drain(); assert.equal(g.inFlight, 0);
});

test('launch-step attribution: a late result keeps its launch step and the impacts known at launch', async () => {
  const f = fakeRun(), g = new Green({ pods: PODS, token: 't', seed: 76103, steps: 80, run: f.run });
  const a = firstBusy(g), na = g.plan[a].length;
  const impacted = { web: true, files: true }; // red impact known when step a launches
  g.step(a, impacted);
  impacted.web = false; impacted.files = false; // red's state changes afterwards: must not change the attribution
  for (let i = a + 1; i < a + 4; i++) { g.step(i, {}); }
  // step a's actions fail now (3 steps later), with no Restore or Block seen -> red_impact by the launch impacts
  const fromA = f.calls.slice(0, na);
  for (const c of fromA) { c.done = true; c.res({ status: 1, stdout: '', stderr: 'reset' }); }
  await tick(); await tick();
  for (const c of f.open()) { c.done = true; c.res(OK(c)); }
  await g.drain();
  const recA = g.log.filter((r) => r.step === a);
  assert.equal(recA.length, na);
  assert.ok(recA.every((r) => !r.ok && r.cause === 'red_impact' && r.doneStep === a + 3), JSON.stringify(recA));
  assert.equal(g.tally.byCause.red_impact, na); assert.equal(g.tally.fail, na);
  assert.equal(g.tally.ok + g.tally.fail, g.log.length, 'tally and log agree');
  assert.equal(g.tally.byKind.http + g.tally.byKind.sftp, g.log.length);
  const order = g.log.map((r) => [r.step, r.ws]); assert.deepEqual(order, [...order].sort((x, y) => x[0] - y[0] || x[1].localeCompare(y[1])), 'log in launch order');
});

test('timeout: a hung docker call is killed at the timeout (status null), and the action fails with a cause', async () => {
  assert.equal(EXEC_TIMEOUT_MS, 20000, 'the same 20 s as before');
  const t0 = Date.now(), r = await dxAsync(['10'], { cmd: 'sleep', timeout: 150 });
  assert.equal(r.status, null); assert.equal(r.timedOut, true); assert.ok(Date.now() - t0 < 3000);
  const ok = await dxAsync(['-c', 'cat; exit 3'], { cmd: 'sh', input: 'hi' }); assert.equal(ok.status, 3); assert.equal(ok.stdout, 'hi'); assert.equal(ok.timedOut, false);
  const g = new Green({ pods: PODS, token: 't', seed: 76104, steps: 50, timeoutMs: 150, run: (args, o) => dxAsync(['10'], { ...o, cmd: 'sleep' }) });
  const i = firstBusy(g), n = g.plan[i].length; g.step(i, {});
  await g.drain();
  assert.equal(g.log.length, n); assert.ok(g.log.every((r) => !r.ok && r.cause === 'other'), 'a timed-out action with no Restore, Block or impact is other');
  assert.equal(g.inFlight, 0);
});

// ---- failure cause from harness state only, no network probe (Cyber Research, 2026-11-23, pre-data deviation) ----
import fs from 'node:fs';
import { failureCause, pairKey } from './green.mjs';
const SEG = { ws1: 'user', ws2: 'user', ws3: 'user', web: 'dmz', files: 'dmz', db: 'internal' };
const seenOf = (down = [], blocked = []) => ({ down: new Set(down), blocked: new Set(blocked) });

test('failureCause: each prereg cause from harness state (Restore down, Block pair, red impact at launch, other)', () => {
  const fc = (o) => failureCause({ ws: 'ws1', target: 'web', segmentOf: SEG, ...o });
  assert.equal(fc({ seen: seenOf(['web']) }), 'blue_restore', 'target restored');
  assert.equal(fc({ seen: seenOf(['ws1']) }), 'blue_restore', 'the workstation itself restored');
  assert.equal(fc({ seen: seenOf([], [pairKey('user', 'dmz')]) }), 'blue_block', 'user-dmz blocked at the router');
  assert.equal(fc({ seen: seenOf([], [pairKey('dmz', 'internal')]) }), 'other', 'another pair blocked is not the cause');
  assert.equal(fc({ seen: seenOf(), impacted: { web: true } }), 'red_impact');
  assert.equal(fc({ seen: seenOf(), impacted: { files: true } }), 'other', 'an impact on another service is not the cause');
  assert.equal(fc({ seen: seenOf() }), 'other');
  assert.equal(fc({ seen: seenOf(['web'], ['dmz-user']), impacted: { web: true } }), 'blue_restore', 'precedence as classifyFailure: restore, block, impact');
  assert.equal(fc({ seen: seenOf([], ['dmz-user']), impacted: { web: true } }), 'blue_block');
  assert.equal(pairKey('user', 'dmz'), 'dmz-user', 'same key as the mediator');
});

test('state over the flight: a Restore or Block reported while the action is out is its cause; state at launch counts too', async () => {
  const f = fakeRun(), g = new Green({ pods: PODS, token: 't', seed: 76105, steps: 80, run: f.run });
  const a = firstBusy(g), b = firstBusy(g, a + 1), c = firstBusy(g, b + 1);
  g.observe({ down: [], blocked: [] }); g.step(a, {});                  // launched clean, Restore of both servers comes later
  g.observe({ down: ['web', 'files'], blocked: [] });                  // the mediator restores web and files in step a
  const failOpen = async () => { for (const x of f.open()) { x.done = true; x.res({ status: 1, stdout: '', stderr: 'x' }); } await tick(); await tick(); };
  await failOpen();                                                     // step a fails after the Restore
  g.observe({ down: [], blocked: [] }); g.step(b, {});                  // launched after: none of that seen
  await failOpen();
  g.observe({ down: [], blocked: ['dmz-user'] }); g.step(c, {});        // launched while user-dmz is blocked
  g.observe({ down: [], blocked: [] });                                 // allowed again before it fails: still the cause
  await failOpen();
  await g.drain();
  assert.ok(g.log.filter((r) => r.step === a).every((r) => r.cause === 'blue_restore'));
  assert.ok(g.log.filter((r) => r.step === b).every((r) => r.cause === 'other'));
  assert.ok(g.log.filter((r) => r.step === c).every((r) => r.cause === 'blue_block'));
  assert.equal(g.flights.size, 0, 'no flight state kept after the drain');
});

test('no network probe: every action is exactly one docker exec, and green never opens web:2222 in any path', async () => {
  const outcomes = [{ status: 1, stdout: '', stderr: 'x' }, { status: null, stdout: '', stderr: '', timedOut: true }, { status: 0, stdout: 'HTTP/1.0 500', stderr: '' }, null];
  for (const outcome of outcomes) for (const st of [{}, { down: ['web', 'files'] }, { blocked: ['dmz-user'] }, { down: ['ws1', 'ws2', 'ws3'] }]) {
    const calls = [];
    const run = async (args) => { calls.push(args); return outcome || (/GET \//.test(args.at(-1)) ? { status: 0, stdout: '200 OK r0-web ok' } : { status: 0, stdout: '', stderr: '' }); };
    const g = new Green({ pods: PODS, token: 't', seed: 76106, steps: 40, run });
    let n = 0;
    for (let i = 0; i < 40; i++) { g.observe(st); n += g.step(i, { web: true, files: false }).length; }
    await g.drain();
    assert.equal(calls.length, n, 'one docker call per action, no follow-up probe or inspect');
    assert.ok(calls.every((a) => a[0] === 'exec'), 'no docker inspect');
    const text = calls.map((a) => a.join(' ')).join('\n');
    assert.ok(!text.includes('/dev/tcp/10.90.2.10/2222'), 'no connection to web:2222');
    assert.ok(!/\/dev\/tcp\/[0-9.]+\/2222/.test(text), 'no /dev/tcp probe to any 2222');
    for (const a of calls) if (a.join(' ').includes('10.90.2.10')) assert.match(a.join(' '), /\/dev\/tcp\/10\.90\.2\.10\/8080/, 'web is only reached on 8080');
  }
  const src = fs.readFileSync(new URL('./green.mjs', import.meta.url), 'utf8');
  assert.ok(!/\/dev\/tcp\/\$\{(web|files)\.ip\}\/2222/.test(src), 'the probe is gone from the source');
});

// ---- green's key re-placed after a Restore (Cyber Research, 2026-11-23, pre-data deviation) ----
import os from 'node:os';
import path from 'node:path';
import { spawnSync as spawnS } from 'node:child_process';
import { EXCLUDE_EXES } from '../sensors.mjs';
const HERE = path.dirname(new URL(import.meta.url).pathname), RANGE = path.join(HERE, '..');
const read = (f) => fs.readFileSync(path.join(RANGE, f), 'utf8');

// What a Restore keeps, read from the code that builds and restores the hosts (no Docker in unit tests):
test('Restore keeps what the servers need: svc authorized_keys and host key on the pod volume; page and share from the image', () => {
  const sshd = read('images/base/sshd_config'), med = read('mediator.mjs'), hosts = read('hosts.mjs');
  assert.match(sshd, /^AuthorizedKeysFile \/pod\/ssh\/authorized_keys$/m); assert.match(sshd, /^HostKey \/pod\/ssh\/hostkey$/m);
  assert.match(hosts, /authorized_keys/, 'seeded on the pod volume at pod start');
  const restore = med.slice(med.indexOf('  restore(host) {'), med.indexOf('  block(segA'));
  assert.ok(restore.includes('${vol}:/pod'), 'the recreated containers mount the same pod volume');
  assert.ok(!/volume', 'rm|volume rm|\/pod\/ssh/.test(restore), 'Restore never removes the volume or touches /pod/ssh');
  assert.match(read('images/web/Dockerfile'), /return 200 "r0-web ok/, 'the web page is the image\'s nginx config');
  assert.match(read('images/files/Dockerfile'), /install -d -o svc -g svc \/home\/svc\/share/, 'the share directory comes from the image');
  assert.ok(!/\/home\/svc\/share/.test(read('images/base/Dockerfile') + hosts), 'the share is not on the volume: a Restore empties it');
  const g = read('green/green.mjs'); assert.match(g, /put \/tmp\/gk \/home\/svc\/share\/\$\{name\}\\n-get \/home\/svc\/share\/\$\{name\}/, 'green reads back only the file it just put');
  assert.ok(!/db\b.*\/dev\/tcp|5432/.test(g.slice(g.indexOf('export class Green'))), 'green never touches db');
});

// A model of the range from the facts above: a Restore recreates the service container (a workstation loses /tmp/gk;
// files' share is emptied; web's nginx comes back from the image) and keeps the pod volume (authorized_keys).
function rangeModel(KEY) {
  const W = { gk: { ws1: null, ws2: null, ws3: null }, authorized: { files: true }, share: new Set(), webUp: true, failRekey: new Set() };
  const restore = (h) => { if (h in W.gk) W.gk[h] = null; if (h === 'files') W.share = new Set(); if (h === 'web') W.webUp = true; };
  const wsOf = (args) => PODS.find((p) => p.service === args[4])?.host;
  const runSync = (args, { input } = {}) => {
    const ws = wsOf(args), script = args.at(-1);
    if (W.failRekey.has(ws) && script === Green.REKEY) return { status: 1, stderr: 'no such container' };
    W.gk[ws] = String(input); return { status: 0, stdout: '', stderr: '' };
  };
  const run = async (args) => {
    const ws = wsOf(args), cmd = args.at(-1);
    if (/GET \//.test(cmd)) return W.webUp ? { status: 0, stdout: 'HTTP/1.1 200 OK\r\n\r\nr0-web ok\n' } : { status: 1, stdout: '' };
    const m = /put \/tmp\/gk \/home\/svc\/share\/(\S+)/.exec(cmd);
    if (W.gk[ws] !== KEY || !W.authorized.files) return { status: 255, stdout: '', stderr: 'Permission denied (publickey).' };
    W.share.add(m[1]); return { status: W.share.has(m[1]) ? 0 : 1, stdout: '', stderr: '' };
  };
  return { W, restore, run, runSync };
}
const keyFs = (KEY) => ({ readFileSync: () => KEY });
const stepsWith = (g, ws, kind, from) => { for (let i = from; i < g.plan.length; i++) if (g.plan[i].some((a) => a.ws === ws && a.kind === kind)) return i; return -1; };

test('after a Restore of each host type (workstation, files, web) green\'s next dependent action is ok', async () => {
  const KEY = '-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----\n';
  for (const host of ['ws1', 'ws2', 'ws3', 'files', 'web']) {
    const M = rangeModel(KEY), g = new Green({ pods: PODS, token: 'tok', seed: 76107, steps: 200, run: M.run, runSync: M.runSync, keyPath: 'k' });
    g.placeKey(keyFs(KEY));
    const ws = host.startsWith('ws') ? host : 'ws1', kind = host === 'web' ? 'http' : 'sftp';
    M.restore(host); const k = g.rekey(host, 3, keyFs(KEY));
    if (host.startsWith('ws')) assert.deepEqual({ host: k.host, step: k.step, ok: k.ok }, { host, step: 3, ok: true }); else assert.equal(k, null, 'a server needs no re-placement');
    const i = stepsWith(g, ws, kind, 4); assert.ok(i > 0);
    g.step(i, {}); await g.drain();
    const r = g.log.find((x) => x.step === i && x.ws === ws); assert.equal(r.kind, kind); assert.equal(r.ok, true, `${kind} from ${ws} after a Restore of ${host}`);
  }
  // without the re-placement (the defect): a restored workstation's next SFTP fails
  const M = rangeModel(KEY), g = new Green({ pods: PODS, token: 'tok', seed: 76107, steps: 200, run: M.run, runSync: M.runSync, keyPath: 'k' });
  g.placeKey(keyFs(KEY)); M.restore('ws2'); const i = stepsWith(g, 'ws2', 'sftp', 1); g.step(i, {}); await g.drain();
  assert.equal(g.log.find((x) => x.ws === 'ws2').ok, false);
});

test('a failed re-placement is recorded (host, step, ms, ok) and the next SFTP actions from that workstation count as other', async () => {
  const KEY = 'k\n', M = rangeModel(KEY), g = new Green({ pods: PODS, token: 'tok', seed: 76108, steps: 200, run: M.run, runSync: M.runSync, keyPath: 'k' });
  g.placeKey(keyFs(KEY)); M.W.failRekey.add('ws3'); M.restore('ws3');
  const k = g.rekey('ws3', 7, keyFs(KEY));
  assert.equal(k.ok, false); assert.equal(k.host, 'ws3'); assert.equal(k.step, 7); assert.equal(typeof k.ms, 'number'); assert.match(k.error, /no such container/);
  assert.deepEqual(g.rekeys, [k]);
  g.observe({ down: ['files'] }); // even with another cause in the state, a missing key makes it other
  const i = stepsWith(g, 'ws3', 'sftp', 8), j = stepsWith(g, 'ws3', 'http', 8);
  g.step(i, {}); await g.drain(); if (j !== i) g.step(j, {}); await g.drain(); // one in flight per workstation: let the first finish
  assert.equal(g.log.find((x) => x.step === i && x.ws === 'ws3').cause, 'other');
  assert.equal(g.log.find((x) => x.step === j && x.ws === 'ws3').ok, true, 'http needs no key');
});

test('the re-placement is a harness exec: token set, one bash process with builtins only (excluded like the mediator), no connection', () => {
  const calls = [], g = new Green({ pods: PODS, token: 'tok123', seed: 1, steps: 1, keyPath: 'k', runSync: (a, o) => { calls.push([a, o]); return { status: 0 }; } });
  g.rekey('ws2', 5, keyFs('KEY'));
  const [args, opts] = calls[0];
  assert.deepEqual(args.slice(0, 7), ['exec', '-i', '-e', 'R0_HARNESS=tok123', 'r0-t-ws2-svc', 'bash', '-c']); assert.equal(String(opts.input), 'KEY');
  assert.ok(EXCLUDE_EXES.includes('/usr/bin/bash') && EXCLUDE_EXES.includes('/bin/bash'), 'bash with the token is excluded by the sensor');
  const words = Green.REKEY.split(/[;&|]+/).map((c) => c.trim().split(/\s+/).find((w) => !/^[A-Z]+=/.test(w)));
  assert.deepEqual(words, ['umask', 'read', 'printf', '[']); // all bash builtins: no child process, no network
  assert.ok(!/\/dev\/(tcp|udp)|ssh|sftp|cat|chmod/.test(Green.REKEY));
  assert.equal(g.rekey('web', 5, keyFs('KEY')), null); assert.equal(calls.length, 1, 'no exec for a server');
});

test('the re-placement script writes the key byte for byte with mode 600 (real bash, temp path)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r0-rekey-')), f = path.join(dir, 'gk');
  try {
    const KEY = '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\nline two\n-----END OPENSSH PRIVATE KEY-----\n';
    const r = spawnS('bash', ['-c', Green.REKEY.replaceAll('/tmp/gk', f)], { input: KEY, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); assert.equal(fs.readFileSync(f, 'utf8'), KEY); assert.equal(fs.statSync(f).mode & 0o777, 0o600);
    assert.notEqual(spawnS('bash', ['-c', Green.REKEY.replaceAll('/tmp/gk', path.join(dir, 'no', 'gk'))], { input: KEY }).status, 0, 'a failed write is not ok');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('episode: the re-placement runs in the same step right after each Restore and goes in stepLog and the record', () => {
  const ep = read('episode.mjs');
  assert.match(ep, /const r = med\.restore\(h\);[^\n]*\n\s*const k = green\.rekey\(h, i, fs\); if \(k\) rekeys\.push\(k\);/);
  assert.match(ep, /greenRekey: rekeys/); assert.match(ep, /greenRekey: \{ count: green\.rekeys\.length, failed:/);
});

// ---- at most one action in flight per workstation; deferred once, then dropped (Cyber Research, 2026-11-23) ----
import { scheduleBlocks, MAX_SCHED_FRAC } from './green.mjs';
const planOf = (steps) => steps; // [[{ws,kind}], ...]
function capGreen(plan) {
  const f = fakeRun(), g = new Green({ pods: PODS, token: 't', seed: 1, steps: plan.length, run: f.run });
  g.plan = planOf(plan); return { f, g };
}
const answerAll = async (f) => { for (const c of f.open()) { c.done = true; c.res(OK(c)); } await tick(); await tick(); };

test('cap: a busy workstation defers its due action once; still busy next step -> dropped; both recorded', async () => {
  const { f, g } = capGreen([[{ ws: 'ws1', kind: 'sftp' }], [{ ws: 'ws1', kind: 'http' }], [], [{ ws: 'ws1', kind: 'http' }], []]);
  assert.equal(g.step(0, {}).length, 1); assert.equal(g.inFlight, 1);
  assert.equal(g.step(1, {}).length, 0, 'ws1 busy: deferred');
  assert.deepEqual(g.stepSched, { deferred: [{ plannedStep: 1, step: 1, ws: 'ws1', kind: 'http' }], dropped: [] });
  assert.equal(g.step(2, {}).length, 0, 'still busy at its second chance: dropped');
  assert.deepEqual(g.stepSched.dropped, [{ plannedStep: 1, step: 2, ws: 'ws1', kind: 'http' }]);
  await answerAll(f);
  assert.equal(g.step(3, {}).length, 1, 'free again: the next planned action launches');
  await answerAll(f); g.endSchedule(); await g.drain();
  assert.deepEqual({ planned: g.sched.planned, executed: g.sched.executed, deferred: g.sched.deferred, dropped: g.sched.dropped }, { planned: 3, executed: 2, deferred: 1, dropped: 1 });
  assert.equal(g.log.length, 2); assert.equal(g.tally.ok + g.tally.fail, 2, 'the tally counts executed actions only');
});

test('cap: a deferred action launched next step is attributed to its launch step, keeps its planned step, and goes first', async () => {
  const { f, g } = capGreen([[{ ws: 'ws2', kind: 'sftp' }], [{ ws: 'ws2', kind: 'http' }], [{ ws: 'ws2', kind: 'sftp' }, { ws: 'ws3', kind: 'http' }], []]);
  g.step(0, {}); g.step(1, {}); await answerAll(f);
  const l2 = g.step(2, {}).length;
  assert.equal(l2, 2, 'the deferred ws2 http and the ws3 http launch; the newly planned ws2 sftp is deferred');
  assert.deepEqual(g.stepSched.deferred, [{ plannedStep: 2, step: 2, ws: 'ws2', kind: 'sftp' }]);
  await answerAll(f); g.step(3, {}); await answerAll(f); g.endSchedule(); await g.drain();
  const h = g.log.find((r) => r.ws === 'ws2' && r.kind === 'http');
  assert.deepEqual({ step: h.step, plannedStep: h.plannedStep, deferred: h.deferred }, { step: 2, plannedStep: 1, deferred: true });
  assert.ok(g.log.filter((r) => !r.deferred).every((r) => r.step === r.plannedStep));
  assert.ok(g.log.every((r) => g.log.filter((x) => x.ws === r.ws && x.step === r.step).length === 1), 'never two launches on one workstation in a step');
});

test('cap: never more than one action in flight per workstation over a whole schedule; the episode end drops what is still deferred', async () => {
  const f = fakeRun(), g = new Green({ pods: PODS, token: 't', seed: 76109, steps: 300, run: f.run });
  let maxPer = 0;
  for (let i = 0; i < 300; i++) {
    g.step(i, {});
    const per = {}; for (const c of f.open()) { const ws = PODS.find((p) => p.service === c.args[4]).host; per[ws] = (per[ws] || 0) + 1; }
    maxPer = Math.max(maxPer, ...Object.values(per), 0);
    if (i % 3 === 2) await answerAll(f); // actions take ~3 steps
  }
  g.endSchedule(); await answerAll(f); await g.drain();
  assert.equal(maxPer, 1);
  const s = g.sched; assert.equal(s.executed + s.dropped, s.planned, 'every planned action is executed or dropped');
  assert.equal(s.droppedList.filter((d) => d.episodeEnd).length, s.droppedList.filter((d) => d.step === null).length);
  assert.ok(s.deferred > 0 && s.dropped > 0);
});

test('scheduleBlocks: deferred + dropped over 5% of planned is a stop; missing record is a stop', () => {
  assert.equal(MAX_SCHED_FRAC, 0.05);
  assert.equal(scheduleBlocks({ planned: 400, deferred: 15, dropped: 5 }), null, '5% exactly passes');
  assert.match(scheduleBlocks({ planned: 400, deferred: 16, dropped: 5 }), /deferred 16 \+ dropped 5 = 5\.3% of 400/);
  assert.match(scheduleBlocks(null), /no green schedule/);
  assert.equal(scheduleBlocks({ planned: 0, deferred: 0, dropped: 0 }), null);
});
