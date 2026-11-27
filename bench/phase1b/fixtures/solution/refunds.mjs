export default function (text) {
  const rows = new Map();
  for (const line of text.trim().split('\n').slice(1)) {
    const [credit, order, rev, amount] = line.split(',');
    if (credit.startsWith('X')) continue;
    if (!rows.has(credit) || rows.get(credit).rev < Number(rev)) rows.set(credit, { rev: Number(rev), order, amount: Number(amount) });
  }
  const out = {};
  for (const r of rows.values()) out[r.order] = (out[r.order] ?? 0) + r.amount;
  return out;
}
