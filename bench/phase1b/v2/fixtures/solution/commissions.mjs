const D = __DESIGN__;
const pct = (c, bp) => Math.round((c * bp) / 10000);
export default function ({ orders, returns, tiers }) {
  const rate = (o) => (o.marketplace === 'MKA' ? (o.category === D.mka.special ? D.mka.specialBp : D.mka.baseBp) : o.marketplace === 'MKB' ? (tiers[o.shop + ':' + o.month] <= D.mkb.thresholdCents ? D.mkb.lowBp : D.mkb.highBp) : o.category === D.mkc.special ? D.mkc.specialBp : D.mkc.bp);
  const lines = {};
  for (const [line, o] of Object.entries(orders)) {
    let c = pct(o.grossCents, rate(o));
    if (o.marketplace === 'MKA') c = Math.min(D.mka.capCents, Math.max(D.mka.minCents, c));
    if (o.marketplace === 'MKC') c += D.mkc.fixedCents;
    lines[line] = c;
  }
  const refunds = {};
  for (const [id, r] of Object.entries(returns)) {
    if (r.unmatched || r.kind !== 'return') continue;
    const o = orders[r.line];
    refunds[id] = o.marketplace === 'MKB' ? 0 : pct(r.refundCents, rate(o));
  }
  return { lines, refunds };
}
