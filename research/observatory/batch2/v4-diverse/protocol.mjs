// V4 (H-15): is a collective of different agents better than a collective of copies, once every agent has working space?
// Every collective so far was copies of one prompt. Search task with 48, 96 and 144 records, new seeds (../littask.mjs).
// Agents, all with at most 20 words of working unless stated:
//   a0, a1, a2  three samples of the base wording
//   b           records as text lines, instruction reworded
//   c           conditions as a checklist, records reversed, fields reordered
//   d           the base wording with at most 60 words of working
// Collectives of three: copies3 = a0, a1, a2; wordings3 = a0, b, c; mixed3 = a0, b, d. The second model (Sonnet 5.5,
// base answer-only prompt) is ../v4-diverse-sonnet; models3 = a0, b, sonnet is analysed in analyze.mjs.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import { makeTasks, COND, workSearchSystem, WORK_ID_SCHEMA, SEARCH_SYSTEM, ID_SCHEMA, plurality, bootDiff, verdictOf } from '../littask.mjs';

export const ID = 'v4-diverse';
export const TITLE = 'V4 a collective of different agents against a collective of copies (H-15)';
export const PREREG = 'tasks/V4-DIVERSE-PREREG.md';
export const WAVES = 1;
export const LEVELS = [48, 96, 144];
export const PER_LEVEL = 30;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 21001 + i);
export const AGENTS = ['a0', 'a1', 'a2', 'b', 'c', 'd'];
export const GATE = { maxInvalidShare: 0.1 };
export const tasks = () => makeTasks(SEEDS, LEVELS);
const TAIL = 'Write your working in `working`, at most 20 words, then the id of the study in `id`. Return only JSON matching the schema.';
const B_SYSTEM = `Synthetic literature search. Every line below is one study, written as: id | year | review status | outcome | sample size. Among the studies that are ${COND}, which one has the biggest sample size? ${TAIL}`;
const C_SYSTEM = `You are screening studies in a synthetic exercise. A study is eligible only if all of these hold: (1) review is "peer-reviewed"; (2) year is 2020 or later; (3) outcome is "positive". Go through the records, keep the eligible ones, and find the eligible study with the highest n. ${TAIL}`;
const req = (system, schema, content) => ({ model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content }] });
export function agentParams(t, agent) {
  const json = JSON.stringify({ task_id: t.id, records: t.records });
  if (agent === 'b') return req(B_SYSTEM, WORK_ID_SCHEMA, `task ${t.id}\n${t.records.map((r) => `${r.id} | ${r.year} | ${r.review} | ${r.outcome} | ${r.n}`).join('\n')}`);
  if (agent === 'c') return req(C_SYSTEM, WORK_ID_SCHEMA, JSON.stringify({ task_id: t.id, records: [...t.records].reverse().map((r) => ({ n: r.n, outcome: r.outcome, review: r.review, year: r.year, id: r.id })) }));
  if (agent === 'd') return req(workSearchSystem(60), WORK_ID_SCHEMA, json);
  if (agent === 'sonnet') return req(SEARCH_SYSTEM, ID_SCHEMA, json);
  return req(workSearchSystem(20), WORK_ID_SCHEMA, json);
}
export const rowsFor = (agents) => tasks().flatMap((t) => agents.map((agent) => ({ custom_id: `v4-${t.seed}-${agent}`, params: agentParams(t, agent), meta: { agent, seed: t.seed, level: t.level, answer: t.answer } })));
export const wave = () => rowsFor(AGENTS);
export const ceiling = wave;
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, valid = !!o && typeof o.id === 'string', a = valid ? o.id.trim() : null; return { customId: q.custom_id, agent: m.agent, seed: m.seed, level: m.level, valid, truncated: item?.stopReason === 'max_tokens', answer: a, correct: a === m.answer }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export const COLLECTIVES = { copies3: ['a0', 'a1', 'a2'], wordings3: ['a0', 'b', 'c'], mixed3: ['a0', 'b', 'd'] };
// One row per task: 0/1 for each agent alone and each collective. `extra` adds agents scored elsewhere (the second model).
export function perTask(scored, collectives = COLLECTIVES) {
  return SEEDS.map((seed) => { const r = scored.filter((x) => x.seed === seed), by = Object.fromEntries(r.map((x) => [x.agent, x])), truth = r.find((x) => x.correct)?.answer, row = { seed, level: r[0].level };
    for (const x of r) row[x.agent] = x.correct ? 1 : 0;
    for (const [name, members] of Object.entries(collectives)) { const v = plurality(members.map((m) => (by[m]?.valid ? by[m].answer : null))); row[name] = v !== null && v === truth ? 1 : 0; row[`${name}Distinct`] = new Set(members.map((m) => by[m]?.answer)).size; }
    return row; });
}
const mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export const accOf = (rows, keys) => Object.fromEntries(keys.map((k) => [k, mean(rows, (x) => x[k])]));
export function summarize([scored]) {
  const rows = perTask(scored), keys = [...AGENTS, ...Object.keys(COLLECTIVES)], d1 = bootDiff(rows, 'wordings3', 'copies3', 20261171), d2 = bootDiff(rows, 'mixed3', 'copies3', 20261172), d3 = bootDiff(rows, 'copies3', 'a0', 20261173);
  return { byLevel: Object.fromEntries(LEVELS.map((L) => [L, accOf(rows.filter((x) => x.level === L), keys)])), overall: accOf(rows, keys), disagreement: Object.fromEntries(Object.keys(COLLECTIVES).map((c) => [c, mean(rows, (x) => (x[`${c}Distinct`] > 1 ? 1 : 0))])),
    wordings3MinusCopies3: d1, mixed3MinusCopies3: d2, copies3MinusSingle: d3, truncated: scored.filter((x) => x.truncated).length, tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: verdictOf(d3) } };
}
