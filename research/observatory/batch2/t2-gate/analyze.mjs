// Analysis of the T2 calibration gate: share right, cut replies and tokens per task and size, and the registered decision.
// Usage: node observatory/batch2/t2-gate/analyze.mjs   (writes results/batch2-t2-gate/analysis.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from './protocol.mjs';
import { TASKS, INSTANCES, tokensByRun, runId } from '../silo/tasks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../results/batch2-t2-gate');
const scored = JSON.parse(fs.readFileSync(path.join(OUT, 'wave-0.scored.json'), 'utf8'));
const ledger = fs.readFileSync(path.join(OUT, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const tokens = new Map(tokensByRun(ledger).map((r) => [r.run, r])), mean = (a) => a.reduce((n, x) => n + x, 0) / a.length;
const cells = TASKS.flatMap((task) => p.SIZES.map((M) => { const rows = scored.filter((x) => x.task === task && x.M === M), t = rows.map((x) => tokens.get(runId(task, M, x.i, 1)));
  return { task, M, n: rows.length, right: rows.filter((x) => x.right).length, truncated: rows.filter((x) => x.truncated).length, invalid: rows.filter((x) => !x.valid).length,
    meanAbsError: mean(rows.filter((x) => x.answer !== null).map((x) => Math.abs(x.answer - x.expected)).concat(rows.every((x) => x.answer === null) ? [NaN] : [])),
    inputTokens: Math.round(mean(t.map((x) => x.input))), outputTokens: Math.round(mean(t.map((x) => x.output))), usd: t.reduce((n, x) => n + x.usd, 0) }; }));
const table = Object.fromEntries(TASKS.map((t) => [t, Object.fromEntries(p.SIZES.map((M) => [M, cells.find((c) => c.task === t && c.M === M)]))]));
const bySize = p.SIZES.map((M) => { const c = cells.filter((x) => x.M === M); return { M, right: c.reduce((n, x) => n + x.right, 0), n: TASKS.length * INSTANCES, truncated: c.reduce((n, x) => n + x.truncated, 0), usd: c.reduce((n, x) => n + x.usd, 0) }; });
const result = { decision: p.decide(table), bySize, cells, usd: cells.reduce((n, x) => n + x.usd, 0) };
fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.decision)); console.table(bySize);
console.table(cells.map(({ task, M, right, truncated, invalid, meanAbsError, inputTokens, outputTokens }) => ({ task, M, right, truncated, invalid, meanAbsError: Number.isNaN(meanAbsError) ? '' : +meanAbsError.toFixed(1), inputTokens, outputTokens })));
