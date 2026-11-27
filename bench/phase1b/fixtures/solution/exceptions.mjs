export default function ({ orders, refunds, payouts }) {
  const lines = ['order,reason,differenceCents'];
  for (const [id, o] of Object.entries(orders)) {
    const p = payouts[id], diff = (p?.paidCents ?? 0) - (o.grossCents - (refunds[id] ?? 0));
    if (!p) lines.push([id, 'missing', diff].join(','));
    else if (diff) lines.push([id, diff > 0 ? 'over' : 'under', diff].join(','));
  }
  return lines.join('\n') + '\n';
}
