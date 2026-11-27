// Combined, preregistered analysis of V1 from the two per-arm submissions.
// Usage: node observatory/batch2/v1-vote/analyze.mjs   -> results/batch2-v1-vote/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarize } from './protocol.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), read = (a) => JSON.parse(fs.readFileSync(path.join(ROOT, `results/batch2-v1-vote-${a}/wave-0.scored.json`), 'utf8'));
const out = path.join(ROOT, 'results/batch2-v1-vote'); fs.mkdirSync(out, { recursive: true });
const summary = { study: 'v1-vote', ...summarize([[...read('ident'), ...read('diverse')]]) };
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n'); console.log(JSON.stringify(summary, null, 1));
