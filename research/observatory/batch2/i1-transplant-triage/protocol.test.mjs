import test from 'node:test';
import assert from 'node:assert/strict';
import { wave } from './protocol.mjs';
import * as base from '../i1-transplant/protocol.mjs';
test('this study is exactly the triage requests of I1', () => {
  const rows = wave(); assert.equal(rows.length, 24 * base.ARMS['triage'].length); assert.equal(new Set(rows.map((q) => q.custom_id)).size, rows.length);
  assert.ok(rows.every((q) => q.meta.family === 'triage' && /^[A-Za-z0-9_-]{1,64}$/.test(q.custom_id)));
});
