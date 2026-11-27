import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, score, gate, summarize, WAVES } from './protocol.mjs';
const PARTS = 12;
test('d6 local: eight waves; an agent that counts exactly and plans a search', () => {
  const out = new Map(), scored = [];
  for (let k = 0; k < WAVES; k++) { const rows = wave(k, out); assert.equal(rows.length, k === 0 ? 720 : 120); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length); if (k) assert.equal(ceiling(k).length, 120);
    for (const q of rows) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); const m = q.meta, c = JSON.parse(q.params.messages[0].content);
      if (m.kind === 'pre') { out.set(q.custom_id, { output: { working: '', counts: m.authors.map((a) => ({ author: a, n: m.truth[a] })) } }); continue; }
      assert.equal('records' in c, m.step > 0); assert.equal(c.later.length, Math.max(0, m.step - 1));
      // policy: neighbours of changed parts first (this step's part is judged by comparing truth with the first count), otherwise probes three apart
      const seen = new Set([...c.later.map((x) => x.part), ...(m.step ? [m.part] : [])]), changed = c.later.filter((x) => x.changed).map((x) => x.part);
      if (m.step && c.first[m.part].counts && m.authors.reduce((n, a) => n + Math.abs(m.truth[a] - c.first[m.part].counts[a]), 0) >= 3) changed.push(m.part);
      let next = null; for (const p of changed) for (const n of [(p + 1) % PARTS, (p + PARTS - 1) % PARTS]) if (next === null && !seen.has(n)) next = n;
      if (next === null) next = [0, 6, 3, 9, 1, 7, 4, 10, 2, 8, 5, 11].find((p) => !seen.has(p));
      out.set(q.custom_id, { output: { working: '', counts: m.truth ? m.authors.map((a) => ({ author: a, n: m.truth[a] })) : [], next_part: next } }); }
    const s = score(k, rows, out); assert.equal(gate(k, s), null); scored.push(s); }
  const s = summarize(scored); assert.equal(s.perTask.length, 120); assert.equal(s.accuracy.stable, 1); assert.equal(s.recountsExact, 1); assert.equal(s.repeatsPerRun, 0); assert.equal(s.unusableNext, 0);
  console.log('RESULT local', s.accuracy.edited.toFixed(3), s.editedPartsReread.toFixed(2)); if ('local' === 'local') assert.ok(s.accuracy.edited > 0.95);
});
