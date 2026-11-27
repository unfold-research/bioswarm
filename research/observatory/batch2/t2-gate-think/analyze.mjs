// Analysis of the third T2 gate: right answers per task and size, the registered per-task decision, the three registered
// predictions (paired against t2-gate-small on the same instances) and tokens. Usage: node observatory/batch2/t2-gate-think/analyze.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as p from './protocol.mjs';
import { tokensByRun, runId } from '../silo/tasks.mjs';
import { mulberry32 } from '../littask.mjs';

const RES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../results'), OUT = path.join(RES, 'batch2-t2-gate-think'), PLAIN = path.join(RES, 'batch2-t2-gate-small');
const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8')), lines = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const ESTIMATE = /estimat|approximat|infeasible|not perform|cannot|plausible|did not/i; // the word match of the second gate
function load(dir) {
  const scored = json(path.join(dir, 'wave-0.scored.json')), tokens = new Map(tokensByRun(lines(path.join(dir, 'ledger.jsonl'))).map((r) => [r.run, r]));
  const working = new Map(lines(path.join(dir, 'wave-0.results.jsonl')).map((r) => { let o = {}; try { o = JSON.parse(r.result.message.content.filter((z) => z.type === 'text').map((z) => z.text).join('')); } catch { /* invalid replies are graded elsewhere */ } return [r.custom_id, String(o.working || '')]; }));
  return scored.map((x) => ({ ...x, estimate: ESTIMATE.test(working.get(x.customId)), ...(({ input, output, usd }) => ({ input, output, usd }))(tokens.get(runId(x.task, x.M, x.i, 1))) }));
}
const think = load(OUT), plain = load(PLAIN), mean = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : null), sum = (a, f) => a.reduce((n, x) => n + f(x), 0), key = (x) => `${x.task}/${x.M}/${x.i}`;
const plainBy = new Map(plain.map((x) => [key(x), x]));
const cells = p.TASKS.flatMap((task) => p.SIZES.map((M) => { const r = think.filter((x) => x.task === task && x.M === M), q = r.map((x) => plainBy.get(key(x)));
  return { task, M, right: r.filter((x) => x.right).length, rightWithout: q.filter((x) => x.right).length, truncated: r.filter((x) => x.truncated).length, invalid: r.filter((x) => !x.valid).length, declaredEstimate: r.filter((x) => x.estimate).length,
    meanAbsError: mean(r.filter((x) => x.answer !== null).map((x) => Math.abs(x.answer - x.expected))), inputTokens: Math.round(mean(r.map((x) => x.input))), outputTokens: Math.round(mean(r.map((x) => x.output))), outputTokensWithout: Math.round(mean(q.map((x) => x.output))), usd: sum(r, (x) => x.usd) }; }));
const table = Object.fromEntries(p.TASKS.map((t) => [t, Object.fromEntries(p.SIZES.map((M) => [M, cells.find((c) => c.task === t && c.M === M)]))]));
const rnd = mulberry32(20261112);
function paired(M) { const d = think.filter((x) => x.M === M).map((x) => (x.right ? 1 : 0) - (plainBy.get(key(x)).right ? 1 : 0)), draws = Array.from({ length: 4000 }, () => mean(d.map(() => d[Math.floor(rnd() * d.length)]))).sort((a, b) => a - b);
  return { M, diff: +mean(d).toFixed(3), low: +draws[100].toFixed(3), high: +draws[3899].toFixed(3), supported: draws[100] > 0 }; }
const bySize = p.SIZES.map((M) => { const c = cells.filter((x) => x.M === M); return { M, right: sum(c, (x) => x.right), rightWithout: sum(c, (x) => x.rightWithout), n: 48, declaredEstimate: sum(c, (x) => x.declaredEstimate), outputTokens: Math.round(mean(c.map((x) => x.outputTokens))), outputTokensWithout: Math.round(mean(c.map((x) => x.outputTokensWithout))) }; });
const estWithout = Object.fromEntries(p.SIZES.map((M) => [M, plain.filter((x) => x.M === M && x.estimate).length]));
const predictions = { P1: p.SIZES.map(paired), P2: { xorOneShard: table['I-06'][1].right, holds: table['I-06'][1].right >= 11 }, P3: { at8: [bySize[3].declaredEstimate, estWithout[8]], at16: [bySize[4].declaredEstimate, estWithout[16]], holds: bySize[3].declaredEstimate < estWithout[8] && bySize[4].declaredEstimate < estWithout[16] } };
const result = { decision: p.decide(table), predictions, bySize, cells, usd: sum(cells, (x) => x.usd), usdWithout: sum(plain, (x) => x.usd) };
fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.decision)); console.log(JSON.stringify(predictions)); console.table(bySize);
console.table(Object.fromEntries(p.TASKS.map((t) => [t, Object.fromEntries(p.SIZES.map((M) => [M, `${table[t][M].right} (was ${table[t][M].rightWithout}) out ${table[t][M].outputTokens} cut ${table[t][M].truncated}`]))])));
console.log('usd', result.usd.toFixed(4), 'without', result.usdWithout.toFixed(4));
