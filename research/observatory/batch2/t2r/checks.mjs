import test from 'node:test';
import assert from 'node:assert/strict';
import { instances, cell, agree, plurality, POLICIES, attemptId, FIRST, MORE } from './protocol.mjs';
import { study as mapStudy } from '../t2-map/protocol.mjs';
import { MAX_REQUEST_BYTES } from '../silo/tasks.mjs';

export function check(mod, which) {
  const attempts = which === 'first' ? FIRST : MORE, n = instances().length;
  test(`${mod.ID}: attempts are the map's single-agent request, repeated`, () => {
    assert.equal(n, 288); const rows = mod.wave(0), solo = new Map(mapStudy('solo', 1).wave(0).map((r) => [`${r.meta.task}/${r.meta.M}/${r.meta.i}`, r.params]));
    assert.equal(rows.length, n * attempts.length); assert.equal(new Set(rows.map((r) => r.custom_id)).size, rows.length);
    for (const r of rows) { assert.ok(/^[a-zA-Z0-9_-]{1,64}$/.test(r.custom_id)); assert.deepEqual(r.params, solo.get(`${r.meta.task}/${r.meta.M}/${r.meta.i}`)); assert.ok(attempts.includes(r.meta.attempt)); }
  });
  test(`${mod.ID}: scoring, gate and summary`, () => {
    const rows = mod.wave(0), out = new Map(rows.map((r) => [r.custom_id, { output: { working: 'w', answer: cell(r.meta.task, r.meta.M).instances[r.meta.i].answer }, stopReason: 'end_turn' }]));
    const sc = mod.score(0, rows, out); assert.equal(mod.gate(0, sc), null); assert.ok(sc.every((x) => x.right));
    assert.equal(mod.gate(0, mod.score(0, rows, new Map())), 'invalid-output-stop');
    if (which === 'first') { const j = mod.wave(1, out), top = mod.ceiling(1); assert.equal(j.length, n); assert.equal(mod.WAVES, 2);
      j.forEach((r, k) => { const text = r.params.messages[0].content, inst = cell(r.meta.task, r.meta.M).instances[r.meta.i]; assert.ok(text.includes(`The agent's answer: ${inst.answer}`)); assert.ok(!text.includes('Shard 0:')); assert.ok(Buffer.byteLength(JSON.stringify(r.params)) <= Buffer.byteLength(JSON.stringify(top[k].params))); assert.ok(Buffer.byteLength(JSON.stringify(top[k].params)) <= MAX_REQUEST_BYTES); });
      const js = mod.score(1, j, new Map(j.map((r, k) => [r.custom_id, { output: { reason: '', repeat: k % 2 === 0 }, stopReason: 'end_turn' }]))); assert.equal(mod.gate(1, js), null); assert.equal(mod.summarize([sc, js]).judgeRepeat, n / 2);
      const none = mod.wave(1, new Map())[0].params.messages[0].content; assert.ok(none.includes('[no answer]')); }
    else assert.equal(mod.WAVES, 1);
  });
  test(`${mod.ID}: policies`, () => {
    assert.deepEqual(agree([7, 7, 1, 1, 1]), { answer: 7, used: 2 }); assert.deepEqual(agree([7, 8, 8, 7, 7]), { answer: 8, used: 3 }); assert.deepEqual(agree([7, 8, 9, 7, 8]), { answer: 7, used: 4 });
    assert.deepEqual(agree([1, 2, 3, 4, 5]), { answer: null, used: 5 }); assert.deepEqual(agree([null, 4, null, 4, 9]), { answer: 4, used: 4 });
    assert.deepEqual(plurality([7, 8, 8, 1, 1], 3), { answer: 8, used: 3 }); assert.deepEqual(plurality([7, 8, 9, 1, 1], 3), { answer: null, used: 3 }); assert.deepEqual(plurality([7, 8, 9, 9, 8], 5), { answer: null, used: 5 }); assert.deepEqual(plurality([7, 8, 9, 9, 9], 5), { answer: 9, used: 5 });
    assert.deepEqual(POLICIES.one([3, 4, 4, 4, 4]), { answer: 3, used: 1 }); assert.deepEqual(POLICIES.judge([3, 4, 4, 4, 4], false), { answer: 3, used: 1, judged: true });
    assert.deepEqual(POLICIES.judge([3, 4, 4, 4, 4], true), { answer: 4, used: 3, judged: true }); assert.deepEqual(POLICIES.judge([3, 3, 4, 4, 4], null), { answer: 3, used: 2, judged: true });
    assert.ok(attemptId(cell('I-05', 4), cell('I-05', 4).instances[0], 2).endsWith('_k1_w0_at2'));
  });
}
