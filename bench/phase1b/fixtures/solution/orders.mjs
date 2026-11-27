// Test-only reference implementation (never shown to agents).
export default function (text) {
  const rows = new Map();
  for (const line of text.trim().split('\n').slice(1)) {
    const [order, rev, month, shop, units, price] = line.split(',');
    if (!rows.has(order) || rows.get(order).rev < Number(rev)) rows.set(order, { rev: Number(rev), month, shop, gross: Number(units) * Number(price) });
  }
  const merged = '__MERGED__';
  return Object.fromEntries([...rows].map(([o, r]) => [o, { month: r.month, shop: r.shop === 'S10' ? merged : r.shop, grossCents: r.gross }]));
}
