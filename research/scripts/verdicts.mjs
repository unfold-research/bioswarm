// Single source of truth for LI hypothesis verdicts: results/li-verdicts.json.
// Checks that every hypothesis page's status equals the status derived from its registered verdict, and that a post hoc
// reading recorded there appears on the page as `posthoc:`. --write rewrites the pages from the JSON.
// Usage: node scripts/verdicts.mjs [--write]
import fs from 'node:fs';
const V = JSON.parse(fs.readFileSync('results/li-verdicts.json', 'utf8')), write = process.argv.includes('--write'), errs = [];
for (const h of V.hypotheses) {
  const f = `hypotheses/${h.id}.md`; if (!fs.existsSync(f)) { errs.push(`${h.id}: no page`); continue; }
  let s = fs.readFileSync(f, 'utf8'); const want = V.statusOf[h.registered]; if (!want) { errs.push(`${h.id}: unknown registered verdict ${h.registered}`); continue; }
  const fm = s.split('\n---')[0], has = (k) => new RegExp(`^${k}: `, 'm').test(fm), get = (k) => (fm.match(new RegExp(`^${k}: "?(.*?)"?$`, 'm')) || [])[1];
  const fields = { status: want, registered: h.registered, ...(h.posthoc ? { posthoc: h.posthoc } : {}), ...(h.basis ? { basis: h.basis } : {}) };
  for (const [k, v] of Object.entries(fields)) {
    if (get(k) === v) continue;
    if (!write) { errs.push(`${h.id}: ${k} is "${get(k) ?? ''}", the verdict file says "${v}"`); continue; }
    const line = `${k}: ${JSON.stringify(v)}`;
    s = has(k) ? s.replace(new RegExp(`^${k}: .*$`, 'm'), line) : s.replace(/^status: .*$/m, (m) => (k === 'status' ? line : `${m}\n${line}`));
  }
  if (write) fs.writeFileSync(f, s);
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`${V.hypotheses.length} LI hypotheses match results/li-verdicts.json`);
