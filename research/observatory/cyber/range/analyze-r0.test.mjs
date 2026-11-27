// Unit tests of the R0 pilot gate (analyze-r0.mjs), one per point of Cyber Research's review of PR #164. node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { gate, containmentOf, PILOT } from './analyze-r0.mjs';

const cont = () => ({ canaryStart: { hosts: 7, targets: 40, reached: 0 }, canaryEnd: { hosts: 7, targets: 40, reached: 0 }, control: { day: '2026-11-23', detected: true }, leftovers: { checked: true, containers: 0, networks: 0 } });
const ep = (arm, seed, repeat, o = {}) => ({ kind: 'pilot', arm, seed, repeat, steps: 300, stepMs: 2000, valid: true, overrunRate: 0, green: { ok: 100 },
  red: { furthest: 'impact', impacted: { web: true }, target: 'web', impact: 'stop-web' }, containment: cont(), ...o });
const full = () => { const out = []; for (const a of PILOT.arms) for (const s of PILOT.seeds) for (let r = 1; r <= 3; r++) out.push(ep(a, s, r)); return out; };
const baseRecs = () => [{ kind: 'baseline', seed: 76101, steps: 300, valid: true, containment: cont() }, { kind: 'timing', seed: 76201, containment: cont() }];
const controls = [{ day: '2026-11-23', detected: true }];
const run = (eps, c = controls) => gate([...baseRecs(), ...eps], c);

test('a clean pilot passes every item', () => {
  const g = run(full());
  for (const [k, v] of Object.entries(g)) assert.equal(v.pass, true, k);
  assert.equal(g.repeatability.cellsTotal, 9);
});

test('(1) containment: missing record, a reached target, an untested canary, leftovers, or no control fail', () => {
  assert.equal(containmentOf({}).ok, false);
  for (const bad of [
    (c) => { c.canaryStart.reached = 1; }, (c) => { c.canaryEnd.targets = 0; }, (c) => { delete c.canaryEnd; },
    (c) => { c.control.detected = false; }, (c) => { c.leftovers.containers = 1; }, (c) => { delete c.leftovers; }]) {
    const eps = full(); bad(eps[4].containment); assert.equal(run(eps).containment.pass, false);
  }
  const eps = full(); delete eps[0].containment; assert.equal(run(eps).containment.pass, false, 'no record');
  const b = [{ kind: 'timing', seed: 76201 }]; assert.equal(gate([...b, ...full()], controls).containment.pass, false, 'timing episodes count too');
  assert.equal(run(full(), []).containment.pass, false, 'no control day logged');
  assert.equal(run(full(), [{ day: 'x', detected: false }]).containment.pass, false);
});

test('(2) completion: steps must be 300 (no pass without stepMs), harness failures and missing episodes count, max 1 of 27', () => {
  let eps = full(); eps[0].steps = 120; delete eps[0].stepMs;
  let g = run(eps).completion; assert.equal(g.excluded.length, 1); assert.match(g.excluded[0].cause, /120 steps/);
  eps = full(); eps[0] = { kind: 'pilot', arm: 'sleep', seed: 76001, repeat: 1, steps: 0, valid: false, harnessFailure: { cause: 'ssh to web timed out' } };
  g = run(eps).completion; assert.equal(g.pass, true); assert.equal(g.excluded[0].cause, 'ssh to web timed out');
  eps.pop(); g = run(eps).completion; assert.equal(g.pass, false, 'a missing episode is a second failure'); assert.equal(g.excluded.length, 2);
  eps = full(); eps[3].valid = false; assert.equal(run(eps).completion.pass, false, 'an invalid complete episode fails');
});

test('(3) repeatability is keyed by (arm, seed): a target change between repeats fails the cell instead of splitting it', () => {
  const eps = full(); eps[1].red = { ...eps[1].red, target: 'db' };
  const g = run(eps).repeatability; assert.equal(g.cellsTotal, 9); assert.equal(g.cellsOk, 8);
  assert.equal(g.cells.find((c) => c.cell === 'sleep|76001').sameTarget, false);
  const e2 = full(); e2[1].red = { ...e2[1].red, impact: 'xor-files' }; assert.equal(run(e2).repeatability.cellsOk, 8, 'impact kind too');
  const e3 = full(); e3.splice(0, 1); e3.splice(2, 1); assert.equal(run(e3).repeatability.pass, false, 'two cells short of 3 repeats');
});

test('(4) red works: fixed denominator 9; a failed or missing sleep slot counts as no impact', () => {
  const eps = full().filter((e) => !(e.arm === 'sleep' && e.seed === 76003 && e.repeat === 3));
  let g = run(eps).redWorks; assert.equal(g.of, 9); assert.equal(g.impacts, 8); assert.equal(g.pass, true); assert.equal(g.slotsWithoutValidRecord, 1);
  const e2 = full(); e2[0].red = { ...e2[0].red, furthest: 'persistence' }; e2[1] = { kind: 'pilot', arm: 'sleep', seed: 76001, repeat: 2, steps: 0, valid: false, harnessFailure: { cause: 'x' } };
  g = run(e2).redWorks; assert.equal(g.impacts, 7); assert.equal(g.pass, false);
});

