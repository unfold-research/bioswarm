import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, score, summarize } from './protocol.mjs';
test('90 base-prompt requests on Sonnet 5.5', () => {
  const rows = wave(); assert.equal(rows.length, 90); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 90);
  for (const q of rows) { assert.equal(q.params.model, 'claude-sonnet-5-5'); assert.ok(!('thinking' in q.params)); assert.equal(q.params.max_tokens, 2048); assert.match(q.custom_id, /^m6-\d+-sonnet$/); }
  assert.equal(summarize([score(0, rows, new Map(rows.map((q) => [q.custom_id, { output: { id: q.meta.answer } }])))]).correct, 90);
});
