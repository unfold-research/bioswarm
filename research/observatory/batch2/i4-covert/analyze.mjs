// Combined, preregistered analysis of I4 from the three per-family submissions of one model.
// Usage: node observatory/batch2/i4-covert/analyze.mjs [-sonnet]   -> results/batch2-i4-covert[-sonnet]/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES, familySummary, tests } from './protocol.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), SUF = process.argv[2] || '';
const byFamily = Object.fromEntries(FAMILIES.map((f) => [f, familySummary(JSON.parse(fs.readFileSync(path.join(ROOT, `results/batch2-i4-covert-${f}${SUF}`, 'wave-0.scored.json'), 'utf8')))]));
const out = path.join(ROOT, `results/batch2-i4-covert${SUF}`); fs.mkdirSync(out, { recursive: true });
const summary = { study: `i4-covert${SUF}`, byFamily, tests: tests(byFamily) };
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n'); console.log(JSON.stringify(summary, null, 1));
