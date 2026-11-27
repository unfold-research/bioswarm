// External verifier for case v2. Same design as v1 (verify.mjs): every module runs alone on reference inputs under
// Node permissions (through the isolation tool when set), the revision follows the discrepancy, symptoms are counts
// only; then the agents' own chain composes balances.csv and exceptions.csv, scored exactly.
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runModule } from '../verify.mjs';
import { checkMap } from './case.mjs';

export { describe } from '../verify.mjs';
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12);
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '') ? Number(v) : NaN);
const same = (fields) => (e, a) => isObject(a) && fields.every((f) => (typeof e[f] === 'number' ? num(a[f]) === e[f] : a[f] === e[f]));
function compareObjects(expected, actual, eq) {
  if (!isObject(actual)) return null;
  const divergent = [];
  for (const k of new Set([...Object.keys(expected), ...Object.keys(actual)])) if (!(k in expected) || !(k in actual) || !eq(expected[k], actual[k])) divergent.push(k);
  return divergent;
}
export const balancesHeader = 'month,shop,grossCents,refundCents,commissionCents,acquirerFeeCents,paidCents,differenceCents';
export const exceptionsHeader = 'ref,reason,amountCents';
function compareTable(text, header, keys, expected) {
  if (typeof text !== 'string') return null;
  const [head, ...lines] = text.trimEnd().split(/\r?\n/);
  if (head !== header) return null;
  const divergent = new Set(),
    seen = new Set();
  for (const line of lines) {
    const cols = line.split(','),
      id = cols.slice(0, keys).join(':'),
      value = expected.get(id);
    if (seen.has(id) || !value || cols.slice(keys).join(',') !== value.join(',')) divergent.add(id);
    seen.add(id);
  }
  for (const id of expected.keys()) if (!seen.has(id)) divergent.add(id);
  return [...divergent];
}
const nonZero = (obj) => (isObject(obj) ? Object.fromEntries(Object.entries(obj).filter(([, v]) => num(v) !== 0)) : obj);

// Per module: the reference inputs and the comparison with the reference output.
const reference = (o, files) => ({
  catalog: { input: { catalog: files('catalog.csv'), migration: files('migration.csv') }, judge: (r) => compareObjects(o.catalog, r, same(['original', 'category'])), size: () => Object.keys(o.catalog).length },
  orders: { input: { mka: files('mka_orders.csv'), mkb: files('mkb_orders.csv'), mkc: files('mkc_orders.txt'), catalog: o.catalog }, judge: (r) => compareObjects(o.orders, r, same(['order', 'marketplace', 'shop', 'month', 'sku', 'category', 'qty', 'grossCents'])), size: () => Object.keys(o.orders).length },
  returns: {
    input: { returns: files('returns.csv'), chargebacks: files('chargebacks.csv'), catalog: o.catalog, orders: o.orders },
    judge: (r) => compareObjects(o.returns, r, (e, a) => (e.unmatched ? isObject(a) && a.unmatched === true && num(a.amountCents) === e.amountCents : same(['line', 'month', 'kind', 'refundCents'])(e, a))),
    size: () => Object.keys(o.returns).length,
  },
  settlements: { input: { acq1: files('acq1_settlements.csv'), acq2: files('acq2_settlements.txt') }, judge: (r) => compareObjects(o.settlements, r, same(['line', 'acquirer', 'batch', 'installment', 'installments', 'grossCents', 'chargedFeeCents', 'netCents', 'anticipated'])), size: () => Object.keys(o.settlements).length },
  tiers: { input: { orders: o.orders }, judge: (r) => compareObjects(o.tiers, r, (e, x) => num(x) === e), size: () => Object.keys(o.tiers).length },
  commissions: {
    input: { orders: o.orders, returns: o.returns, tiers: o.tiers },
    judge: (r) => {
      if (!isObject(r)) return null;
      const a = compareObjects(o.commissions.lines, r.lines, (e, x) => num(x) === e);
      const b = compareObjects(nonZero(o.commissions.refunds), nonZero(r.refunds), (e, x) => num(x) === e);
      return a === null || b === null ? null : [...a.map((k) => 'line:' + k), ...b.map((k) => 'refund:' + k)];
    },
    size: () => Object.keys(o.commissions.lines).length + Object.keys(nonZero(o.commissions.refunds)).length,
  },
  fees: { input: { orders: o.orders, settlements: o.settlements }, judge: (r) => compareObjects(o.fees, r, (e, x) => num(x) === e), size: () => Object.keys(o.fees).length },
  batches: { input: { settlements: o.settlements }, judge: (r) => compareObjects(o.batches, r, same(['acquirer', 'date', 'netCents'])), size: () => Object.keys(o.batches).length },
  deposits: { input: { batches: o.batches, deposits: files('deposits.csv') }, judge: (r) => compareObjects(o.deposits, r, same(['batch', 'status'])), size: () => Object.keys(o.deposits).length },
  balances: { input: integration(o), judge: (r) => compareTable(r, balancesHeader, 2, o.balances), size: () => o.balances.size },
  exceptions: { input: integration(o), judge: (r) => compareTable(r, exceptionsHeader, 1, o.exceptions), size: () => o.exceptions.size },
});
function integration(o) {
  return { orders: o.orders, returns: o.returns, settlements: o.settlements, commissions: o.commissions, fees: o.fees, batches: o.batches, deposits: o.deposits };
}
export const memoFigures = (o) => {
  const t = [...o.balances.values()].reduce((s, r) => s.map((v, i) => v + r[i]), [0, 0, 0, 0, 0, 0]);
  return { grossCents: t[0], refundCents: t[1], paidCents: t[4], differenceCents: t[5], exceptions: o.exceptions.size };
};
function memoCheck(taskDir, o) {
  let memo;
  try {
    if (!lstatSync(join(taskDir, 'close.md')).isFile()) return { kind: 'missing' };
    memo = readFileSync(join(taskDir, 'close.md'), 'utf8');
  } catch {
    return { kind: 'missing' };
  }
  const numbers = new Set([...memo.matchAll(/-?\d+/g)].map((m) => m[0]));
  const absent = Object.values(memoFigures(o)).map((v, i) => (numbers.has(String(v)) ? null : i)).filter((i) => i !== null);
  return absent.length ? { kind: 'absent-numbers', absent } : null;
}
export function score(taskDir, o) {
  const read = (f) => {
    try {
      return lstatSync(join(taskDir, f)).isFile() ? readFileSync(join(taskDir, f), 'utf8') : null;
    } catch {
      return null;
    }
  };
  const ok = (d) => Array.isArray(d) && d.length === 0;
  return { balances: ok(compareTable(read('balances.csv'), balancesHeader, 2, o.balances)), exceptions: ok(compareTable(read('exceptions.csv'), exceptionsHeader, 1, o.exceptions)), memoTotals: memoCheck(taskDir, o) === null };
}

