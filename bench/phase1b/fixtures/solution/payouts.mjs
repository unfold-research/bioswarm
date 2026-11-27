export default function (text) {
  const rows = new Map();
  for (const line of text.trim().split('\n').slice(1)) {
    const [deposit, order, rev, paid] = line.split(',');
    if (deposit.startsWith('T')) continue;
    if (!rows.has(deposit) || rows.get(deposit).rev < Number(rev)) rows.set(deposit, { rev: Number(rev), order, paid: Number(paid) });
  }
  const out = {};
  for (const r of rows.values()) {
    out[r.order] ??= { paidCents: 0, deposits: 0 };
    out[r.order].paidCents += r.paid;
    out[r.order].deposits++;
  }
  return out;
}
