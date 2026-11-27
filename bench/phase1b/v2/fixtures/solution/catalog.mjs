// Test-only reference implementation (never shown to agents).
export default function ({ catalog, migration }) {
  const out = {};
  for (const line of catalog.trim().split('\n').slice(1)) {
    const [sku, category] = line.split(',');
    out[sku] = { original: sku, category };
  }
  for (const line of migration.trim().split('\n').slice(1)) {
    const [oldSku, newSku, category] = line.split(',');
    out[newSku] = { original: oldSku, category };
  }
  return out;
}
