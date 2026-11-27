const mp = { A: 'MKA', B: 'MKB', C: 'MKC' };
export default function ({ returns, chargebacks, catalog, orders }) {
  const best = new Map();
  for (const l of returns.trim().split('\n').slice(1)) {
    const [id, rev, order, marketplace, sku, , amount, date] = l.split(',');
    if (!best.has(id) || best.get(id).rev < Number(rev)) best.set(id, { rev: Number(rev), order, marketplace, sku, amount: Number(amount), date });
  }
  const out = {};
  const find = (m, order, sku) => {
    if (orders[`${m}:${order}:${sku}`]) return `${m}:${order}:${sku}`;
    const original = catalog[sku]?.original;
    if (original && orders[`${m}:${order}:${original}`]) return `${m}:${order}:${original}`;
    return null;
  };
  for (const [id, r] of best) {
    const line = find(r.marketplace, r.order, r.sku);
    out[id] = line ? { line, month: r.date.slice(0, 7), kind: 'return', refundCents: r.amount } : { unmatched: true, amountCents: r.amount };
  }
  for (const l of chargebacks.trim().split('\n').slice(1)) {
    const [id, order, marketplace, sku, amount, date] = l.split(',');
    out[id] = { line: `${marketplace}:${order}:${sku}`, month: date.slice(0, 7), kind: 'chargeback', refundCents: Number(amount) };
  }
  return out;
}
