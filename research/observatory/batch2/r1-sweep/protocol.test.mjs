import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize } from './protocol.mjs';
test('requests of the sweep regime; with exact readers the code answer is right whenever the edited part is re-read', () => {
  const rows = wave(); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length); for (const q of rows) { assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); assert.match(q.custom_id, /^[A-Za-z0-9_-]{1,64}$/); assert.equal(q.meta.regime, 'sweep'); }
  const s = summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, { output: { working: '', counts: q.meta.authors.map((a) => ({ author: a, n: q.meta.truth[a] })) } }])))]);
  assert.equal(s.readsExact, 1); assert.equal(s.perTask.length, 60); for (const t of s.perTask) assert.ok(t.calls === ('sweep' === 'deep' ? 6 : 12));
  if ('sweep' === 'sweep' || 'sweep' === 'deep') { assert.equal(s.accuracy.stable, 1); assert.equal(s.accuracy.edited, 1); assert.equal(s.editedPartRereadAfterEdit, 1); }
  else { assert.ok(s.accuracy.edited <= s.editedPartRereadAfterEdit + 1e-9 || 'sweep' === 'stig-decay'); assert.ok(s.partsCovered <= 6); }
});
