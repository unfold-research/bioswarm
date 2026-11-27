import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, score, gate, summarize, WAVES } from './protocol.mjs';
import { makeCorpus } from '../r1-regimes/protocol.mjs';
test('five waves with a sound orchestrator and exact analysts', () => {
  const out = new Map(), scored = [];
  for (let k = 0; k < WAVES; k++) { const rows = wave(k, out); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length); assert.equal(rows.length, [30, 180, 30, 360, 60][k]); if (k) assert.equal(ceiling(k).length, rows.length);
    for (const q of [...rows, ...(k ? ceiling(k) : [])]) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); }
    for (const q of rows) { const m = q.meta, c = makeCorpus(m.seed); let o;
      if (m.kind === 'assign') o = { working: '', assignments: [0, 1, 2, 3, 4, 5] };
      else if (m.kind === 'read') o = { working: '', counts: m.authors.map((a) => ({ author: a, n: m.truth[a] })) };
      else { const board = JSON.parse(q.params.messages[0].content).board; assert.equal(board.length, 12); const tot = {}; for (const part of [0, 1, 2, 3, 4, 5]) { const last = board.filter((b) => b.part === part).sort((x, y) => y.epoch - x.epoch)[0]; for (const a of m.authors) tot[a] = (tot[a] || 0) + last.counts[a]; } o = { working: '', author: Object.entries(tot).sort((x, y) => y[1] - x[1])[0][0] }; assert.equal(o.author, c.answer[m.cond]); }
      out.set(q.custom_id, { output: o }); }
    const s = score(k, rows, out); assert.equal(gate(k, s), null); scored.push(s); }
  const sum = summarize(scored); assert.equal(sum.accuracy.stable, 1); assert.equal(sum.accuracy.edited, 1); assert.equal(sum.editedPartRereadAfterEdit, 1); assert.equal(sum.unusableAssignments, 0); assert.equal(sum.perTask.length, 60);
});
test('an unusable assignment falls back to one analyst per part', () => {
  const out = new Map(wave(0, new Map()).map((q) => [q.custom_id, { output: { working: '', assignments: [9, 9] } }])); const rows = wave(1, out); assert.equal(rows.length, 180); assert.deepEqual(rows.slice(0, 6).map((q) => q.meta.unit[0]), [0, 1, 2, 3, 4, 5]);
});
