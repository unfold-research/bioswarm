import test from 'node:test';
import assert from 'node:assert/strict';
import { tasks, wave, score, gate, summarize, agentParams } from './protocol.mjs';
test('90 tasks, 540 requests; the wordings differ, carry the same records and all have a working field', () => {
  const t = tasks()[0], rows = wave(); assert.equal(rows.length, 540); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 540);
  assert.deepEqual(agentParams(t, 'a0'), agentParams(t, 'a2')); assert.equal(new Set(['a0', 'b', 'c', 'd'].map((a) => agentParams(t, a).system)).size, 4);
  for (const a of ['a0', 'b', 'c', 'd']) { const p = agentParams(t, a); assert.ok('working' in p.output_config.format.schema.properties); for (const r of t.records) assert.ok(p.messages[0].content.includes(r.id) && p.messages[0].content.includes(String(r.n))); }
  for (const q of rows) assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000);
});
test('decision rules: the base wording fails on half the tasks, the others do not', () => {
  const rows = wave(), half = (m) => Math.floor((m.seed - 21001) / 3) % 2 === 0;
  const out = new Map(rows.map((q) => [q.custom_id, { output: { working: '', id: q.meta.agent.startsWith('a') && half(q.meta) ? 'wrong-' + q.meta.agent[0] : q.meta.answer } }]));
  const s = score(0, rows, out); assert.equal(gate(0, s), null); const sum = summarize([s]);
  assert.equal(sum.overall.a0, 0.5); assert.equal(sum.overall.copies3, 0.5); assert.equal(sum.overall.wordings3, 1); assert.equal(sum.overall.mixed3, 1); assert.equal(sum.disagreement.copies3, 0); assert.equal(sum.disagreement.wordings3, 0.5);
  assert.deepEqual(sum.tests, { P1: 'supported', P2: 'supported', P3: 'not supported' });
});
