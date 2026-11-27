import test from 'node:test';
import assert from 'node:assert/strict';
import { wave, ceiling, WAVES } from './protocol.mjs';
test('same requests as the Haiku study, on Sonnet 5.5 with thinking left on', () => {
  const rows = wave(0); assert.ok(rows.length > 0); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length);
  for (const q of rows) { assert.equal(q.params.model, 'claude-sonnet-5-5'); assert.ok(!('thinking' in q.params)); assert.equal(q.params.max_tokens, 2048); assert.equal(q.params.output_config.effort, 'low'); assert.equal(q.params.output_config.format.type, 'json_schema'); }
  for (let k = 1; k < WAVES; k++) assert.ok(ceiling(k).length > 0);
});
