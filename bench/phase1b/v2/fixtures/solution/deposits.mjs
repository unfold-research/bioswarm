export default function ({ batches, deposits }) {
  const rows = deposits.trim().split('\n').slice(1).map((l) => l.split(',')).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const paid = new Set(), out = {};
  for (const [id, date, amount, memo] of rows) {
    let batch = memo.startsWith('ACQ1 LOTE ') ? memo.slice(10) : null;
    if (!batch) batch = Object.keys(batches).find((b) => batches[b].acquirer === 'ACQ2' && batches[b].date === date && batches[b].netCents === Number(amount));
    out[id] = { batch, status: paid.has(batch) ? 'duplicate' : 'paid' };
    paid.add(batch);
  }
  return out;
}
