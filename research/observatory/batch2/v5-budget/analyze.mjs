// Combined, preregistered analysis of V5 across the two models, with cost from the ledgers.
// Usage: node observatory/batch2/v5-budget/analyze.mjs   -> results/batch2-v5-budget/combined.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEEDS, ARMS } from './protocol.mjs';
import { bootDiff, verdictOf } from '../littask.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const load = (dir, tag) => { const scored = rd(`${dir}/wave-0.scored.json`), cost = {}, out = {}; for (const l of fs.readFileSync(path.join(ROOT, dir, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l), arm = r.customId.split('-')[2]; (cost[arm] ||= []).push(r.usageCostUsd); (out[arm] ||= []).push(r.usage.output_tokens); }
  return { tag, scored, perCall: Object.fromEntries(ARMS.map((a) => [a, cost[a].reduce((x, y) => x + y, 0) / cost[a].length])), outTokens: Object.fromEntries(ARMS.map((a) => [a, Math.round(out[a].reduce((x, y) => x + y, 0) / out[a].length)])) }; };
const H = load('results/batch2-v5-budget', 'haiku'), S = load('results/batch2-v5-budget-sonnet', 'sonnet');
const rows = SEEDS.map((seed) => { const row = { seed }; for (const m of [H, S]) for (const a of ARMS) row[`${m.tag}_${a}`] = m.scored.find((x) => x.seed === seed && x.arm === a).correct ? 1 : 0; return row; });
const keys = [H, S].flatMap((m) => ARMS.map((a) => `${m.tag}_${a}`)), accuracy = Object.fromEntries(keys.map((k) => [k, rows.reduce((n, r) => n + r[k], 0) / rows.length]));
const d = (a, b, seed) => bootDiff(rows, a, b, seed), d1 = d('sonnet_w60', 'sonnet_direct', 20261181), d2 = d('haiku_w150', 'sonnet_direct', 20261182), d3 = d('sonnet_w150', 'haiku_w150', 20261183);
const table = keys.map((k) => { const [tag, arm] = k.split('_'), m = tag === 'haiku' ? H : S; return { agent: k, accuracy: accuracy[k], usdPerCall: m.perCall[arm], outputTokens: m.outTokens[arm], usdPerCorrect: accuracy[k] ? m.perCall[arm] / accuracy[k] : null }; });
const out = { tasks: rows.length, table, sonnetW60MinusSonnetDirect: d1, haikuW150MinusSonnetDirect: d2, sonnetW150MinusHaikuW150: d3, tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: verdictOf(d3) } };
fs.writeFileSync(path.join(ROOT, 'results/batch2-v5-budget/combined.json'), JSON.stringify(out, null, 2) + '\n'); console.log(JSON.stringify(out, null, 1));
