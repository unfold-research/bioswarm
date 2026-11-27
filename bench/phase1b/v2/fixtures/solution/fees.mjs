const D = __DESIGN__;
const pct = (c, bp) => Math.round((c * bp) / 10000);
export default function ({ settlements }) {
  const out = {};
  for (const [id, s] of Object.entries(settlements))
    out[id] = s.acquirer === 'ACQ1' ? pct(s.grossCents, s.installments === 1 ? D.acq1.one : s.installments <= 6 ? D.acq1.mid : D.acq1.long) : pct(s.grossCents, D.acq2.flatBp) + pct(s.grossCents, D.acq2.anticipationBp * (s.installment - 1));
  return out;
}
