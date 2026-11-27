// Unit tests of the mediator pure logic (no Docker): node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAINT_BASELINE, BASELINE_SHA, sha, Mediator } from './mediator.mjs';

test('the frozen baseline maintenance script matches hosts.mjs and its hash is stable', () => {
  assert.equal(MAINT_BASELINE, '#!/bin/sh\necho "maint $(date -u +%s)" > /pod/maint/state\n');
  assert.equal(BASELINE_SHA, sha(MAINT_BASELINE));
  assert.notEqual(BASELINE_SHA, sha(MAINT_BASELINE + '\n'));
});

test('a changed script has a different hash (how Remove detects red stage 3/4)', () => {
  const red = '#!/bin/sh\necho "r0-red root" > /pod/maint/.red\ntimeout 2 tail -f /dev/null\n';
  assert.notEqual(sha(red), BASELINE_SHA);
});

test("exec takes only text or a Buffer as stdin: an options object is ignored, never handed to spawnSync (r0-pilot timing failure)", () => {
  const m = new Mediator({ range: "r0-test", pods: [], router: "r0-none", token: "t" });
  assert.doesNotThrow(() => m.exec("r0-no-such-container", ["true"], { ok: true }));
  assert.doesNotThrow(() => m.exec("r0-no-such-container", ["true"], "text"));
  assert.doesNotThrow(() => m.exec("r0-no-such-container", ["true"]));
});
