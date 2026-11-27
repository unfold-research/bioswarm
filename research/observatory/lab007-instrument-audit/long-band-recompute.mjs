// Recompute every rc study's ledger entries (run-rc, run-rc2, run-rc3: <out>-wave-<k>[-p<i>]) from its raw batch results,
// at the runner's old flat price and at the banded price of pricing.mjs (Haiku 5.5 is 5x above 100k prompt tokens).
// Raw results come from git or R2 (scripts/raw.sh get; the former data-<out> GitHub releases were moved there). Read-only on the ledger.
// The old flat price must reproduce what the ledger recorded; a study where it does not is reported, not corrected.
//   node observatory/lab007-instrument-audit/long-band-recompute.mjs <ledger.json> <out.json>
// LI38 and later ran on the banded runner (PR #113) and are skipped.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { usageCostFor } from '../lab007-economy/pricing.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ledger = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), OUTFILE = process.argv[3];
const FLAT = { 'claude-haiku-5-5': { in: 0.05, out: 0.25 }, 'claude-sonnet-5-5': { in: 1, out: 5 } };
const outs = [...new Set(Object.keys(ledger.commitments).map((k) => k.match(/^(li(?:[7-9]|[1-3]\d)[a-z0-9-]*?)-wave-\d+(?:-p\d+)?$/)?.[1]).filter(Boolean))].filter((o) => o !== 'li38-k160').sort();
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
// an aborted run keeps its raw data under results/<out>-aborted (e.g. li28-k80-aborted)
function rawDir(out) {
  for (const name of [out, `${out}-aborted`]) {
    const git = path.join(ROOT, 'results', name);
    if (walk(git).some((f) => /wave-\d+(-p\d+)?\.results\.jsonl$/.test(f))) return { dir: git, source: 'git' };
    if (fs.existsSync(path.join(git, 'RAW-MANIFEST.json'))) { try { execFileSync('sh', ['scripts/raw.sh', 'get', `results/${name}`], { cwd: ROOT, stdio: 'ignore' }); } catch {} if (walk(git).some((f) => /\.results\.jsonl$/.test(f))) return { dir: git, source: `R2 ${name}` }; }
  }
  return { dir: null, source: 'missing' };
}
const report = [];
for (const out of outs) {
  const { dir, source } = rawDir(out), files = new Map(walk(dir || '/nonexistent').filter((f) => /wave-\d+(-p\d+)?\.results\.jsonl$/.test(f)).map((f) => [path.basename(f).replace('.results.jsonl', ''), f]));
  const r = { out, source, entries: 0, missingFiles: [], oldUsd: 0, flatUsd: 0, bandedUsd: 0, longRequests: 0, requests: 0, models: {} };
  for (const [name, e] of Object.entries(ledger.commitments)) {
    if (!name.startsWith(out + '-wave-') || !/^wave-\d+(-p\d+)?$/.test(name.slice(out.length + 1))) continue;
    r.entries++; r.oldUsd += Number(e.committedUsd || 0);
    const f = files.get(name.slice(out.length + 1)); if (!f) { r.missingFiles.push(name); r.flatUsd += Number(e.committedUsd || 0); r.bandedUsd += Number(e.committedUsd || 0); continue; }
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l.trim()) continue; const x = JSON.parse(l), m = x.result?.message; if (!m) continue;
      const model = m.model || 'claude-haiku-5-5', u = m.usage || {}, p = FLAT[model] || FLAT['claude-haiku-5-5'], prompt = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      r.models[model] = (r.models[model] || 0) + 1; r.requests++; if (prompt > 100000 && model === 'claude-haiku-5-5') r.longRequests++;
      r.flatUsd += ((u.input_tokens || 0) * p.in + (u.output_tokens || 0) * p.out) / 1e6; r.bandedUsd += usageCostFor(model, u); }
  }
  for (const k of ['oldUsd', 'flatUsd', 'bandedUsd']) r[k] = +r[k].toFixed(6);
  r.flatMatchesLedger = Math.abs(r.flatUsd - r.oldUsd) < 0.005; r.deltaUsd = +(r.bandedUsd - r.oldUsd).toFixed(6);
  report.push(r); process.stderr.write(`${out} ${source} entries=${r.entries} old=${r.oldUsd.toFixed(4)} flat=${r.flatUsd.toFixed(4)} banded=${r.bandedUsd.toFixed(4)} long=${r.longRequests} missing=${r.missingFiles.length}\n`);
}
fs.writeFileSync(OUTFILE, JSON.stringify({ generatedAt: new Date().toISOString(), method: 'flat = runner price (Haiku 0.05/0.25, Sonnet 1/5 per Mtok batch); banded = pricing.mjs usageCostFor', studies: report }, null, 1) + '\n');
