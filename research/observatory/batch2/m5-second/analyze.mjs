// Combined, preregistered analysis of M5 with the second-model study (P4, escalation).
// Usage: node observatory/batch2/m5-second/analyze.mjs   -> results/batch2-m5-second/combined.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { perTask, analysisSet, accOf } from './protocol.mjs';
import { bootDiff } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const son = new Map(rd('results/batch2-m5-second-sonnet/wave-0.scored.json').map((x) => [x.seed, x.correct ? 1 : 0]));
const rows = perTask(rd('results/batch2-m5-second/wave-0.scored.json'), rd('results/batch2-m5-second/wave-1.scored.json')).map((t) => ({ ...t, sonnet: son.get(t.seed), escalate: t.accepted ? t.single : son.get(t.seed) }));
const { levels, pool } = analysisSet(rows), keys = ['single', 'retrySame', 'escalate', 'sonnet'], escalatedShare = pool.length ? pool.filter((t) => !t.accepted).length / pool.length : null;
const gap = pool.length ? accOf(pool, keys).sonnet - accOf(pool, keys).escalate : null;
const out = { analysisLevels: levels, pooled: pool.length ? { tasks: pool.length, ...accOf(pool, keys) } : null, overall: accOf(rows, keys), escalatedShare, escalateMinusSingle: bootDiff(pool, 'escalate', 'single', 20261124),
  tests: { P4: !pool.length ? 'inconclusive' : gap <= 0.05 && escalatedShare < 0.7 ? 'supported' : 'not supported' } };
fs.writeFileSync(path.join(ROOT, 'results/batch2-m5-second/combined.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