const fail = (arm, seed, repeat, cause = 'ssh to web timed out') => ({ kind: 'pilot', arm, seed, repeat, steps: 0, valid: false, harnessFailure: { cause } });
test('one harness failure with its cause still lets the whole gate pass (prereg: at most 1 of 27)', () => {
  for (const [arm, seed, rep] of [['sleep', 76002, 2], ['react', 76001, 1], ['disinfect-cd10', 76003, 3]]) {
    const eps = full().map((e) => (e.arm === arm && e.seed === seed && e.repeat === rep ? fail(arm, seed, rep) : e));
    const g = run(eps);
    for (const [k, v] of Object.entries(g)) assert.equal(v.pass, true, `${k} with one failure at ${arm}|${seed}|${rep}`);
    assert.equal(g.repeatability.cellsTotal, 9); assert.equal(g.repeatability.cellsOk, 8);
    if (arm === 'sleep') { assert.equal(g.redWorks.of, 9); assert.equal(g.redWorks.impacts, 8); }
  }
});
test('two harness failures fail the gate', () => {
  const eps = full().map((e) => ((e.arm === 'react' && e.seed === 76001 && e.repeat === 1) || (e.arm === 'react' && e.seed === 76002 && e.repeat === 1) ? fail(e.arm, e.seed, e.repeat) : e));
  const g = run(eps); assert.equal(g.completion.pass, false); assert.equal(g.repeatability.cellsOk, 7); assert.equal(g.repeatability.pass, false);
  const e2 = full(); e2.splice(e2.findIndex((e) => e.arm === 'react'), 1);
  const c2 = run(e2).completion; assert.equal(c2.excluded[0].cause, 'episode record missing'); assert.equal(c2.pass, false, 'one missing episode with no recorded cause fails item 2');
});

test('(5) timing: a missing overrun rate fails, it is not counted as 0', () => {
  const eps = full(); delete eps[5].overrunRate;
  const g = run(eps).timing; assert.equal(g.missingRate, 1); assert.equal(g.pass, false);
  const e2 = full(); e2[5].overrunRate = 0.03; assert.equal(run(e2).timing.pass, false);
});

import { rekeySummary } from './analyze-r0.mjs';
test('report: green key re-placements after a Restore, with every failure and its episode', () => {
  const eps = [{ arm: 'react', seed: 76001, repeat: 1, greenRekey: { count: 2, failed: 1, list: [{ host: 'ws1', step: 4, ms: 300, ok: true }, { host: 'ws2', step: 9, ms: 20001, ok: false, error: 'timeout' }] } }, { arm: 'sleep', seed: 76002 }];
  assert.deepEqual(rekeySummary(eps), { count: 2, failed: 1, failures: [{ arm: 'react', seed: 76001, repeat: 1, host: 'ws2', step: 9, ms: 20001, ok: false, error: 'timeout' }] });
});

import { scheduleByGroup, procErrorsByGroup } from './analyze-r0.mjs';
test('report: green planned/executed/deferred/dropped per arm (and the baseline as its own group)', () => {
  const eps = [{ kind: 'pilot', arm: 'react', greenSchedule: { planned: 400, executed: 396, deferred: 5, dropped: 4 } }, { kind: 'pilot', arm: 'react', greenSchedule: { planned: 410, executed: 410, deferred: 0, dropped: 0 } },
    { kind: 'baseline', arm: 'sleep', greenSchedule: { planned: 300, executed: 300, deferred: 1, dropped: 0 } }, { kind: 'timing' }];
  const g = scheduleByGroup(eps);
  assert.deepEqual(g.react, { episodes: 2, planned: 810, executed: 806, deferred: 5, dropped: 4, deferredDroppedRate: 9 / 810 });
  assert.equal(g.baseline.planned, 300); assert.equal(g.timing, undefined);
});
test('report: reader error lines per arm and host (does it grow with red?)', () => {
  const eps = [{ kind: 'pilot', arm: 'sleep', procErrors: { byHost: { files: { total: 40, max: 3, steps: 30 } } } }, { kind: 'pilot', arm: 'sleep', procErrors: { byHost: { files: { total: 20, max: 5, steps: 10 }, web: { total: 2, max: 1, steps: 2 } } } }];
  const g = procErrorsByGroup(eps);
  assert.deepEqual(g.sleep.hosts.files, { total: 60, maxInStep: 5, meanPerEpisode: 30 }); assert.equal(g.sleep.hosts.web.meanPerEpisode, 1);
});
