// Unit tests of the episode runner's pure logic (no Docker, no sensors): node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreSteps, cooldownFor, median, isOverrun, decideBlue, PRIORITY, SEGMENT_OF, SERVERS } from './episode.mjs';

test('restore time in steps = ceil(median restore ms / step ms); cooldowns are its multiples (prereg)', () => {
  assert.equal(restoreSteps(7000, 2000), 4);
  assert.equal(restoreSteps(6000, 2000), 3);
  assert.equal(restoreSteps(100, 2000), 1); // at least one step
  const rs = restoreSteps(7000, 2000);
  assert.equal(cooldownFor('react', rs), rs, 'react = 1 x restore (CC4 5 to 5)');
  assert.equal(cooldownFor('disinfect-cd10', rs), 2 * rs, 'disinfect = 2 x restore (CC4 10 to 5)');
  assert.equal(cooldownFor('sleep', rs), 0);
  // recomputed at a 3 s step from the same durations
  assert.equal(restoreSteps(7000, 3000), 3);
});

test('median and the overrun rule (110% of the step)', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(isOverrun(2201, 2000), true);
  assert.equal(isOverrun(2200, 2000), false);
  assert.equal(isOverrun(3301, 3000), true); // 110% of a 3 s step is 3.3 s
});

test('servers are ordered first; each host maps to a segment', () => {
  assert.ok(PRIORITY('web') < PRIORITY('ws1'));
  assert.ok(PRIORITY('db') < PRIORITY('ws2'));
  assert.deepEqual(SERVERS, ['web', 'db', 'files']);
  assert.equal(SEGMENT_OF.web, 'dmz');
  assert.equal(SEGMENT_OF.ws1, 'user');
  assert.equal(SEGMENT_OF.db, 'internal');
});

test('sleep never acts; react acts on a suspicious PROCESS only; disinfect on process OR connection', () => {
  const cuesC = { web: { suspiciousProcess: false, suspiciousConnection: true } };
  assert.deepEqual(decideBlue('sleep', cuesC, { step: 5, cooldownSteps: 0 }), []);
  assert.deepEqual(decideBlue('react', cuesC, { step: 5, cooldownSteps: 0 }), [], 'react ignores a connection-only cue');
  assert.deepEqual(decideBlue('disinfect-cd10', cuesC, { step: 5, cooldownSteps: 0 }), ['web']);
  const cuesP = { web: { suspiciousProcess: true, suspiciousConnection: false } };
  assert.deepEqual(decideBlue('react', cuesP, { step: 5, cooldownSteps: 0 }), ['web']);
});

test('servers first, one Restore per segment, cooldown and down-hosts respected', () => {
  const cues = {
    web: { suspiciousProcess: true }, db: { suspiciousProcess: true }, // dmz, internal
    ws1: { suspiciousProcess: true }, ws2: { suspiciousProcess: true }, // both user segment
    router: { suspiciousProcess: true },
  };
  const got = decideBlue('react', cues, { step: 10, cooldownSteps: 6 });
  // one per segment: dmz -> web, internal -> db, user -> ws1 (servers first, then lowest ws); router never
  assert.deepEqual(got.sort(), ['db', 'web', 'ws1']);
  // cooldown: web restored at step 7, cd 6 -> not eligible at step 10
  const cd = decideBlue('react', { web: { suspiciousProcess: true } }, { step: 10, cooldownSteps: 6, lastRestore: { web: 7 } });
  assert.deepEqual(cd, []);
  const cdOk = decideBlue('react', { web: { suspiciousProcess: true } }, { step: 14, cooldownSteps: 6, lastRestore: { web: 7 } });
  assert.deepEqual(cdOk, ['web']);
  // a host currently down is not restored again
  assert.deepEqual(decideBlue('react', { web: { suspiciousProcess: true } }, { step: 10, cooldownSteps: 0, downHosts: new Set(['web']) }), []);
});

