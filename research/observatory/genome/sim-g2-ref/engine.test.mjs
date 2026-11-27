import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, TASKS, FLAGS } from './engine.mjs';
import { archetypes } from './regimes.mjs';

const run = (o) => simulate({ seed: 7, params: { R: 80 }, ...o });

test('deterministic for the same inputs, different across seeds', () => {
  const a = run({ task: TASKS.maintain(), flags: ['FLD-01'] }), b = run({ task: TASKS.maintain(), flags: ['FLD-01'] });
  assert.deepEqual(a, b);
  const c = simulate({ task: TASKS.maintain(), flags: ['FLD-01'], seed: 8, params: { R: 80 } });
  assert.notEqual(a.score, c.score);
});

test('every task and every flag runs and scores in [0, 1]', () => {
  for (const t of Object.keys(TASKS)) for (const fl of [[], ...FLAGS.map((x) => [x]), FLAGS]) {
    const r = run({ task: TASKS[t](), flags: fl, threat: 0.2 });
    assert.ok(r.score >= 0 && r.score <= 1, `${t} ${fl}`);
    assert.ok(r.actions > 0 && r.actions <= 1);
  }
});

test('the schedule sweeps without communication and resting saves actions', () => {
  assert.ok(run({ task: TASKS.maintain(), sched: true }).score > 0);
  assert.ok(run({ task: TASKS.maintain(), flags: ['REG-05'] }).actions < run({ task: TASKS.maintain(), flags: [] }).actions);
});

test('compromised members are caught only when they lie and defence is on', () => {
  const r = run({ task: TASKS.maintain(), flags: ['FLD-01', 'DEF-01', 'DEF-04'], threat: 0.2, params: { R: 300 } });
  assert.ok(r.trueFlags > 0);
  const clean = run({ task: TASKS.maintain(), flags: ['FLD-01', 'DEF-01', 'DEF-04'], threat: 0, params: { R: 300 } });
  assert.equal(clean.trueFlags, 0);
});

test('archetypes compile from G1 with only simulated flags', () => {
  const A = archetypes();
  assert.deepEqual(Object.keys(A), ['colony', 'flock', 'school', 'team', 'chemical']);
  for (const a of Object.values(A)) { assert.ok(a.flags.length > 0); assert.ok(a.flags.every((f) => FLAGS.includes(f))); }
  assert.ok(A.team.flags.includes('DOL-04'));
  assert.ok(A.flock.flags.includes('SIG-06'));
});
