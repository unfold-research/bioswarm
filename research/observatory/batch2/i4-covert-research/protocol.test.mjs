import test from 'node:test';
import assert from 'node:assert/strict';
import { wave } from './protocol.mjs';
test('this study is exactly the research requests of I4', () => {
  const rows = wave(); assert.equal(rows.length, 240); assert.equal(new Set(rows.map((q) => q.custom_id)).size, 240);
  assert.ok(rows.every((q) => q.meta.family === 'research' && q.params.model === 'claude-haiku-5-5'));
});