// only: check these IDs alone and skip the composed chain (tests that change one module at a time). Module checks run
// on reference inputs, so a module the caller did not change keeps its verdict.
export function verifyAttempt(taskDir, o, { timeoutMs, tool, only } = {}) {
  // Partial checks skip the composed chain and leave acceptance undefined: refused outside Node's test runner.
  if (only && !process.env.NODE_TEST_CONTEXT) throw Error('verifyAttempt({ only }) is reserved for tests');
  const cache = {};
  const files = (f) => (cache[f] ??= readFileSync(join(taskDir, f), 'utf8'));
  const ref = reference(o, files);
  const checks = checkMap(o.seed).filter((entry) => !only || only.includes(entry.id)).map((entry) => {
    if (entry.id === 'memo') {
      const m = memoCheck(taskDir, o);
      if (!m) return { ...entry, pass: true, revision: 'pass', symptom: null };
      return { ...entry, pass: false, revision: digest([m.kind, m.absent ?? []]), symptom: m.absent ? { kind: m.kind, divergent: m.absent.length, expected: 5 } : { kind: m.kind } };
    }
    const spec = ref[entry.id];
    const out = runModule(taskDir, entry.place, spec.input, { timeoutMs, tool });
    if (out.error) return { ...entry, pass: false, revision: digest([out.error]), symptom: { kind: out.error } };
    const divergent = spec.judge(out.result);
    if (divergent === null) return { ...entry, pass: false, revision: digest(['format']), symptom: { kind: 'format' } };
    if (!divergent.length) return { ...entry, pass: true, revision: 'pass', symptom: null };
    divergent.sort();
    return { ...entry, pass: false, revision: digest(['diverge', divergent]), symptom: { kind: 'diverge', divergent: divergent.length, expected: spec.size() } };
  });
  if (only) return { checks, failing: checks.filter((c) => !c.pass), composed: null, acceptance: null };
  // The agents' chain end to end: each stage feeds the next; a broken stage leaves no delivery.
  for (const f of ['balances.csv', 'exceptions.csv']) rmSync(join(taskDir, f), { force: true });
  const run = (place, input) => runModule(taskDir, place, input, { timeoutMs, tool });
  let composed = false;
  const chain = {};
  const steps = [
    ['catalog', () => ({ catalog: files('catalog.csv'), migration: files('migration.csv') })],
    ['orders', () => ({ mka: files('mka_orders.csv'), mkb: files('mkb_orders.csv'), mkc: files('mkc_orders.txt'), catalog: chain.catalog })],
    ['returns', () => ({ returns: files('returns.csv'), chargebacks: files('chargebacks.csv'), catalog: chain.catalog, orders: chain.orders })],
    ['settlements', () => ({ acq1: files('acq1_settlements.csv'), acq2: files('acq2_settlements.txt') })],
    ['tiers', () => ({ orders: chain.orders })],
    ['commissions', () => ({ orders: chain.orders, returns: chain.returns, tiers: chain.tiers })],
    ['fees', () => ({ orders: chain.orders, settlements: chain.settlements })],
    ['batches', () => ({ settlements: chain.settlements })],
    ['deposits', () => ({ batches: chain.batches, deposits: files('deposits.csv') })],
  ];
  let broken = false;
  for (const [id, input] of steps) {
    const r = run(id + '.mjs', input());
    if (r.error) {
      broken = true;
      break;
    }
    chain[id] = r.result;
  }
  if (!broken) {
    const all = { orders: chain.orders, returns: chain.returns, settlements: chain.settlements, commissions: chain.commissions, fees: chain.fees, batches: chain.batches, deposits: chain.deposits };
    const outputs = { balances: run('balances.mjs', all), exceptions: run('exceptions.mjs', all) };
    for (const [id, r] of Object.entries(outputs)) if (typeof r.result === 'string') writeFileSync(join(taskDir, id + '.csv'), r.result);
    composed = Object.values(outputs).every((r) => typeof r.result === 'string');
  }
  const acceptance = score(taskDir, o);
  return { checks, failing: checks.filter((c) => !c.pass), composed, acceptance };
}
