import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, gate, summarize } from './protocol.mjs';
import * as P from '../q1-quorum/protocol.mjs';
test('quorum rule: stops at the first answer given q times, ignores invalid answers, falls back to the plurality', () => {
  assert.deepEqual(P.quorum(['a', 'a', 'b', 'b', 'b', 'c', 'c'], 2), { answer: 'a', used: 2 }); assert.deepEqual(P.quorum(['a', 'b', 'b', 'a', 'a', 'c', 'c'], 3), { answer: 'a', used: 5 });
  assert.deepEqual(P.quorum(['a', null, 'b', 'c', 'd', 'e', 'b'], 2), { answer: 'b', used: 7 }); assert.deepEqual(P.quorum(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 2), { answer: 'a', used: 7 }); assert.deepEqual(P.quorum(['a', 'a', 'b', 'c', 'b', 'c', 'd'], 3), { answer: 'a', used: 7 });
});
test('rows count: 300 tasks, nine agents each; agents that all answer right give 1.00 everywhere and the quorum stops at q', () => {
  const rows = wave(0), key = 'count' === 'search' ? 'id' : 'author'; assert.equal(rows.length, 2700); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 2700); const out = new Map();
  for (const q of rows) { assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.ok(!q.params.messages[0].content.includes(JSON.stringify(q.meta.answer) + ',"answer"')); out.set(q.custom_id, { output: { working: '', [key]: q.meta.answer } }); }
  let sc = score(0, rows, out); assert.equal(gate(0, sc), null); let s = summarize([sc]); for (const a of P.ARMS) assert.equal(s.accuracy[a], 1); assert.equal(s.agentsUsed.quorum2, 2); assert.equal(s.agentsUsed.quorum3, 3); assert.equal(s.agentsUsed.vote7, 7); assert.equal(s.agentsUsed.w150, 1);
  for (const q of rows) if (['s0', 's2', 's4', 's6'].includes(q.meta.agent)) out.set(q.custom_id, { output: { working: '', [key]: 'wrong-' + q.meta.agent } }); sc = score(0, rows, out); s = summarize([sc]);
  assert.equal(s.accuracy.single, 0); assert.equal(s.accuracy.vote3, 0); assert.equal(s.accuracy.vote7, 1); assert.equal(s.accuracy.quorum2, 1); assert.equal(s.agentsUsed.quorum2, 4); assert.equal(s.agentsUsed.quorum3, 6);
  for (const q of rows.slice(0, 400)) out.set(q.custom_id, { output: null }); assert.equal(gate(0, score(0, rows, out)), 'invalid-output-stop');
});
