export default function ({ orders }) {
  const out = {};
  for (const o of Object.values(orders)) if (o.marketplace === 'MKB') out[o.shop + ':' + o.month] = (out[o.shop + ':' + o.month] ?? 0) + o.grossCents;
  return out;
}
