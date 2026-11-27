import test from 'node:test';
import assert from 'node:assert/strict';
import * as p from './protocol.mjs';
import { TASKS, INSTANCES, MANIFEST, cell, split, parseCall, grade, callId, tokensByRun } from '../silo/tasks.mjs';
import { wave as regimeWave, answerOf, WAVES_OF, REGIME_OF } from '../silo/regimes.mjs';

const fake = (answer, stopReason = 'end_turn') => ({ output: { working: '', answer }, stopReason });

test('one request per instance, unique ids, under the request ceiling', () => {
  const rows = p.wave(0);
  assert.equal(rows.length, TASKS.length * p.SIZES.length * INSTANCES);
  assert.equal(new Set(rows.map((r) => r.custom_id)).size, rows.length);
  for (const r of rows) { assert.ok(/^[a-zA-Z0-9_-]{1,64}$/.test(r.custom_id)); assert.ok(Buffer.byteLength(JSON.stringify(r.params)) <= p.MAX_REQUEST_BYTES); assert.equal(parseCall(r.custom_id).k, 1); }
});
test('the export matches the manifest and the chosen tasks passed the leak probe', () => {
  for (const t of TASKS) { assert.ok(MANIFEST.probe.passed.includes(t)); for (const M of p.SIZES) { const c = cell(t, M); assert.equal(c.instances.length, INSTANCES); assert.ok(c.instances.every((x) => x.shards.length === M && Number.isInteger(x.answer))); assert.ok(MANIFEST.probe.modalShare[t][M] <= MANIFEST.probe.maxModalShare); } }
});
test('a request shows every shard once and never the answer field', () => {
  const c = cell('I-06', 16), inst = c.instances[0], text = p.wave(0).find((r) => r.custom_id === callId('I-06', 16, 0, 1, 0, 0)).params.messages[0].content;
  for (let s = 0; s < 16; s++) assert.ok(text.includes(`Shard ${s}: ${JSON.stringify(inst.shards[s])}`));
  assert.ok(!text.includes('"answer"'));
});
test('grading: exact integer only; a truncated reply is wrong but not invalid', () => {
  const inst = cell('I-05', 16).instances[3];
  assert.deepEqual(grade(fake(inst.answer), inst), { valid: true, truncated: false, answer: inst.answer, right: true });
  assert.equal(grade(fake(inst.answer + 1), inst).right, false);
  assert.deepEqual(grade({ output: null, stopReason: 'max_tokens' }, inst), { valid: true, truncated: true, answer: null, right: false });
  assert.equal(grade({ output: null, stopReason: 'end_turn' }, inst).valid, false);
});
test('gate decision: proceed, no degradation, not at ceiling', () => {
  const tab = (f) => Object.fromEntries(TASKS.map((t, ti) => [t, Object.fromEntries(p.SIZES.map((M) => [M, { right: f(M, ti) }]))]));
  assert.deepEqual((({ small, middle, large, verdict }) => ({ small, middle, large, verdict }))(p.decide(tab((M) => (M <= 64 ? 12 : M === 256 ? 9 : 3)))), { small: 64, middle: 256, large: 1024, verdict: 'proceed' });
  assert.equal(p.decide(tab(() => 12)).verdict.startsWith('no-degradation'), true);
  assert.equal(p.decide(tab(() => 8)).verdict.startsWith('not-at-ceiling'), true);
  assert.equal(p.decide(tab((M, ti) => (M < 1024 ? 12 : ti === 0 ? 0 : 9))).large, null); // at the floor on one task only
});
test('score and summarize a full wave of right answers', () => {
  const rows = p.wave(0), out = new Map(rows.map((r) => [r.custom_id, fake(cell(r.meta.task, r.meta.M).instances[r.meta.i].answer)]));
  const scored = p.score(0, rows, out); assert.equal(p.gate(0, scored), null); assert.ok(scored.every((x) => x.right));
  assert.equal(p.summarize([scored]).decision.verdict.startsWith('no-degradation'), true);
});
test('k agents: shards split evenly, both regimes chain their waves and return the collective answer', () => {
  assert.deepEqual(split([1, 2, 3, 4], 2), [{ first: 0, shards: [1, 2] }, { first: 2, shards: [3, 4] }]);
  assert.throws(() => split([1, 2, 3], 2));
  for (const task of ['I-02', 'III-22']) for (const k of [2, 4, 8]) {
    const c = cell(task, 16), inst = c.instances[5], regime = REGIME_OF(task), out = new Map(); let calls = 0;
    for (let w = 0; w < WAVES_OF[regime]; w++) { const rows = regimeWave(c, inst, k, w, out); calls += rows.length;
      for (const r of rows) { assert.ok(/^[a-zA-Z0-9_-]{1,64}$/.test(r.custom_id)); out.set(r.custom_id, { output: r.meta.kind === 'answer' ? { working: '', answer: inst.answer } : { working: '', partial: `p${r.meta.agent}`, note: `n${r.meta.agent}` }, stopReason: 'end_turn' }); }
      if (w === 1) assert.ok(rows[0].params.messages[0].content.includes(regime === 'reduce' ? 'Agent 1 (shards' : 'Agent 1: n1')); }
    assert.equal(calls, regime === 'reduce' ? k + 1 : 3 * k);
    assert.equal(answerOf(c, inst, k, out).right, true);
  }
  const c = cell('III-22', 16), inst = c.instances[0], out = new Map([[callId('III-22', 16, 0, 2, 2, 0), fake(1)], [callId('III-22', 16, 0, 2, 2, 1), fake(2)]]);
  assert.equal(answerOf(c, inst, 2, out).answer, null); // a tie is no answer
});
test('token ledger sums every call of a run', () => {
  const row = (id, i, o) => ({ customId: id, usage: { input_tokens: i, output_tokens: o }, usageCostUsd: 0.001 });
  const runs = tokensByRun([row(callId('I-02', 16, 0, 2, 0, 0), 100, 10), row(callId('I-02', 16, 0, 2, 0, 1), 110, 12), row(callId('I-02', 16, 0, 2, 1, 'm'), 50, 5), row(callId('I-02', 16, 0, 1, 0, 0), 200, 20)]);
  assert.deepEqual(runs.map((r) => [r.k, r.calls, r.input, r.output]), [[2, 3, 260, 27], [1, 1, 200, 20]]);
  assert.throws(() => tokensByRun([row('other', 1, 1)]));
});
