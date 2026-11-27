import test from 'node:test';
import assert from 'node:assert/strict';
import { wave } from './protocol.mjs';
test('90 answer-only requests on Sonnet 5.5', () => { const rows = wave(); assert.equal(rows.length, 90); for (const q of rows) { assert.equal(q.params.model, 'claude-sonnet-5-5'); assert.ok(!('thinking' in q.params)); assert.ok(!('working' in q.params.output_config.format.schema.properties)); assert.ok(Buffer.byteLength(JSON.stringify(q.params)) < 20000); } });
