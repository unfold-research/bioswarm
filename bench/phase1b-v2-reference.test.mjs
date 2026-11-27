import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cases } from './phase1b/cases.mjs';
import { temp } from './phase1b/testkit.mjs';
import { verifyAttempt } from './phase1b/v2/verify.mjs';
import { install, solution } from './fixtures/v2-reference.mjs';

const v2 = cases.v2;
const seeds = [...v2.sampleSeeds, ...v2.calibrationSeeds];

test('v2: an independent solution passes all twelve checks on every seed and the chain composes an exact delivery', (t) => {
  for (const seed of seeds) {
    const dir = temp(t, 'p1b-v2-');
    const o = v2.prepareCase(seed, dir);
    assert.equal(verifyAttempt(dir, o).failing.length, 12);
    install(dir, seed, o);
    const v = verifyAttempt(dir, o);
    assert.deepEqual(v.failing, [], String(seed));
    assert.deepEqual(v.acceptance, { balances: true, exceptions: true, memoTotals: true });
    assert.equal(v.composed, true);
  }
});

test('v2: without its requirement each active directed conflict fails its own check, and only that one', (t) => {
  const naive = {
    'mkb-cutoff': ['orders.mjs', (s) => s.replace("if (stamp.endsWith('Z')) return new Date(Date.parse(stamp) - 3 * 3600000).toISOString().slice(0, 7);", ''), 'orders'],
    'return-new-sku': ['returns.mjs', (s) => s.replace('const original = catalog[sku]?.original;', 'const original = null;'), 'returns'],
    'acq-chargeback': ['settlements.mjs', (s) => s.replaceAll("if (status !== 'OK') continue;", "if (status === 'REPROC') continue;"), 'settlements'],
    'mkb-threshold': ['commissions.mjs', (s) => s.replace('const D = ', 'const D0 = ').replace('const pct', 'const D = { ...D0, mkb: { ...D0.mkb, thresholdCents: 0 } };\nconst pct'), 'commissions'],
    'acq2-anticipation': ['fees.mjs', (s) => s.replace(' + pct(s.grossCents, D.acq2.anticipationBp * (s.installment - 1))', ''), 'fees'],
    'bank-resend': ['deposits.mjs', (s) => s.replace("status: paid.has(batch) ? 'duplicate' : 'paid'", "status: 'paid'"), 'deposits'],
  };
  for (const seed of seeds) {
    const dir = temp(t, 'p1b-v2-naive-');
    const o = v2.prepareCase(seed, dir);
    install(dir, seed, o);
    const active = v2.design(seed).directed;
    for (const [quirk, [place, edit, id]] of Object.entries(naive)) {
      if (!active.includes(quirk)) continue;
      // The other modules are unchanged and were verified in the previous test; only the edited one is re-checked.
      writeFileSync(join(dir, place), edit(solution(seed, place)));
      const v = verifyAttempt(dir, o, { only: [id] });
      assert.deepEqual(v.failing.map((c) => c.id), [id], `seed ${seed} ${quirk}`);
      assert.equal(v.failing[0].symptom.kind, 'diverge');
      writeFileSync(join(dir, place), solution(seed, place));
    }
  }
  // Once, end to end: all naive modules of one seed at the same time fail exactly their own checks.
  const seed = seeds[0],
    dir = temp(t, 'p1b-v2-naive-all-');
  const o = v2.prepareCase(seed, dir);
  install(dir, seed, o);
  const active = Object.entries(naive).filter(([q]) => v2.design(seed).directed.includes(q));
  for (const [, [place, edit]] of active) writeFileSync(join(dir, place), edit(solution(seed, place)));
  assert.deepEqual(verifyAttempt(dir, o).failing.map((c) => c.id).sort(), active.map(([, [, , id]]) => id).sort());
});
