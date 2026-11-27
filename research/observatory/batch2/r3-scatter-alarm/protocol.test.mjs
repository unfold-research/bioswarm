import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, score, gate, summarize, WAVES } from './protocol.mjs';
const PARTS = 12;
test('scatter / alarm with exact readers', () => {
  const out = new Map(), scored = [];
  for (let k = 0; k < WAVES; k++) { const rows = wave(k, out); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length); if (k) assert.equal(ceiling(k).length, rows.length, 'ceiling ' + k);
    for (const q of rows) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); const m = q.meta; let o;
      if (m.kind === 'read') o = { working: '', counts: m.authors.map((a) => ({ author: a, n: m.truth[a] })) };
      else { const b = JSON.parse(q.params.messages[0].content), seen = new Set(b.later.filter((x) => x.round > 0).map((x) => x.part)), want = []; for (const x of b.later.filter((y) => y.changed)) { if (x.round === 0 && !seen.has(x.part) && !want.includes(x.part)) want.push(x.part); for (const n of [(x.part + 1) % PARTS, (x.part + PARTS - 1) % PARTS]) if (!seen.has(n) && !want.includes(n)) want.push(n); }
        for (let p = (b.round * 5) % PARTS; want.length < 2; p = (p + 4) % PARTS) if (!seen.has(p) && !want.includes(p)) want.push(p); o = { working: '', assignments: want.slice(0, 2) }; }
      out.set(q.custom_id, { output: o }); }
    const s = score(k, rows, out); assert.equal(gate(k, s), null); scored.push(s); }
  const s = summarize(scored); assert.equal(s.perTask.length, 120); assert.equal(s.readsExact, 1); assert.equal(s.readCalls, 60 * 12 + 120 * 6);
  console.log('RESULT scatter alarm', JSON.stringify({ stable: s.accuracy.stable, edited: +s.accuracy.edited.toFixed(3), reread: +s.editedPartsReread.toFixed(2), poisonReread: +s.poisonReread.toFixed(2) }));
});
