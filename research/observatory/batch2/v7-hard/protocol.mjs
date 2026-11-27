// V7 (H-M03, H-02): where does a collective pay once agents reason deeply? M8 put a verifier behind a deep agent on the
// search task and found nothing to add, because the agent was at 0.94. V7 uses counting by group at sizes where the deep
// agent was below ceiling in V6 (0.83 at 96 records) and larger (up to 168 records, the most that fits the request size ceiling).
//   wave 0  three deep agents (at most 150 words of working, 1,536 output tokens): d0, d1, d2
//   wave 1  a verifier with at most 150 words of working on each distinct author among d0..d2
// Strategies: deep = d0; deepvote3 = plurality; select3 = the first accepted answer in sample order, otherwise the
// plurality. The second model (Sonnet 5.5 with 60 words of working) is ../v7-hard-sonnet; escalate = d0 if accepted,
// otherwise the Sonnet answer (analyze.mjs).
import { MODEL } from '../../lab007-economy/model.mjs';
import { makeTasks, workSystem, verifySystem, WORK_AUTHOR_SCHEMA } from '../grouptask.mjs';
import { ACCEPT_WORK_SCHEMA, plurality, bootDiff, verdictOf } from '../littask.mjs';

export const ID = 'v7-hard';
export const TITLE = 'V7 verification and voting among deep agents on a task they do not saturate (H-M03, H-02)';
export const PREREG = 'tasks/V7-HARD-PREREG.md';
export const WAVES = 2;
export const LEVELS = [96, 144, 168];
export const PER_LEVEL = 30, OUT_MAX = 1536;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 25001 + i);
export const GATE = { maxInvalidShare: 0.1 };
export const tasks = () => makeTasks(SEEDS, LEVELS);
const req = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
export const deepParams = (t, w = 150) => req(workSystem(w), WORK_AUTHOR_SCHEMA, { task_id: t.id, records: t.records });
const answerOf = (outputs, id) => { const o = outputs.get(id)?.output; return o && typeof o.author === 'string' ? o.author.trim() : null; };
const verifierRows = (t, proposals) => proposals.map((a) => ({ custom_id: `v7-${t.seed}-v-${a}`, params: req(verifySystem(150), ACCEPT_WORK_SCHEMA, { task_id: t.id, records: t.records, proposed_author: a }), meta: { kind: 'verify', seed: t.seed, level: t.level, proposed: a, truthCorrect: a === t.answer } }));
export function wave(k, outputs) {
  if (k === 0) return tasks().flatMap((t) => [0, 1, 2].map((s) => ({ custom_id: `v7-${t.seed}-d${s}`, params: deepParams(t), meta: { kind: 'answer', sample: s, seed: t.seed, level: t.level, answer: t.answer, authors: t.authors } })));
  return tasks().flatMap((t) => verifierRows(t, [...new Set([0, 1, 2].map((s) => answerOf(outputs, `v7-${t.seed}-d${s}`)).filter((a) => a && t.authors.includes(a)))]));
}
export const ceiling = (k) => tasks().flatMap((t) => verifierRows(t, t.authors.slice(0, 3)));
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'verify') { const valid = !!o && typeof o.accept === 'boolean'; return { customId: q.custom_id, kind: 'verify', seed: m.seed, level: m.level, proposed: m.proposed, truthCorrect: m.truthCorrect, valid, truncated, accept: valid && o.accept === true }; }
    const valid = !!o && typeof o.author === 'string', a = valid ? o.author.trim() : null; return { customId: q.custom_id, kind: 'answer', sample: m.sample, seed: m.seed, level: m.level, valid, truncated, answer: a, known: valid && m.authors.includes(a), correct: a === m.answer }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export const KEYS = ['deep', 'deepvote3', 'select3', 'any3'];
export function perTask(s0, s1) {
  const verdict = new Map(s1.map((x) => [`${x.seed}/${x.proposed}`, x.accept]));
  return SEEDS.map((seed) => { const r = s0.filter((x) => x.seed === seed).sort((a, b) => a.sample - b.sample), a = r.map((x) => (x.valid ? x.answer : null)), ok = (x) => (r.some((y) => y.correct && y.answer === x) ? 1 : 0), acc = (i) => !!a[i] && r[i].known && verdict.get(`${seed}/${a[i]}`) === true, first = [0, 1, 2].find(acc);
    return { seed, level: r[0].level, deep: ok(a[0]), deepvote3: ok(plurality(a)), select3: ok(first !== undefined ? a[first] : plurality(a)), any3: a.some((x) => ok(x)) ? 1 : 0, accepted0: acc(0) ? 1 : 0, differ: new Set(a).size > 1 ? 1 : 0 }; });
}
const mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export const accOf = (rows, keys) => Object.fromEntries(keys.map((k) => [k, mean(rows, (x) => x[k])]));
export function summarize([s0, s1]) {
  if (!s1) return { tests: { P1: 'not-evaluated', P2: 'not-evaluated', P3: 'not-evaluated' } };
  const rows = perTask(s0, s1), all = accOf(rows, KEYS), ceil = all.deep > 0.9, d1 = bootDiff(rows, 'select3', 'deep', 20261211), d2 = bootDiff(rows, 'deepvote3', 'deep', 20261212), d3 = bootDiff(rows, 'select3', 'deepvote3', 20261213), right = s1.filter((x) => x.truthCorrect), wrong = s1.filter((x) => !x.truthCorrect), v = (d) => (ceil ? 'inconclusive' : verdictOf(d));
  return { byLevel: Object.fromEntries(LEVELS.map((L) => [L, accOf(rows.filter((x) => x.level === L), KEYS)])), overall: all, samplesDiffer: mean(rows, (x) => x.differ), select3MinusDeep: d1, deepvote3MinusDeep: d2, select3MinusDeepvote3: d3,
    verifier: { correctAnswers: right.length, accepted: right.filter((x) => x.accept).length, wrongAnswers: wrong.length, rejected: wrong.filter((x) => !x.accept).length }, truncated: [...s0, ...s1].filter((x) => x.truncated).length, tests: { P1: v(d1), P2: v(d2), P3: v(d3) } };
}
