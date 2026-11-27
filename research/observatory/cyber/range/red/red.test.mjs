// Unit tests of the red pure logic (no Docker, no exploit payload executed): node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, nextStage, STAGES, IMPACTS, RED_TICK } from './red.mjs';

test('plan is deterministic per seed and picks a valid breach host, target and impact', () => {
  const a = plan(76001), b = plan(76001);
  assert.deepEqual(a, b);
  assert.ok(['ws1', 'ws2', 'ws3'].includes(a.ws));
  assert.ok(['web', 'files', 'db'].includes(a.target));
  assert.ok(IMPACTS.includes(a.impact));
  for (const k of ['discovery', 'lateral', 'escalation', 'persistence', 'impact']) assert.ok(a.waits[k] >= 1);
});

test('nextStage advances only after the stage wait and only while the foothold holds', () => {
  const waits = { discovery: 1, lateral: 2, escalation: 2, persistence: 1, impact: 1 };
  assert.equal(nextStage('none', 0, waits, true), 'none', 'none only leaves via step()');
  assert.equal(nextStage('discovery', 1, waits, true), 'discovery', 'holds: lateral needs 2 waited steps');
  assert.equal(nextStage('discovery', 2, waits, true), 'lateral', 'advances when waited >= need');
  assert.equal(nextStage('lateral', 1, waits, true), 'lateral', 'holds until the wait is met');
  assert.equal(nextStage('lateral', 2, waits, true), 'escalation');
  assert.equal(nextStage('persistence', 1, waits, true), 'impact');
  assert.equal(nextStage('escalation', 5, waits, false), 'discovery', 'a lost foothold falls back to discovery');
  assert.equal(nextStage('impact', 9, waits, true), 'impact', 'stays at impact');
});

test('the red maintenance payload is uid-0 content with no sudo/cron and a distinct root process', () => {
  assert.doesNotMatch(RED_TICK, /sudo|crontab|cron|setuid/i);
  assert.match(RED_TICK, /tail -f/);
  assert.equal(STAGES[STAGES.length - 1], 'impact');
});
