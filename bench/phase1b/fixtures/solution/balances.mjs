export default function ({ orders, refunds, payouts }) {
  const groups = new Map();
  for (const [id, o] of Object.entries(orders)) {
    const k = o.month + ',' + o.shop, credit = refunds[id] ?? 0, paid = payouts[id]?.paidCents ?? 0;
    const g = groups.get(k) ?? [0, 0, 0, 0];
    [o.grossCents, credit, paid, paid - (o.grossCents - credit)].forEach((v, i) => (g[i] += v));
    groups.set(k, g);
  }
  return ['month,shop,grossCents,refundCents,paidCents,differenceCents', ...[...groups].map(([k, g]) => [k, ...g].join(','))].join('\n') + '\n';
}
