import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTasks, wave, ceiling, score, gate, summarize, plurality, qualifies, LEVELS, SEEDS } from './protocol.mjs';
test('90 tasks; one correct answer; decoys are larger and fail exactly one condition', () => {
  const tasks = makeTasks(); assert.equal(tasks.length, 90);
  for (const t of tasks) { assert.equal(t.records.length, t.level); assert.equal(new Set(t.records.map((r) => r.id)).size, t.level); assert.equal(new Set(t.records.map((r) => r.n)).size, t.level);
    const q = t.records.filter(qualifies).sort((a, b) => b.n - a.n); assert.equal(q.length, t.level / 6); assert.equal(q[0].id, t.answer);
    const bigger = t.records.filter((r) => r.n > q[0].n); assert.equal(bigger.length, t.level / 6); assert.equal(bigger.sort((a, b) => b.n - a.n)[0].id, t.planted);
    for (const r of bigger) assert.equal([r.review === 'peer-reviewed', r.year >= 2020, r.outcome === 'positive'].filter(Boolean).length, 2); }
  for (const L of LEVELS) assert.equal(tasks.filter((t) => t.level === L).length, 30);
});
test('450 searcher requests under the byte ceiling; verifier wave built from the answers', () => {
  const rows = wave(0); assert.equal(rows.length, 450); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 450);
  for (const q of [...rows, ...ceiling(1)]) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); }
  assert.equal(ceiling(1).length, 270);
  const out = new Map(rows.map((q) => [q.custom_id, { output: { id: q.meta.sample === 1 ? 'not-a-record' : q.meta.answer } }]));
  const w1 = wave(1, out); assert.equal(w1.length, 180); assert.ok(w1.every((q) => JSON.parse(q.params.messages[0].content).proposed_answer === q.meta.proposed));
});
test('plurality', () => { assert.equal(plurality(['a', 'b', 'b']), 'b'); assert.equal(plurality(['a', 'b', 'c']), 'a'); assert.equal(plurality([null, 'b', 'a', 'a', 'b']), 'b'); assert.equal(plurality([null, null]), null); });
test('a searcher that is wrong on s0 half the time and a perfect verifier: verifying beats voting', () => {
  const rows = wave(0), out = new Map(rows.map((q) => { const bad = q.meta.seed % 2 === 0 && q.meta.sample !== 1; return [q.custom_id, { output: { id: bad ? q.meta.planted : q.meta.answer } }]; }));
  const s0 = score(0, rows, out); assert.equal(gate(0, s0), null);
  const w1 = wave(1, out), o1 = new Map(w1.map((q) => [q.custom_id, { output: { accept: q.meta.truthCorrect } }])), sum = summarize([s0, score(1, w1, o1)]);
  assert.deepEqual(sum.analysisLevels, LEVELS); assert.equal(sum.pooled.single, 0.5); assert.equal(sum.pooled.vote3, 0.5); assert.equal(sum.pooled.verify3, 1); assert.equal(sum.pooled.chain5, 1); assert.equal(sum.pooled.meanCallsVerify3, 2.5);
  assert.equal(sum.tests.P1, 'supported'); assert.equal(sum.tests.P2, 'supported'); assert.equal(sum.tests.P3, 'supported'); assert.equal(sum.verifier.sensitivityOwnErrors.rate, 1); assert.equal(sum.verifier.sensitivityPlanted.n, 90);
  // a verifier that accepts everything changes nothing relative to s0, and voting with a good s1,s2 wins
  const out2 = new Map(rows.map((q) => [q.custom_id, { output: { id: q.meta.seed % 2 === 0 && q.meta.sample === 0 ? q.meta.planted : q.meta.answer } }])), w2 = wave(1, out2);
  const sum2 = summarize([score(0, rows, out2), score(1, w2, new Map(w2.map((q) => [q.custom_id, { output: { accept: true } }])))]); assert.equal(sum2.pooled.verify3, 0.5); assert.equal(sum2.pooled.vote3, 1); assert.equal(sum2.tests.P1, 'refuted'); assert.equal(sum2.tests.P3, 'supported');
  // ceiling: everything right
  const out3 = new Map(rows.map((q) => [q.custom_id, { output: { id: q.meta.answer } }])), w3 = wave(1, out3); assert.equal(summarize([score(0, rows, out3), score(1, w3, new Map(w3.map((q) => [q.custom_id, { output: { accept: q.meta.truthCorrect } }])))]).tests.P1, 'inconclusive');
  assert.equal(SEEDS.length, 90);
});
