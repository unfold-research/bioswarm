// Counts what BioSwarm did in one agent folder, from its .bioswarm-events.jsonl (kinds and numbers only).
// Usage: node report.mjs <agent-dir> [--since ISO-date]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [dir, flag, since] = process.argv.slice(2);
if (!dir) { console.error('usage: node report.mjs <agent-dir> [--since ISO-date]');process.exit(1); }
const from = flag === '--since' ? Date.parse(since) : 0;
const events = readFileSync(join(dir, '.bioswarm-events.jsonl'), 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(e => e.at >= from);
const runs = events.filter(e => e.type === 'run_end'), count = (pred) => events.filter(pred).length;
const tools = {};for (const e of events.filter(e => e.type === 'tool')) tools[e.tool] = (tools[e.tool] || 0) + 1;
const cost = runs.map(r => r.costUsd).sort((a, b) => a - b), q = p => (cost.length ? cost[Math.min(cost.length - 1, Math.floor(p * cost.length))] : 0);
console.log(JSON.stringify({ runs: runs.length, costUsd: { total: Number(cost.reduce((a, b) => a + b, 0).toFixed(4)), median: q(0.5), p90: q(0.9) },
  messagesSent: count(e => e.type === 'message_sent'), marks: count(e => e.type === 'mark'), readMarks: count(e => e.type === 'read_marks'),
  rules: { message_ceiling: count(e => e.rule === 'message_ceiling'), message_pointer: count(e => e.rule === 'message_pointer'), taken_undone: count(e => e.rule === 'taken_undone'), run_budget: count(e => e.rule === 'run_budget') },
  tools }, null, 2));
