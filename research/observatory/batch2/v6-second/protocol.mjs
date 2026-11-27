// V6: do the results of the search task hold on a task of another kind? Every V and M result since M4 comes from one
// task (find one record). V6 repeats the main contrasts on counting by group (../grouptask.mjs).
//   wave 0  direct (answer only); s0, s1, s2 (at most 20 words of working); w60; w150
//   wave 1  a verifier with at most 40 words of working on the s0 answer
// Strategies: single = s0; vote3 = plurality of s0..s2; verify3 = s0 if accepted, otherwise s1.
// Claude Haiku 5.5, thinking disabled, 1,536 output tokens. Sonnet 5.5 (direct and w60) is ../v6-second-sonnet.
import { MODEL } from '../../lab007-economy/model.mjs';
import { LEVELS, makeTasks, DIRECT_SYSTEM, workSystem, verifySystem, AUTHOR_SCHEMA, WORK_AUTHOR_SCHEMA } from '../grouptask.mjs';
import { ACCEPT_WORK_SCHEMA, plurality, bootDiff, verdictOf } from '../littask.mjs';

export const ID = 'v6-second';
export const TITLE = 'V6 the main contrasts on a second task: counting by group (H-01, H-M03)';
export const PREREG = 'tasks/V6-SECOND-PREREG.md';
export const WAVES = 2;
export const PER_LEVEL = 30, OUT_MAX = 1536;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 24001 + i);
export const AGENTS = ['direct', 's0', 's1', 's2', 'w60', 'w150'];
export const GATE = { maxInvalidShare: 0.1 };
export { LEVELS };
export const tasks = () => makeTasks(SEEDS);
const req = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
export function agentParams(t, agent) { const c = { task_id: t.id, records: t.records };
  return agent === 'direct' ? req(DIRECT_SYSTEM, AUTHOR_SCHEMA, c) : req(workSystem(agent === 'w60' ? 60 : agent === 'w150' ? 150 : 20), WORK_AUTHOR_SCHEMA, c); }
export const rowsFor = (agents) => tasks().flatMap((t) => agents.map((agent) => ({ custom_id: `v6-${t.seed}-${agent}`, params: agentParams(t, agent), meta: { kind: 'answer', agent, seed: t.seed, level: t.level, answer: t.answer, authors: t.authors } })));
const answerOf = (outputs, id) => { const o = outputs.get(id)?.output; return o && typeof o.author === 'string' ? o.author.trim() : null; };
const verifierRow = (t, a) => ({ custom_id: `v6-${t.seed}-v`, params: req(verifySystem(40), ACCEPT_WORK_SCHEMA, { task_id: t.id, records: t.records, proposed_author: a }), meta: { kind: 'verify', agent: 'v', seed: t.seed, level: t.level, truthCorrect: a === t.answer } });
export function wave(k, outputs) {
  if (k === 0) return rowsFor(AGENTS);
  return tasks().flatMap((t) => { const a = answerOf(outputs, `v6-${t.seed}-s0`); return a && t.authors.includes(a) ? [verifierRow(t, a)] : []; });
}
export const ceiling = (k) => tasks().map((t) => verifierRow(t, t.planted));
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'verify') { const valid = !!o && typeof o.accept === 'boolean'; return { customId: q.custom_id, kind: 'verify', agent: 'v', seed: m.seed, level: m.level, truthCorrect: m.truthCorrect, valid, truncated, accept: valid && o.accept === true }; }
    const valid = !!o && typeof o.author === 'string', a = valid ? o.author.trim() : null; return { customId: q.custom_id, kind: 'answer', agent: m.agent, seed: m.seed, level: m.level, valid, truncated, answer: a, correct: a === m.answer }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export const KEYS = ['direct', 'single', 'vote3', 'verify3', 'w60', 'w150'];
export function perTask(s0, s1) {
  return SEEDS.map((seed) => { const g = (a) => s0.find((x) => x.seed === seed && x.agent === a), s = ['s0', 's1', 's2'].map(g), ok = (x) => (x && x.correct ? 1 : 0), v = plurality(s.map((x) => (x.valid ? x.answer : null))), acc = s1.find((x) => x.seed === seed)?.accept === true;
    return { seed, level: s[0].level, direct: ok(g('direct')), single: ok(s[0]), vote3: s.some((x) => x.correct && x.answer === v) ? 1 : 0, verify3: acc ? ok(s[0]) : ok(s[1]), w60: ok(g('w60')), w150: ok(g('w150')), differ: new Set(s.map((x) => x.answer)).size > 1 ? 1 : 0 }; });
}
const mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export const accOf = (rows, keys) => Object.fromEntries(keys.map((k) => [k, mean(rows, (x) => x[k])]));
export function summarize([s0, s1]) {
  if (!s1) return { tests: { P1: 'not-evaluated', P2: 'not-evaluated', P3: 'not-evaluated' } };
  const rows = perTask(s0, s1), d1 = bootDiff(rows, 'w60', 'direct', 20261201), d2 = bootDiff(rows, 'vote3', 'single', 20261202), d3 = bootDiff(rows, 'verify3', 'vote3', 20261203), right = s1.filter((x) => x.truthCorrect), wrong = s1.filter((x) => !x.truthCorrect);
  return { byLevel: Object.fromEntries(LEVELS.map((L) => [L, accOf(rows.filter((x) => x.level === L), KEYS)])), overall: accOf(rows, KEYS), samplesDiffer: mean(rows, (x) => x.differ), w60MinusDirect: d1, vote3MinusSingle: d2, verify3MinusVote3: d3,
    verifier: { correctAnswers: right.length, accepted: right.filter((x) => x.accept).length, wrongAnswers: wrong.length, rejected: wrong.filter((x) => !x.accept).length }, truncated: [...s0, ...s1].filter((x) => x.truncated).length, tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: verdictOf(d3) } };
}
