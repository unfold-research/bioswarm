import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, score, gate, summarize, WAVES } from './protocol.mjs';
const PARTS = 12, V = 'draw';
function run(policy) {
  const out = new Map(), scored = [];
  for (let k = 0; k < WAVES; k++) { const rows = wave(k, out); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length); assert.equal(rows.length, k === 0 ? 720 : 240); if (k) assert.equal(ceiling(k).length, rows.length);
    for (const q of rows) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); const m = q.meta;
      if (m.kind === 'choose') { const c = JSON.parse(q.params.messages[0].content); assert.equal(c.nearby.length, V === 'wide' ? 9 : 5); assert.equal('offered_elsewhere' in c, V === 'draw'); assert.equal(q.params.system.includes('stay near where they started'), V === 'told'); if (V === 'draw') assert.ok(!c.nearby.some((x) => x.part === c.offered_elsewhere)); out.set(q.custom_id, { output: { working: '', go_to: policy(c) } }); }
      else out.set(q.custom_id, { output: { working: '', counts: m.authors.map((a) => ({ author: a, n: m.truth[a] })) } }); }
    const s = score(k, rows, out); assert.equal(gate(k, s), null); scored.push(s); }
  return summarize(scored);
}
const away = (c) => (V === 'draw' ? c.offered_elsewhere : -1);
const follow = (c) => { const fresh = c.nearby.filter((x) => !x.recounted); for (const x of c.nearby.filter((y) => y.changed)) { const n = fresh.find((f) => Math.min((f.part - x.part + PARTS) % PARTS, (x.part - f.part + PARTS) % PARTS) === 1); if (n) return n.part; } return away(c); };
test('the ' + V + ' variant with exact readers', () => {
  const a = run(follow); assert.equal(a.perTask.length, 120); assert.equal(a.accuracy.stable, 1); assert.equal(a.choices.unusable, 0); const b = run(away); assert.equal(b.choices.elsewhere, 1); assert.ok(a.accuracy.edited > b.accuracy.edited);
  console.log('RESULT', V, JSON.stringify({ follow: +a.accuracy.edited.toFixed(3), alwaysElsewhere: +b.accuracy.edited.toFixed(3) }));
});
