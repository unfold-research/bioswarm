import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeBudget, budgetResult } from './budget.mjs';
import { installBudget } from './pi-budget/index.js';
import { blindMemo } from './blind.mjs';
import { bioArm, decision, pricedUsage, observedSeconds } from './study.mjs';

test('bio arm, price weights, paired decisions and concurrent wall time', () => {
  assert.equal(bioArm, 'stigwait-tiebreak');
  assert.equal(pricedUsage({ uncachedInput: 1e6, cachedInput: 1e6, cacheCreation: 1e6, output: 1e6 }), 14.6);
  assert.equal(decision([8, 9, 10], [4, 5, 6]), 'sustentada');
  assert.equal(decision([8, 9, 10], [6, 7, 8]), 'inconclusiva');
  assert.equal(decision([8, 9, 10], [8, 9, 5]), 'refutada');
  assert.equal(decision([0, 0, 0], [1, 1, 1], false), 'sustentada');
  assert.equal(decision([4, 4, 4], [4, 4, 4], false), 'sem separação');
  assert.equal(decision([2, 3, 4], [2, 3, 2], false), 'sem separação');
  assert.equal(decision([4, 3, 4], [3, 3, 1], false), 'refutada');
  const t = (n) => new Date(n * 1000).toISOString();
  assert.equal(
    observedSeconds(
      [
        [1, 5],
        [2, 8],
        [11, 13],
      ].map(([a, b]) => ({ started_at: t(a), completed_at: t(b) })),
    ),
    9,
  );
});

test('each arm has the same turn and cross-agent team brake without registering coordination tools', (t) => {
  for (const arm of ['off', 'community', bioArm]) {
    const root = mkdtempSync(join(tmpdir(), 'phase1-brake-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const ledger = join(root, 'ledger');
    initializeBudget(ledger);
    const hooks = ['a', 'b', 'c'].map((id) => {
      const cwd = join(root, id),
        handlers = {};
      mkdirSync(cwd);
      writeFileSync(join(cwd, '.phase1-budget'), JSON.stringify({ ledger }));
      if (arm !== 'off') writeFileSync(join(cwd, '.bioswarm'), '{}');
      installBudget({ on: (event, f) => (handlers[event] = f) }, cwd);
      handlers.agent_start();
      return handlers;
    });
    const pay = (i, usd) =>
      hooks[i].message_end({ message: { role: 'assistant', usage: { cost: { total: usd } } } });
    pay(0, 3);
    assert.equal(hooks[0].tool_call(), undefined);
    pay(0, 0.1);
    assert.equal(hooks[0].tool_call().terminate, true);
    hooks[0].agent_start();
    assert.equal(hooks[0].tool_call(), undefined);
    pay(1, 3);
    pay(2, 3);
    assert.equal(hooks[0].tool_call().terminate, true);
    assert.equal(budgetResult(ledger).agents, 3);
    for (const h of hooks) h.session_shutdown();
  }
});

test('blind packet removes frozen labels, paths and team identities, while preserving business figures', () => {
  const memo =
    'Ana (Ops) usou stigwait-tiebreak no campo; leia /data/OpenBot/Shared/foo.csv via mcp__openbot_aabb__send_message. Saldo 1200, qualidade 4/4.';
  const { text, removals } = blindMemo(memo, ['Ana (Ops)']);
  assert.doesNotMatch(text, /Ana|stigwait|campo|foo|mcp__/);
  assert.match(text, /Saldo 1200, qualidade 4\/4/);
  assert.equal(removals.length, 5);
  assert.ok(removals.every(({ offset, length }) => Number.isInteger(offset) && length > 0));
});
