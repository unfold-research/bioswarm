// Offline checks shared by the seven studies of the map. Each study's protocol.test.mjs calls check() on its own module.
import test from 'node:test';
import assert from 'node:assert/strict';
import { study, INSTANCES, cell, sizesOf, tasksOf } from './protocol.mjs';
import { MAX_REQUEST_BYTES, parseCall } from '../silo/tasks.mjs';

export function check(mod, regime, k) {
  const s = study(regime, k), nRuns = tasksOf(regime).length * sizesOf(k).length * INSTANCES, callsPerRun = regime === 'solo' ? [1] : regime === 'reduce' ? [k, 1] : [k, k, k];
  const reply = (q, right = true) => ({ output: q.meta.kind === 'answer' ? { working: '', answer: cell(q.meta.task, q.meta.M).instances[q.meta.i].answer + (right ? 0 : 1) } : { working: '', partial: `p${q.meta.agent}`, note: `n${q.meta.agent}` }, stopReason: 'end_turn' });
  test(`${mod.ID}: the module is the study of this regime and size`, () => { assert.equal(mod.ID, s.ID); assert.equal(mod.WAVES, callsPerRun.length); assert.equal(s.runs().length, nRuns); assert.ok(sizesOf(k).every((M) => k === 1 || M / k >= 2)); });
  test(`${mod.ID}: every wave has the expected calls, with thinking, under the ceilings`, () => {
    const out = new Map(), seen = new Set();
    for (let w = 0; w < mod.WAVES; w++) { const rows = mod.wave(w, out), top = mod.ceiling(w);
      assert.equal(rows.length, nRuns * callsPerRun[w]); assert.equal(top.length, rows.length);
      for (let j = 0; j < rows.length; j++) { const r = rows[j], bytes = Buffer.byteLength(JSON.stringify(r.params));
        assert.ok(/^[a-zA-Z0-9_-]{1,64}$/.test(r.custom_id)); assert.ok(!seen.has(r.custom_id)); seen.add(r.custom_id); assert.equal(parseCall(r.custom_id).k, k);
        assert.deepEqual(r.params.thinking, { type: 'adaptive' }); assert.equal(r.params.output_config.effort, 'high'); assert.equal(r.params.max_tokens, 16000); assert.equal(r.params.tools, undefined);
        assert.ok(bytes <= MAX_REQUEST_BYTES); if (w > 0) assert.ok(bytes <= Buffer.byteLength(JSON.stringify(top[j].params))); out.set(r.custom_id, reply(r)); } }
  });
  test(`${mod.ID}: right answers make every run right; wrong ones make every run wrong`, () => {
    for (const right of [true, false]) { const out = new Map(), scored = [];
      for (let w = 0; w < mod.WAVES; w++) { const rows = mod.wave(w, out); for (const r of rows) out.set(r.custom_id, reply(r, right)); const sc = mod.score(w, rows, out); assert.equal(mod.gate(w, sc), null); scored.push(sc); }
      const sum = mod.summarize(scored); assert.equal(sum.runs, nRuns);
      for (const t of tasksOf(regime)) for (const M of sizesOf(k)) assert.deepEqual(sum.table[t][M], { n: INSTANCES, right: right ? INSTANCES : 0 }); }
  });
  test(`${mod.ID}: an agent sees its own shards and no other`, () => {
    const t = tasksOf(regime)[0], M = sizesOf(k).at(-1), inst = cell(t, M).instances[0], rows = mod.wave(0).filter((r) => r.meta.task === t && r.meta.M === M && r.meta.i === 0);
    assert.equal(rows.length, k); const per = M / k;
    rows.forEach((r, a) => { const text = r.params.messages[0].content; for (let sh = 0; sh < M; sh++) assert.equal(text.includes(`Shard ${sh}: ${JSON.stringify(inst.shards[sh])}`), Math.floor(sh / per) === a || k === 1); });
  });
  test(`${mod.ID}: too many invalid replies stop the study`, () => { const rows = mod.wave(0), out = new Map(rows.map((r) => [r.custom_id, { output: null, stopReason: 'end_turn' }])); assert.equal(mod.gate(0, mod.score(0, rows, out)), 'invalid-output-stop'); });
}
