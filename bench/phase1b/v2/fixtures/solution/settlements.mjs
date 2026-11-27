const mp = { A: 'MKA', B: 'MKB', C: 'MKC' };
const cents = (r) => { const neg = r.startsWith('-'); const [a, b] = r.replace('-', '').split(','); return (neg ? -1 : 1) * (Number(a) * 100 + Number(b)); };
export default function ({ acq1, acq2 }) {
  const out = {};
  for (const l of acq1.trim().split('\n').slice(1)) {
    const [id, order, sku, i, n, gross, fee, net, batch, status] = l.split(',');
    if (status !== 'OK') continue;
    out[id] = { line: `${mp[order[0]]}:${order}:${sku}`, acquirer: 'ACQ1', batch, installment: Number(i), installments: Number(n), grossCents: Number(gross), chargedFeeCents: Number(fee), netCents: Number(net), anticipated: false };
  }
  for (const l of acq2.trim().split('\n').slice(1)) {
    const [id, order, sku, i, n, gross, fee, antecipado, net, date, status] = l.split(';');
    if (status !== 'OK') continue;
    out[id] = { line: `${mp[order[0]]}:${order}:${sku}`, acquirer: 'ACQ2', batch: 'L2-' + date.replaceAll('-', ''), installment: Number(i), installments: Number(n), grossCents: cents(gross), chargedFeeCents: cents(fee), netCents: cents(net), anticipated: antecipado === 'S' };
  }
  return out;
}
