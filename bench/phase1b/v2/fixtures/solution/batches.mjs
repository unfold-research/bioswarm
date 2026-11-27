export default function ({ settlements }) {
  const out = {};
  for (const s of Object.values(settlements)) {
    const d = s.batch.slice(3);
    out[s.batch] ??= { acquirer: s.acquirer, date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, netCents: 0 };
    out[s.batch].netCents += s.netCents;
  }
  return out;
}
