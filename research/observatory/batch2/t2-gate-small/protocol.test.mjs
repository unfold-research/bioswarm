import test from 'node:test';
import assert from 'node:assert/strict';
import * as p from './protocol.mjs';
import { instanceSet, parseCall, callId } from '../silo/tasks.mjs';

const SET = instanceSet('small'), fake = (answer) => ({ output: { working: '', answer }, stopReason: 'end_turn' });
test('one request per instance, unique ids, under the request ceiling', () => {
  const rows = p.wave(0);
  assert.equal(rows.length, 4 * 5 * 12); assert.deepEqual(p.SIZES, [1, 2, 4, 8, 16]); assert.deepEqual(p.TASKS, ['I-01', 'I-05', 'I-06', 'III-22']);
  assert.equal(new Set(rows.map((r) => r.custom_id)).size, rows.length);
  for (const r of rows) { assert.ok(/^[a-zA-Z0-9_-]{1,64}$/.test(r.custom_id)); assert.ok(Buffer.byteLength(JSON.stringify(r.params)) <= p.MAX_REQUEST_BYTES); assert.equal(parseCall(r.custom_id).k, 1); }
});
test('the set matches its manifest and every task passed the leak probe at every size', () => {
  for (const t of p.TASKS) for (const M of p.SIZES) { const c = p.cell(t, M); assert.ok(c.instances.every((x) => x.shards.length === M && Number.isInteger(x.answer))); assert.ok(SET.manifest.probe.modalShare[t][M] <= SET.manifest.probe.maxModalShare); }
});
test('the 16-shard instances of the tasks shared with the first gate are the same instances', () => {
  const first = instanceSet();
  for (const t of ['I-05', 'I-06', 'III-22']) assert.deepEqual(p.cell(t, 16).instances, first.cell(t, 16).instances);
});
test('a request shows every shard once and reads well with one shard', () => {
  const inst = p.cell('I-06', 1).instances[0], text = p.wave(0).find((r) => r.custom_id === callId('I-06', 1, 0, 1, 0, 0)).params.messages[0].content;
  assert.ok(text.includes(`Shard 0: ${JSON.stringify(inst.shards[0])}`)); assert.ok(text.includes('in 1 shard.')); assert.ok(!text.includes('"answer"'));
});
test('gate decision', () => {
  const tab = (f) => Object.fromEntries(p.TASKS.map((t, ti) => [t, Object.fromEntries(p.SIZES.map((M) => [M, { right: f(M, ti) }]))]));
  const pick = ({ small, middle, large, verdict }) => ({ small, middle, large, verdict });
  assert.deepEqual(pick(p.decide(tab((M) => (M <= 2 ? 12 : M <= 8 ? 9 : 3)))), { small: 2, middle: 4, large: 16, verdict: 'proceed' });
  assert.deepEqual(pick(p.decide(tab((M) => (M <= 4 ? 12 : 3)))), { small: 4, middle: null, large: 8, verdict: 'proceed' });
  assert.equal(p.decide(tab(() => 12)).verdict, 'no-degradation-in-range');
  assert.ok(p.decide(tab(() => 8)).verdict.startsWith('not-at-ceiling'));
  assert.equal(p.decide(tab((M, ti) => (M < 16 ? 12 : ti === 0 ? 0 : 9))).large, null);
});
test('score and summarize a full wave of right answers', () => {
  const rows = p.wave(0), out = new Map(rows.map((r) => [r.custom_id, fake(p.cell(r.meta.task, r.meta.M).instances[r.meta.i].answer)]));
  const scored = p.score(0, rows, out); assert.equal(p.gate(0, scored), null); assert.ok(scored.every((x) => x.right));
  assert.equal(p.summarize([scored]).decision.verdict, 'no-degradation-in-range');
});
