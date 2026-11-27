import test from 'node:test';
import assert from 'node:assert/strict';
import { wave } from './protocol.mjs';
test('this study is exactly the triage requests of I6', () => { const rows = wave(); assert.equal(rows.length, 240); assert.ok(rows.every((q) => q.meta.family === 'triage' && q.params.model === 'claude-haiku-5-5')); });
