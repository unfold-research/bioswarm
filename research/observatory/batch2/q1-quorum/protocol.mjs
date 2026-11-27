// Q1 quorum as a stopping rule. The P1 paper names quorum as a primitive; the repository had no run with a quorum rule
// and language-model agents. Votes among agents added little (REP1). A quorum is not a vote: it stops sampling as soon as
// q independent answers agree, so its claim is about cost for a given accuracy (the speed-accuracy trade-off of
// nest-site selection), not about accuracy alone.
// Two task families ('search', 'count'; ../littask.mjs, ../grouptask.mjs), 24, 48 and 96 records, 100 tasks per size,
// new seeds. Per task, one wave: s0..s6, seven independent agents with at most 20 words of working; w60 and w150, one
// agent with 60 and with 150 words. Everything else is computed from those answers in order:
//   single = s0; vote3, vote5, vote7 = plurality of the first 3, 5, 7
//   quorum2, quorum3 = sample s0, s1, ... and stop as soon as some answer has been given 2 (3) times; at most 7;
//                      if no answer reaches the quorum, the plurality of the 7
// Tokens are counted per arm from the returned usage of the calls the arm made.
import { MODEL } from '../../lab007-economy/model.mjs';
import * as lit from '../littask.mjs';
import * as grp from '../grouptask.mjs';

export const TITLE = 'Q1 quorum as a stopping rule against fixed votes and one deeper agent';
export const PREREG = 'tasks/D5-Q1-PREREG.md';
export const WAVES = 1, LEVELS = [24, 48, 96], PER_LEVEL = 100, OUT_MAX = 1536, MAX = 7, GATE = { maxInvalidShare: 0.1 };
export const CONTROLS = { exempt: 'the single-agent arms (one agent with 20, 60 and 150 words of working) are in the study; there is no field and so no schedule to compare with' };
const FAMILY = {
  search: { tag: 's', from: 42001, tasks: (seeds) => lit.makeTasks(seeds, LEVELS), key: 'id', work: (w) => [lit.workSearchSystem(w), lit.WORK_ID_SCHEMA] },
  count: { tag: 'c', from: 43001, tasks: (seeds) => grp.makeTasks(seeds, LEVELS), key: 'author', work: (w) => [grp.workSystem(w), grp.WORK_AUTHOR_SCHEMA] },
};
export const AGENTS = [...Array.from({ length: MAX }, (_, i) => `s${i}`), 'w60', 'w150'];
export const seedsOf = (family) => Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => FAMILY[family].from + i);
export const tasksOf = (family) => FAMILY[family].tasks(seedsOf(family));
const words = (agent) => (agent === 'w60' ? 60 : agent === 'w150' ? 150 : 20);
export function waveOf(family) { const F = FAMILY[family];
  return tasksOf(family).flatMap((t) => AGENTS.map((agent) => { const [system, schema] = F.work(words(agent)); return { custom_id: `q1${F.tag}-${t.seed}-${agent}`, params: { model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify({ task_id: t.id, records: t.records }) }] }, meta: { family, agent, seed: t.seed, level: t.level, answer: t.answer } }; })); }
export function score(k, rows, outputs) { return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, key = FAMILY[m.family].key, valid = !!o && typeof o[key] === 'string', a = valid ? o[key].trim() : null; return { customId: q.custom_id, agent: m.agent, seed: m.seed, level: m.level, valid, truncated: item?.stopReason === 'max_tokens', answer: a, correct: a === m.answer }; }); }
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
// A quorum over answers in order (null = invalid). Returns the answer and the number of agents sampled.
export function quorum(answers, q) { const n = new Map(); for (let i = 0; i < answers.length; i++) { const a = answers[i]; if (a === null) continue; n.set(a, (n.get(a) || 0) + 1); if (n.get(a) >= q) return { answer: a, used: i + 1 }; } return { answer: lit.plurality(answers), used: answers.length }; }
export const ARMS = ['single', 'vote3', 'vote5', 'vote7', 'quorum2', 'quorum3', 'w60', 'w150'];
// Per task: answer right or not, and which agents each arm used.
export function perTask(family, scored) { const by = new Map(); for (const x of scored) { if (!by.has(x.seed)) by.set(x.seed, {}); by.get(x.seed)[x.agent] = x; }
  return tasksOf(family).map((t) => { const g = by.get(t.seed), s = Array.from({ length: MAX }, (_, i) => (g[`s${i}`].valid ? g[`s${i}`].answer : null)), ok = (a) => (a !== null && a === t.answer ? 1 : 0), first = (k) => Array.from({ length: k }, (_, i) => `s${i}`), row = { seed: t.seed, level: t.level, used: {} };
    const put = (arm, answer, agents) => { row[arm] = ok(answer); row.used[arm] = agents; };
    put('single', s[0], first(1)); for (const k of [3, 5, 7]) put(`vote${k}`, lit.plurality(s.slice(0, k)), first(k)); for (const q of [2, 3]) { const r = quorum(s, q); put(`quorum${q}`, r.answer, first(r.used)); }
    put('w60', g.w60.valid ? g.w60.answer : null, ['w60']); put('w150', g.w150.valid ? g.w150.answer : null, ['w150']); return row; }); }
export function summarizeFamily(family, [scored]) { const rows = perTask(family, scored), m = (f) => rows.reduce((n, x) => n + f(x), 0) / rows.length;
  return { family, tasks: rows.length, accuracy: Object.fromEntries(ARMS.map((a) => [a, m((x) => x[a])])), agentsUsed: Object.fromEntries(ARMS.map((a) => [a, m((x) => x.used[a].length)])), invalid: scored.filter((x) => !x.valid).length, truncated: scored.filter((x) => x.truncated).length, perTask: rows }; }
export const study = (family) => ({ ID: `q1-quorum-${family}`, TITLE: `${TITLE} — ${family}`, PREREG, WAVES, CONTROLS, wave: () => waveOf(family), ceiling: () => waveOf(family), score, gate, summarize: (s) => summarizeFamily(family, s) });
