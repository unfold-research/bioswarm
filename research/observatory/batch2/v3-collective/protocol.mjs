// V3 (H-01, H-M03, H-15): does a collective add anything once each agent has working space? V1b, M4, M5 and V2 compared
// collectives of agents without working space against one agent with it. V3 gives every agent working space and makes
// the task hard enough for one such agent to fail: the search task with 48, 96 and 144 records.
//   wave 0  five samples of a searcher with at most 20 words of working (s0..s4); one searcher with at most 150 (deep)
//   wave 1  a verifier with at most 40 words of working, on each distinct record id among s0 and s1
// Strategies: single = s0; vote3, vote5 = plurality; verify3 = s0 if accepted, otherwise s1; deep = one call with more working.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import { makeTasks, workSearchSystem, WORK_ID_SCHEMA, verifyWorkSystem, ACCEPT_WORK_SCHEMA, plurality, bootDiff, verdictOf } from '../littask.mjs';

export const ID = 'v3-collective';
export const TITLE = 'V3 voting and verification among agents that have working space (H-01, H-M03)';
export const PREREG = 'tasks/V3-COLLECTIVE-PREREG.md';
export const WAVES = 2;
export const LEVELS = [48, 96, 144];
export const PER_LEVEL = 30, SAMPLES = 5;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 19001 + i);
export const GATE = { maxInvalidShare: 0.1 }, BAND = [0.2, 0.9];
export const tasks = () => makeTasks(SEEDS, LEVELS);
const req = (system, schema, content) => ({ model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content: JSON.stringify(content) }] });
const answerOf = (outputs, id) => { const o = outputs.get(id)?.output; return o && typeof o.id === 'string' ? o.id.trim() : null; };
const verifierRows = (t, proposals) => proposals.map((p) => ({ custom_id: `v3-${t.seed}-v-${p}`, params: req(verifyWorkSystem(40), ACCEPT_WORK_SCHEMA, { task_id: t.id, records: t.records, proposed_answer: p }), meta: { kind: 'verify', seed: t.seed, level: t.level, proposed: p, truthCorrect: p === t.answer } }));
export function wave(k, outputs) {
  if (k === 0) return tasks().flatMap((t) => { const meta = (variant, sample) => ({ kind: 'search', variant, sample, seed: t.seed, level: t.level, answer: t.answer, ids: t.records.map((r) => r.id) }), c = { task_id: t.id, records: t.records };
    return [...Array.from({ length: SAMPLES }, (_, s) => ({ custom_id: `v3-${t.seed}-s${s}`, params: req(workSearchSystem(20), WORK_ID_SCHEMA, c), meta: meta('w20', s) })), { custom_id: `v3-${t.seed}-deep`, params: req(workSearchSystem(150), WORK_ID_SCHEMA, c), meta: meta('deep', 0) }]; });
  return tasks().flatMap((t) => { const known = new Set(t.records.map((r) => r.id)); return verifierRows(t, [...new Set([answerOf(outputs, `v3-${t.seed}-s0`), answerOf(outputs, `v3-${t.seed}-s1`)].filter((a) => a && known.has(a)))]); });
}
export const ceiling = (k) => tasks().flatMap((t) => verifierRows(t, [t.planted, t.answer]));
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, truncated = item?.stopReason === 'max_tokens';
    if (m.kind === 'verify') { const valid = !!o && typeof o.accept === 'boolean'; return { customId: q.custom_id, kind: 'verify', seed: m.seed, level: m.level, proposed: m.proposed, truthCorrect: m.truthCorrect, valid, truncated, accept: valid && o.accept === true }; }
    const valid = !!o && typeof o.id === 'string', a = valid ? o.id.trim() : null; return { customId: q.custom_id, kind: 'search', variant: m.variant, sample: m.sample, seed: m.seed, level: m.level, valid, truncated, answer: a, known: valid && m.ids.includes(a), correct: a === m.answer }; });
}
export const gate = (k, scored) => (!scored.length || scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
const KEYS = ['single', 'vote3', 'vote5', 'verify3', 'deep', 'any5'], mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export function summarize([s0, s1]) {
  if (!s1) return { tests: { P1: 'not-evaluated', P2: 'not-evaluated', P3: 'not-evaluated', P4: 'not-evaluated' } };
  const verdict = new Map(s1.map((x) => [`${x.seed}/${x.proposed}`, x.accept]));
  const rows = SEEDS.map((seed) => { const r = s0.filter((x) => x.seed === seed && x.variant === 'w20').sort((a, b) => a.sample - b.sample), a = r.map((x) => (x.valid ? x.answer : null)), ok = (x) => (r.some((y) => y.correct && y.answer === x) ? 1 : 0);
    const acc0 = !!a[0] && r[0].known && verdict.get(`${seed}/${a[0]}`) === true;
    return { seed, level: r[0].level, single: ok(a[0]), vote3: ok(plurality(a.slice(0, 3))), vote5: ok(plurality(a)), verify3: ok(acc0 ? a[0] : a[1]), deep: s0.find((x) => x.seed === seed && x.variant === 'deep').correct ? 1 : 0, any5: a.some((x) => ok(x)) ? 1 : 0, distinct: new Set(a.filter((x) => x !== null)).size }; });
  const acc = (rs) => Object.fromEntries(KEYS.map((s) => [s, mean(rs, (x) => x[s])])), byLevel = Object.fromEntries(LEVELS.map((L) => [L, acc(rows.filter((x) => x.level === L))]));
  const levels = LEVELS.filter((L) => byLevel[L].single >= BAND[0] && byLevel[L].single <= BAND[1]), pool = rows.filter((x) => levels.includes(x.level)), p = pool.length ? acc(pool) : null;
  const d1 = bootDiff(pool, 'vote3', 'single', 20261151), d2 = bootDiff(pool, 'verify3', 'vote3', 20261152), d5 = bootDiff(pool, 'vote5', 'single', 20261153), d4 = bootDiff(pool, 'deep', 'vote3', 20261154), varied = pool.length ? pool.filter((x) => x.distinct > 1).length / pool.length : null;
  const right = s1.filter((x) => x.truthCorrect), wrong = s1.filter((x) => !x.truthCorrect);
  return { byLevel, analysisLevels: levels, pooled: p ? { tasks: pool.length, ...p } : null, vote3MinusSingle: d1, vote5MinusSingle: d5, verify3MinusVote3: d2, deepMinusVote3: d4, shareOfTasksWithDifferentAnswers: varied,
    verifier: { correctAnswers: right.length, specificity: right.length ? right.filter((x) => x.accept).length / right.length : null, wrongAnswers: wrong.length, sensitivity: wrong.length ? wrong.filter((x) => !x.accept).length / wrong.length : null }, truncated: [...s0, ...s1].filter((x) => x.truncated).length,
    tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: varied === null ? 'inconclusive' : varied >= 0.2 ? 'supported' : 'not supported', P4: !d4 ? 'inconclusive' : d4.ci95[0] > 0 ? 'supported' : d4.ci95[1] < 0 ? 'refuted' : 'not supported' } };
}
