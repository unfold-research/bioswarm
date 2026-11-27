// Analysis of the second T2 gate: share right, tokens and declared estimates per task and size, the registered decision
// and the three registered expectations. Usage: node observatory/batch2/t2-gate-small/analyze.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from './protocol.mjs';
import { tokensByRun, runId } from '../silo/tasks.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../results/batch2-t2-gate-small'), lines = (f) => fs.readFileSync(path.join(OUT, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const scored = JSON.parse(fs.readFileSync(path.join(OUT, 'wave-0.scored.json'), 'utf8')), tokens = new Map(tokensByRun(lines('ledger.jsonl')).map((r) => [r.run, r]));
const ESTIMATE = /estimat|approximat|infeasible|not perform|cannot|plausible|did not/i; // fixed in the preregistration
const working = new Map(lines('wave-0.results.jsonl').map((r) => { let o = {}; try { o = JSON.parse(r.result.message.content.filter((z) => z.type === 'text').map((z) => z.text).join('')); } catch { /* graded as invalid elsewhere */ } return [r.custom_id, String(o.working || '')]; }));
const mean = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : null), sum = (a, f) => a.reduce((n, x) => n + f(x), 0);
const cells = p.TASKS.flatMap((task) => p.SIZES.map((M) => { const rows = scored.filter((x) => x.task === task && x.M === M), t = rows.map((x) => tokens.get(runId(task, M, x.i, 1)));
  return { task, M, n: rows.length, right: rows.filter((x) => x.right).length, truncated: rows.filter((x) => x.truncated).length, invalid: rows.filter((x) => !x.valid).length, declaredEstimate: rows.filter((x) => ESTIMATE.test(working.get(x.customId))).length,
    meanAbsError: mean(rows.filter((x) => x.answer !== null).map((x) => Math.abs(x.answer - x.expected))), inputTokens: Math.round(mean(t.map((x) => x.input))), outputTokens: Math.round(mean(t.map((x) => x.output))), usd: sum(t, (x) => x.usd) }; }));
const table = Object.fromEntries(p.TASKS.map((t) => [t, Object.fromEntries(p.SIZES.map((M) => [M, cells.find((c) => c.task === t && c.M === M)]))]));
const bySize = p.SIZES.map((M) => { const c = cells.filter((x) => x.M === M), n = p.TASKS.length * p.INSTANCES; return { M, right: sum(c, (x) => x.right), n, share: +(sum(c, (x) => x.right) / n).toFixed(3), declaredEstimate: sum(c, (x) => x.declaredEstimate), outputTokens: Math.round(mean(c.map((x) => x.outputTokens))) }; });
const shared16 = sum(['I-05', 'I-06', 'III-22'], (t) => table[t][16].right), est = bySize.map((x) => x.declaredEstimate);
const expectations = { P1: { rightOf36At16: shared16, holds: shared16 <= 6 }, P2: { globalMaxBySize: p.SIZES.map((M) => table['I-01'][M].right), holds: p.SIZES.every((M) => table['I-01'][M].right / p.INSTANCES >= 0.9) }, P3: { declaredEstimateBySize: est, holds: est.every((x, i) => i === 0 || x >= est[i - 1]) && est.at(-1) > est[0] } };
const result = { decision: p.decide(table), expectations, bySize, cells, usd: sum(cells, (x) => x.usd) };
fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.decision)); console.log(JSON.stringify(expectations)); console.table(bySize);
console.table(Object.fromEntries(p.TASKS.map((t) => [t, Object.fromEntries(p.SIZES.map((M) => [M, `${table[t][M].right}/12 est ${table[t][M].declaredEstimate} out ${table[t][M].outputTokens}`]))])));
console.log('usd', result.usd.toFixed(4));