// ---- Cyber Research decision of 2026-11-22: rules 1, 3 and 4 ----
import { hostStates, dropLate, validity, loadGate, timeToDetect, SENSOR_LATE_MS, MAX_LATE_FRAC, MAX_LOAD1 } from './episode.mjs';

test('rule 1: a late reply is sensor-late, never down; a stall over 1.5 s marks the whole step', () => {
  const obs = { ms: 900, hosts: { web: { up: false, error: 'timeout' }, db: { up: false, error: 'stream ended' }, ws1: { up: true } } };
  const hs = hostStates(obs);
  assert.deepEqual(hs.states, { web: 'sensor-late', db: 'down', ws1: 'up' });
  assert.equal(hs.late, true);
  assert.deepEqual(hs.lateHosts, ['web']);
  assert.equal(SENSOR_LATE_MS, 1500);
  assert.equal(hostStates({ ms: 1501, hosts: { ws1: { up: true } } }).late, true, 'a benchhost stall marks the step');
  assert.equal(hostStates({ ms: 1500, hosts: { ws1: { up: true } } }).late, false);
});

test('rule 1: a sensor-late host triggers no action and the step is left out of time-to-detect', () => {
  const c = { web: { suspiciousProcess: true }, db: { suspiciousProcess: true } };
  const kept = dropLate(c, ['web']);
  assert.deepEqual(Object.keys(kept), ['db']);
  assert.deepEqual(decideBlue('react', kept, { step: 3, cooldownSteps: 0 }), ['db'], 'web (late) is not restored');
  const log = [
    { step: 4, sensorLate: false, cues: {} },
    { step: 5, sensorLate: true, cues: {} },
    { step: 6, sensorLate: true, cues: {} },
    { step: 7, sensorLate: false, cues: { web: { suspiciousProcess: true } } },
  ];
  assert.deepEqual(timeToDetect(log, [{ step: 4, stage: 'lateral' }], 'web'), { web: 1 }, 'two late steps are not charged');
  assert.deepEqual(timeToDetect(log.slice(0, 3), [{ step: 4, stage: 'lateral' }], 'web'), { web: null });
});

test('rule 3: more than 5% sensor-late steps makes the episode invalid', () => {
  const mk = (n, late) => Array.from({ length: n }, (_, i) => ({ step: i, sensorLate: i < late }));
  assert.equal(MAX_LATE_FRAC, 0.05);
  assert.deepEqual(validity(mk(300, 15)), { lateSteps: 15, lateFrac: 0.05, valid: true });
  assert.equal(validity(mk(300, 16)).valid, false);
  assert.equal(validity([]).valid, true);
});

test('rule 4: no episode starts with a 1-minute load above 2', () => {
  assert.equal(MAX_LOAD1, 2);
  assert.equal(loadGate(2).ok, true);
  assert.equal(loadGate(2.01).ok, false);
  assert.equal(loadGate(0.4).ok, true);
});

import { procErrorsSummary } from './episode.mjs';
test('procErrors per host per step in the record: totals, max in a step, steps with any, and the per-step counts', () => {
  const log = [{ procErrors: { total: 2, byHost: { files: 2 } } }, { procErrors: { total: 0, byHost: {} } }, { procErrors: { total: 4, byHost: { files: 1, web: 3 } } }, {}];
  assert.deepEqual(procErrorsSummary(log), { byHost: { files: { total: 3, max: 2, steps: 2 }, web: { total: 3, max: 3, steps: 1 } }, perStep: [{ files: 2 }, {}, { files: 1, web: 3 }, {}] });
});
test('step order: red, then the sensor read, then green (and green.observe), then blue', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('./episode.mjs', import.meta.url), 'utf8');
  const loop = src.slice(src.indexOf('for (let i = 0; i < steps; i++)'));
  const at = (re) => loop.search(re);
  assert.ok(at(/red\.step\(i/) < at(/await sensors\.step\(\)/) && at(/await sensors\.step\(\)/) < at(/green\.step\(i/) && at(/green\.step\(i/) < at(/decideBlue\(/));
});
