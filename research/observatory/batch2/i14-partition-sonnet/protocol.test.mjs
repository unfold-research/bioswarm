import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling } from './protocol.mjs';
test('admission on Sonnet 5.5, execution on Haiku 5.5', () => {
  const rows = wave(0); assert.equal(rows.length, 9); for (const q of rows) { assert.equal(q.params.model, 'claude-sonnet-5-5'); assert.ok(!('thinking' in q.params)); assert.equal(q.params.max_tokens, 2048); }
  for (const q of ceiling(1)) assert.equal(q.params.model, 'claude-haiku-5-5');
});
