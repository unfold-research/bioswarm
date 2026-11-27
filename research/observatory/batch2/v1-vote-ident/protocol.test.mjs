import test from 'node:test';
import assert from 'node:assert/strict';
import { wave } from './protocol.mjs';
import * as base from '../v1-vote/protocol.mjs';
test('this half is exactly the ident requests of the full V1 manifest', () => {
  const rows = wave(), full = base.wave().filter((q) => q.meta.arm === 'ident');
  assert.equal(rows.length, 240); assert.deepEqual(rows.map((q) => [q.custom_id, q.params]), full.map((q) => [q.custom_id, q.params]));
});
