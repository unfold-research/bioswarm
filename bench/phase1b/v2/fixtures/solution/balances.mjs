export default function ({ orders, returns, settlements, commissions, fees, deposits }) {
  const paid = new Set(Object.values(deposits).filter((d) => d.status === 'paid').map((d) => d.batch));
  const cells = new Map();
  const cell = (m, s) => { const k = m + ',' + s; if (!cells.has(k)) cells.set(k, [0, 0, 0, 0, 0, 0]); return cells.get(k); };
  for (const [line, o] of Object.entries(orders)) { const c = cell(o.month, o.shop); c[0] += o.grossCents; c[2] += commissions.lines[line]; }
  for (const [id, s] of Object.entries(settlements)) { const o = orders[s.line]; const c = cell(o.month, o.shop); c[3] += fees[id]; if (paid.has(s.batch)) c[4] += s.netCents; }
  for (const [id, r] of Object.entries(returns)) { if (r.unmatched) continue; const c = cell(r.month, orders[r.line].shop); c[1] += r.refundCents; if (r.kind === 'return') c[2] -= commissions.refunds[id] ?? 0; }
  const lines = ['month,shop,grossCents,refundCents,commissionCents,acquirerFeeCents,paidCents,differenceCents'];
  for (const [k, c] of cells) { c[5] = c[4] - (c[0] - c[3]); lines.push([k, ...c].join(',')); }
  return lines.join('\n') + '\n';
}
