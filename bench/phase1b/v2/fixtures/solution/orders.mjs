const cents = (r) => { const neg = r.startsWith('-'); const [a, b] = r.replace('-', '').split(','); return (neg ? -1 : 1) * (Number(a) * 100 + Number(b)); };
const localMonth = (stamp) => {
  if (stamp.endsWith('Z')) return new Date(Date.parse(stamp) - 3 * 3600000).toISOString().slice(0, 7);
  return stamp.slice(0, 7);
};
export default function ({ mka, mkb, mkc, catalog }) {
  const best = new Map();
  const keep = (key, rev, row) => { if (!best.has(key) || best.get(key).rev < rev) best.set(key, { rev, row }); };
  for (const l of mka.trim().split('\n').slice(1)) {
    const [order, dmy, shop, sku, qty, price, rev] = l.split(';');
    keep('MKA:' + order + ':' + sku, Number(rev), { order, marketplace: 'MKA', shop, month: dmy.slice(6, 10) + '-' + dmy.slice(3, 5), sku, qty: Number(qty), unit: cents(price) });
  }
  for (const l of mkb.trim().split('\n').slice(1)) {
    const [order, stamp, shop, sku, qty, price, rev] = l.split(',');
    keep('MKB:' + order + ':' + sku, Number(rev), { order, marketplace: 'MKB', shop, month: localMonth(stamp), sku, qty: Number(qty), unit: Number(price) });
  }
  const mkcBest = new Map();
  for (const l of mkc.trim().split('\n').slice(1)) {
    const [order, ts, shop, lines, seq] = l.split('|');
    if (!mkcBest.has(order) || mkcBest.get(order).seq < Number(seq)) mkcBest.set(order, { seq: Number(seq), ts, shop, lines });
  }
  for (const [order, r] of mkcBest)
    for (const part of r.lines.split('+')) {
      const [sku, qty, price] = part.split(':');
      keep('MKC:' + order + ':' + sku, r.seq, { order, marketplace: 'MKC', shop: r.shop, month: r.ts.slice(0, 7), sku, qty: Number(qty), unit: Number(price) });
    }
  const out = {};
  for (const [key, { row }] of best) out[key] = { order: row.order, marketplace: row.marketplace, shop: row.shop, month: row.month, sku: row.sku, category: catalog[row.sku].category, qty: row.qty, grossCents: row.qty * row.unit };
  return out;
}
