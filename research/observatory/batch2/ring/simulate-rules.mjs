// Rule regimes of the ring setting evaluated without any model: readers that count exactly. Justification: in R2b and
// R3, with real readers (0.99 of counts exact), sweep and alarm landed on exactly these figures for the same collections.
// Usage: node observatory/batch2/ring/simulate-rules.mjs [collections per scenario, default 2000]  -> results/ring-rules/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { waveOf, wavesOf, score, summarize, range } from './engine.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), N = Number(process.argv[2] || 2000);
const wilson = (k, n) => { const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [c - h, c + h]; };
export function exact(spec) { const out = new Map(), scored = []; for (let k = 0; k < wavesOf(spec); k++) { const rows = waveOf(spec, k, out); for (const q of rows) out.set(q.custom_id, { output: { working: '', counts: q.meta.authors.map((a) => ({ author: a, n: q.meta.truth[a] })) } }); scored.push(score(k, rows, out)); } return summarize(spec, scored); }
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = { collectionsPerScenario: N, seedsFrom: 900001, scenarios: {} };
  for (const scenario of ['local', 'scatter', 'poison']) { out.scenarios[scenario] = {};
    for (const regime of ['sweep', 'alarm', 'hedge', 'adapt', 'probe']) { const s = exact({ prefix: 'sim', scenario, seeds: range(900001, N), regime }), k = Math.round(s.accuracy.edited * N);
      out.scenarios[scenario][regime] = { edited: s.accuracy.edited, ci95: wilson(k, N), stable: s.accuracy.stable, editedPartsReread: s.editedPartsReread, poisonReread: s.poisonReread }; console.log(scenario.padEnd(8), regime.padEnd(6), s.accuracy.edited.toFixed(3), wilson(k, N).map((x) => x.toFixed(3)).join(' to '), 'stable', s.accuracy.stable.toFixed(3)); } }
  fs.mkdirSync(path.join(ROOT, 'results/ring-rules'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/ring-rules/summary.json'), JSON.stringify(out, null, 2) + '\n');
}
