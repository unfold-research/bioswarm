import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareCase, score, seeds } from './case.mjs';

test('all three fixtures reconcile independently from raw revised exports', (t) => {
  for (const seed of seeds) {
    const dir = mkdtempSync(join(tmpdir(), 'phase1-score-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const oracle = prepareCase(seed, dir);
    assert.deepEqual(score(dir, oracle), { balances: false, exceptions: false, memoTotals: false });
    function newest(file) {
      const rows = new Map();
      for (const line of readFileSync(join(dir, file), 'utf8').trim().split('\n').slice(1)) {
        const c = line.split(','),
          rev = Number(c[file === 'orders.csv' ? 1 : 2]);
        if (!rows.has(c[0]) || rows.get(c[0]).rev < rev) rows.set(c[0], { rev, c });
      }
      return [...rows.values()].map((r) => r.c);
    }
    const orders = newest('orders.csv'),
      actual = new Map(),
      groups = new Map(),
      errors = [];
    for (const [id, , month, shop, units, price] of orders)
      actual.set(id, { month, shop, gross: units * price, credit: 0, paid: 0, deposits: 0 });
    for (const [, id, , amount] of newest('refunds.csv')) actual.get(id).credit += Number(amount);
    for (const [, id, , amount] of newest('payouts.csv')) {
      const o = actual.get(id);
      o.paid += Number(amount);
      o.deposits++;
    }
    for (const [id, o] of actual) {
      const diff = o.paid - o.gross + o.credit,
        k = [o.month, o.shop].join(',');
      if (!groups.has(k)) groups.set(k, [0, 0, 0, 0]);
      [o.gross, o.credit, o.paid, diff].forEach((v, i) => (groups.get(k)[i] += v));
      if (!o.deposits || diff)
        errors.push([id, !o.deposits ? 'missing' : diff > 0 ? 'over' : 'under', diff].join(','));
    }
    const matrix = [...groups].map(([k, v]) => [k, ...v].join(','));
    const totals = [...groups.values()].reduce((a, row) => a.map((v, i) => v + row[i]), [0, 0, 0, 0]);
    const output = (file, head, lines) => writeFileSync(join(dir, file), [head, ...lines].join('\n'));
    output('balances.csv', 'month,shop,grossCents,refundCents,paidCents,differenceCents', matrix);
    output('exceptions.csv', 'order,reason,differenceCents', errors);
    writeFileSync(join(dir, 'close.md'), [...totals, errors.length].join('\n'));
    assert.deepEqual(score(dir, oracle), { balances: true, exceptions: true, memoTotals: true });
    errors[0] = errors[1];
    output('exceptions.csv', 'order,reason,differenceCents', errors);
    assert.equal(score(dir, oracle).exceptions, false);
  }
});
