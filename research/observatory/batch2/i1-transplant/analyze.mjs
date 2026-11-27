// Combined, preregistered analysis of I1 from the three per-family submissions.
// Usage: node observatory/batch2/i1-transplant/analyze.mjs [-sonnet]   -> results/batch2-i1-transplant[-sonnet]/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES, familySummary, tests } from './protocol.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), SUF = process.argv[2] || '', dir = (f) => path.join(ROOT, `results/batch2-i1-transplant-${f}${SUF}`);
const byFamily = {}, tokens = {};
for (const f of FAMILIES) {
  byFamily[f] = familySummary(JSON.parse(fs.readFileSync(path.join(dir(f), 'wave-0.scored.json'), 'utf8')));
  const acc = {}; for (const l of fs.readFileSync(path.join(dir(f), 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l), arm = r.customId.split('-').pop(); (acc[arm] ||= []).push(r.usage.output_tokens); }
  tokens[f] = Object.fromEntries(Object.entries(acc).map(([a, v]) => [a, Math.round(v.reduce((x, y) => x + y, 0) / v.length)]));
}
const out = path.join(ROOT, `results/batch2-i1-transplant${SUF}`); fs.mkdirSync(out, { recursive: true });
const summary = { study: `i1-transplant${SUF}`, byFamily, meanOutputTokens: tokens, tests: tests(byFamily, tokens) };
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n'); console.log(JSON.stringify(summary, null, 1));
