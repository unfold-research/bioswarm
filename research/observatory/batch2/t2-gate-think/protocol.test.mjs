import test from 'node:test';
import assert from 'node:assert/strict';
import * as p from './protocol.mjs';
import * as plain from '../t2-gate-small/protocol.mjs';
import { parseCall } from '../silo/tasks.mjs';

const fake = (answer) => ({ output: { working: '', answer }, stopReason: 'end_turn' });
test('the same instances and prompts as the second gate; only thinking, effort and the output limit differ', () => {
  const a = p.wave(0), b = plain.wave(0);
  assert.equal(a.length, 240); assert.deepEqual(a.map((r) => r.custom_id), b.map((r) => r.custom_id));
  for (let i = 0; i < a.length; i++) { const x = a[i].params, y = b[i].params;
    assert.deepEqual(x.messages, y.messages); assert.equal(x.system, y.system); assert.deepEqual(x.output_config.format, y.output_config.format);
    assert.deepEqual(x.thinking, { type: 'adaptive' }); assert.equal(x.output_config.effort, 'high'); assert.equal(x.max_tokens, 16000);
    assert.deepEqual(y.thinking, { type: 'disabled' }); assert.equal(x.tools, undefined); assert.equal(parseCall(a[i].custom_id).k, 1);
    assert.ok(Buffer.byteLength(JSON.stringify(x)) <= p.MAX_REQUEST_BYTES); }
});
test('classification of a task by its right answers per size', () => {
  const c = (...r) => p.classify(Object.fromEntries(p.SIZES.map((M, i) => [M, r[i]])));
  assert.deepEqual(c(12, 12, 11, 12, 11), { kind: 'quiet', small: 16, large: null });
  assert.deepEqual(c(12, 11, 9, 7, 2), { kind: 'falls', small: 2, large: 8 });
  assert.deepEqual(c(12, 12, 10, 9, 8), { kind: 'holds', small: 2, large: null });
  assert.deepEqual(c(10, 9, 5, 3, 0), { kind: 'never', small: null, large: null });
  assert.deepEqual(c(12, 6, 12, 5, 3), { kind: 'falls', small: 4, large: 8 }); // the largest size at the ceiling counts
});
test('verdicts', () => {
  const tab = (rows) => Object.fromEntries(p.TASKS.map((t, ti) => [t, Object.fromEntries(p.SIZES.map((M, i) => [M, { right: rows[ti][i] }]))]));
  const q = [12, 12, 12, 12, 12], f = [12, 12, 9, 6, 2], h = [12, 12, 10, 9, 8], n = [9, 8, 5, 3, 0];
  assert.equal(p.decide(tab([q, f, f, n])).verdict, 'proceed');
  assert.equal(p.decide(tab([q, f, h, n])).verdict, 'extend-sizes');
  assert.equal(p.decide(tab([q, q, q, q])).verdict, 'extend-sizes');
  assert.equal(p.decide(tab([q, f, n, n])).verdict, 'revise');
  assert.deepEqual(p.decide(tab([q, f, f, n])).falls, [p.TASKS[1], p.TASKS[2]]);
});
test('score and summarize a full wave of right answers', () => {
  const rows = p.wave(0), out = new Map(rows.map((r) => [r.custom_id, fake(p.cell(r.meta.task, r.meta.M).instances[r.meta.i].answer)]));
  const scored = p.score(0, rows, out); assert.equal(p.gate(0, scored), null);
  assert.deepEqual(p.summarize([scored]).decision.quiet, p.TASKS);
});
