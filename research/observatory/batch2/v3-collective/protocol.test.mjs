import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, ceiling, score, gate, summarize, LEVELS } from './protocol.mjs';
import { qualifies } from '../littask.mjs';
test('90 tasks of 48, 96 and 144 records with one correct answer; requests under the byte ceiling', () => {
  const ts = tasks(); assert.equal(ts.length, 90); for (const L of LEVELS) assert.equal(ts.filter((t) => t.level === L && t.records.length === L).length, 30);
  for (const t of ts) { assert.equal(new Set(t.records.map((r) => r.id)).size, t.level); assert.equal(t.records.filter(qualifies).sort((a, b) => b.n - a.n)[0].id, t.answer); }
  const rows = wave(0); assert.equal(rows.length, 540); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 540);
  for (const q of [...rows, ...ceiling(1)]) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); }
});
test('decision rules', () => {
  const rows = wave(0), half = (m) => Math.floor((m.seed - 19001) / 3) % 2 === 0, wrong = (m) => m.ids.find((x) => x !== m.answer);
  // s0 wrong on half the tasks, the other samples and deep right
  const out = new Map(rows.map((q) => [q.custom_id, { output: { working: '', id: q.meta.variant === 'w20' && q.meta.sample === 0 && half(q.meta) ? wrong(q.meta) : q.meta.answer } }]));
  const s0 = score(0, rows, out); assert.equal(gate(0, s0), null); const w1 = wave(1, out); assert.equal(w1.length, 135);
  const sum = summarize([s0, score(1, w1, new Map(w1.map((q) => [q.custom_id, { output: { accept: q.meta.truthCorrect } }])))]);
  assert.equal(sum.pooled.single, 0.5); assert.equal(sum.pooled.vote3, 1); assert.equal(sum.pooled.verify3, 1); assert.equal(sum.shareOfTasksWithDifferentAnswers, 0.5);
  assert.deepEqual(sum.tests, { P1: 'supported', P2: 'not supported', P3: 'supported', P4: 'not supported' });
});
