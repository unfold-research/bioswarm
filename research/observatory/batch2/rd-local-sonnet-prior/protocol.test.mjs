import test from 'node:test';
import assert from 'node:assert/strict';
import { SPEC, WAVES, wave } from './protocol.mjs';
import { simulate } from '../ring/engine.test.mjs';
test('rd-local-sonnet-prior: seven waves, 60 collections, the orchestrator and prior of its spec', () => {
  assert.equal(WAVES, 7); assert.equal(wave(0).length, 720); assert.equal(SPEC.orchestrator, 'sonnet'); assert.equal(SPEC.prior, true);
  const s = simulate(SPEC); assert.equal(s.perTask.length, 120); assert.equal(s.assignCalls, 360); assert.equal(s.accuracy.stable, 1);
});
