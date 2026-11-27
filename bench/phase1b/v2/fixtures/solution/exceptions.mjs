export default function ({ returns, settlements, fees, batches, deposits }) {
  const lines = ['ref,reason,amountCents'];
  for (const [id, s] of Object.entries(settlements)) if (s.chargedFeeCents !== fees[id]) lines.push([id, s.chargedFeeCents > fees[id] ? 'fee_over' : 'fee_under', s.chargedFeeCents - fees[id]].join(','));
  const paid = new Set(Object.values(deposits).filter((d) => d.status === 'paid').map((d) => d.batch));
  for (const [b, x] of Object.entries(batches)) if (!paid.has(b)) lines.push([b, 'missing_payout', x.netCents].join(','));
  for (const [id, d] of Object.entries(deposits)) if (d.status === 'duplicate') lines.push([id, 'duplicate_deposit', batches[d.batch].netCents].join(','));
  for (const [id, r] of Object.entries(returns)) if (r.unmatched) lines.push([id, 'return_unmatched', r.amountCents].join(','));
  return lines.join('\n') + '\n';
}
