// Q1 analysis: accuracy, agents sampled and tokens per arm, paired by task, per family.
// Usage: node observatory/batch2/q1-quorum/analyze.mjs   -> results/batch2-q1-quorum/summary.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), out = { families: {} }; let seed = 20261601;
for (const family of ['search', 'count']) { const dir = path.join(ROOT, `results/batch2-q1-quorum-${family}`), scored = JSON.parse(fs.readFileSync(path.join(dir, 'wave-0.scored.json'), 'utf8')), ledger = fs.readFileSync(path.join(dir, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const tok = new Map(ledger.map((l) => [l.customId, { tokens: l.usage.input_tokens + l.usage.output_tokens, usd: l.usageCostUsd }])), tag = family === 'search' ? 's' : 'c';
  const rows = P.perTask(family, scored).map((r) => { const x = { ...r }; for (const a of P.ARMS) { const u = r.used[a].map((g) => tok.get(`q1${tag}-${r.seed}-${g}`)); x[`${a}_tokens`] = u.reduce((n, y) => n + y.tokens, 0); x[`${a}_usd`] = u.reduce((n, y) => n + y.usd, 0); x[`${a}_agents`] = r.used[a].length; } const s = scored.filter((y) => y.seed === r.seed && y.agent[0] === 's').map((y) => y.answer); x.distinct = new Set(s).size; return x; });
  const mean = (k, set = rows) => set.reduce((n, x) => n + x[k], 0) / set.length, d = (a, b) => bootDiff(rows, a, b, seed++);
  const table = P.ARMS.map((a) => ({ arm: a, accuracy: mean(a), agents: mean(`${a}_agents`), tokens: Math.round(mean(`${a}_tokens`)), usdPer1000Tasks: 1000 * mean(`${a}_usd`) }));
  const diffs = { quorum3MinusVote7: d('quorum3', 'vote7'), quorum3MinusQuorum2: d('quorum3', 'quorum2'), w60MinusQuorum3: d('w60', 'quorum3'), vote7MinusSingle: d('vote7', 'single'), quorum2MinusSingle: d('quorum2', 'single'), w60MinusVote7: d('w60', 'vote7'), w150MinusVote7: d('w150', 'vote7'), w60TokensMinusQuorum3Tokens: d('w60_tokens', 'quorum3_tokens'), w60TokensMinusQuorum2Tokens: d('w60_tokens', 'quorum2_tokens'), w60MinusQuorum2: d('w60', 'quorum2') };
  out.families[family] = { tasks: rows.length, table, byLevel: Object.fromEntries(P.LEVELS.map((L) => [L, Object.fromEntries(P.ARMS.map((a) => [a, mean(a, rows.filter((x) => x.level === L))]))])), samplesDisagree: mean('distinct') , shareWithOneAnswer: rows.filter((x) => x.distinct === 1).length / rows.length, diffs,
    tests: { Q1: diffs.quorum3MinusVote7.ci95[0] > -0.03 && mean('quorum3_agents') < 7 ? 'supported' : 'not supported', Q2: verdictOf(diffs.quorum3MinusQuorum2), Q3: verdictOf(diffs.w60MinusQuorum3), Q3matchedCost: diffs.w60TokensMinusQuorum3Tokens.ci95[1] <= 0 ? 'w60 spends no more than quorum3' : 'w60 spends more than quorum3', Q4: verdictOf(diffs.vote7MinusSingle) }, invalid: scored.filter((x) => !x.valid).length, truncated: scored.filter((x) => x.truncated).length, usd: ledger.reduce((n, l) => n + l.usageCostUsd, 0) }; }
fs.mkdirSync(path.join(ROOT, 'results/batch2-q1-quorum'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'results/batch2-q1-quorum/summary.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
