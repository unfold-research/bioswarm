// M5 (H-M03, H-15; Murmur): M4 found that a verifier with a fallback gains nothing when the fallback is another sample of
// the same prompt, because the sample repeats the answer. M5 varies what the second searcher is.
// Task of M4 with new seeds (../littask.mjs). Calls per task:
//   wave 0  s0 (base prompt), same (a second sample of it), r1 (records as text lines, reworded instruction),
//           r2 (conditions as a checklist, records in reverse order)
//   wave 1  verifier on s0; told (base prompt plus the s0 answer marked as rejected by a reviewer)
// Strategies: single = s0; retry-X = s0 if the verifier accepts it, otherwise X (same, r1, told); vote-diverse3 =
// plurality of s0, r1, r2. The escalation to a second model is analysed with ../m5-second-sonnet in analyze.mjs.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import { LEVELS, makeTasks, COND, SEARCH_SYSTEM, VERIFY_SYSTEM, ID_SCHEMA, ACCEPT_SCHEMA, plurality, bootDiff, verdictOf } from '../littask.mjs';

export const ID = 'm5-second';
export const TITLE = 'M5 what the second searcher must be for a verifier to pay (H-M03, H-15)';
export const PREREG = 'tasks/M5-SECOND-PREREG.md';
export const WAVES = 2;
export const PER_LEVEL = 30;
export const SEEDS = Array.from({ length: LEVELS.length * PER_LEVEL }, (_, i) => 16001 + i);
export const VARIANTS = ['s0', 'same', 'r1', 'r2'];
export const GATE = { maxInvalidShare: 0.1 }, BAND = [0.2, 0.9];
export const tasks = () => makeTasks(SEEDS);
const R1_SYSTEM = `Synthetic literature search. Every line below is one study, written as: id | year | review status | outcome | sample size. Among the studies that are ${COND}, which one has the biggest sample size? Reply with that study's id and nothing else. Return only JSON matching the schema.`;
const R2_SYSTEM = `You are screening studies in a synthetic exercise. A study is eligible only if all of these hold: (1) review is "peer-reviewed"; (2) year is 2020 or later; (3) outcome is "positive". Go through the records, keep the eligible ones, and report the id of the eligible study with the highest n. Answer with the id only. Return only JSON matching the schema.`;
const TOLD_SYSTEM = `${SEARCH_SYSTEM} A reviewer checked the answer given in \`rejected_answer\` and rejected it. Give the correct answer.`;
const req = (system, schema, content) => ({ model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content }] });
export function searchParams(t, variant) {
  if (variant === 'r1') return req(R1_SYSTEM, ID_SCHEMA, `task ${t.id}\n${t.records.map((r) => `${r.id} | ${r.year} | ${r.review} | ${r.outcome} | ${r.n}`).join('\n')}`);
  if (variant === 'r2') return req(R2_SYSTEM, ID_SCHEMA, JSON.stringify({ task_id: t.id, records: [...t.records].reverse().map((r) => ({ n: r.n, outcome: r.outcome, review: r.review, year: r.year, id: r.id })) }));
  return req(SEARCH_SYSTEM, ID_SCHEMA, JSON.stringify({ task_id: t.id, records: t.records }));
}
const answerOf = (outputs, id) => { const o = outputs.get(id)?.output; return o && typeof o.id === 'string' ? o.id.trim() : null; };
const second = (t, a) => [
  { custom_id: `m5-${t.seed}-v`, params: req(VERIFY_SYSTEM, ACCEPT_SCHEMA, JSON.stringify({ task_id: t.id, records: t.records, proposed_answer: a })), meta: { kind: 'verify', seed: t.seed, level: t.level, proposed: a, truthCorrect: a === t.answer } },
  { custom_id: `m5-${t.seed}-told`, params: req(TOLD_SYSTEM, ID_SCHEMA, JSON.stringify({ task_id: t.id, records: t.records, rejected_answer: a })), meta: { kind: 'told', seed: t.seed, level: t.level, rejected: a, answer: t.answer, ids: t.records.map((r) => r.id) } },
];
export function wave(k, outputs) {
  if (k === 0) return tasks().flatMap((t) => VARIANTS.map((v) => ({ custom_id: `m5-${t.seed}-${v}`, params: searchParams(t, v), meta: { kind: 'search', variant: v, seed: t.seed, level: t.level, answer: t.answer, ids: t.records.map((r) => r.id) } })));
  // An s0 answer that is not the id of a record is rejected by a deterministic check; it gets no verifier or told call.
  return tasks().flatMap((t) => { const a = answerOf(outputs, `m5-${t.seed}-s0`); return a && t.records.some((r) => r.id === a) ? second(t, a) : []; });
}
export const ceiling = (k) => tasks().flatMap((t) => second(t, t.planted));
export function score(k, rows, outputs) {
  return rows.map((q) => { const o = outputs.get(q.custom_id)?.output, m = q.meta;
    if (m.kind === 'verify') { const valid = !!o && typeof o.accept === 'boolean'; return { customId: q.custom_id, kind: 'verify', seed: m.seed, level: m.level, proposed: m.proposed, truthCorrect: m.truthCorrect, valid, accept: valid && o.accept === true }; }
    const valid = !!o && typeof o.id === 'string', a = valid ? o.id.trim() : null;
    return { customId: q.custom_id, kind: m.kind, variant: m.kind === 'told' ? 'told' : m.variant, seed: m.seed, level: m.level, valid, answer: a, known: valid && m.ids.includes(a), correct: a === m.answer, repeated: m.kind === 'told' && a === m.rejected }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export const STRATEGIES = ['single', 'same', 'r1', 'r2', 'retrySame', 'retryReword', 'retryTold', 'voteDiverse3'];
// One row per task with 0/1 per strategy; exported for the combined analysis with the Sonnet study.
export function perTask(s0, s1) {
  const get = (seed, variant) => [...s0, ...s1].find((x) => x.seed === seed && x.variant === variant) || null, ok = (x) => (x && x.correct ? 1 : 0);
  return SEEDS.map((seed) => { const a = get(seed, 's0'), v = s1.find((x) => x.kind === 'verify' && x.seed === seed), accepted = !!v && v.accept;
    const fb = (x) => (accepted ? ok(a) : ok(x)), ans = (x) => (x && x.valid ? x.answer : null), vote = plurality([ans(a), ans(get(seed, 'r1')), ans(get(seed, 'r2'))]);
    return { seed, level: a.level, accepted: accepted ? 1 : 0, single: ok(a), same: ok(get(seed, 'same')), r1: ok(get(seed, 'r1')), r2: ok(get(seed, 'r2')), retrySame: fb(get(seed, 'same')), retryReword: fb(get(seed, 'r1')), retryTold: fb(get(seed, 'told')), voteDiverse3: vote !== null && vote === (a.correct ? a.answer : [get(seed, 'r1'), get(seed, 'r2')].find((x) => x.correct)?.answer) ? 1 : 0 }; });
}
const mean = (rows, f) => (rows.length ? rows.reduce((n, x) => n + f(x), 0) / rows.length : null);
export const accOf = (rows, keys) => Object.fromEntries(keys.map((s) => [s, mean(rows, (x) => x[s])]));
export function analysisSet(rows) { const levels = LEVELS.filter((L) => { const p = mean(rows.filter((x) => x.level === L), (x) => x.single); return p >= BAND[0] && p <= BAND[1]; }); return { levels, pool: rows.filter((x) => levels.includes(x.level)) }; }
export function summarize([s0, s1]) {
  if (!s1) return { tests: { P1: 'not-evaluated', P2: 'not-evaluated', P3: 'not-evaluated' } };
  const rows = perTask(s0, s1), { levels, pool } = analysisSet(rows);
  const byLevel = Object.fromEntries(LEVELS.map((L) => [L, accOf(rows.filter((x) => x.level === L), [...STRATEGIES, 'accepted'])]));
  const d1 = bootDiff(pool, 'retryReword', 'retrySame', 20261121), d2 = bootDiff(pool, 'retryTold', 'retrySame', 20261122), d3 = bootDiff(pool, 'voteDiverse3', 'single', 20261123);
  const ver = s1.filter((x) => x.kind === 'verify'), right = ver.filter((x) => x.truthCorrect), wrong = ver.filter((x) => !x.truthCorrect), told = s1.filter((x) => x.kind === 'told');
  return { byLevel, analysisLevels: levels, pooled: pool.length ? { tasks: pool.length, ...accOf(pool, [...STRATEGIES, 'accepted']) } : null, retryRewordMinusRetrySame: d1, retryToldMinusRetrySame: d2, voteDiverse3MinusSingle: d3,
    verifier: { specificity: right.length ? right.filter((x) => x.accept).length / right.length : null, correctAnswers: right.length, sensitivity: wrong.length ? wrong.filter((x) => !x.accept).length / wrong.length : null, wrongAnswers: wrong.length }, toldRepeatedRejected: told.filter((x) => x.repeated).length, told: told.length,
    tests: { P1: verdictOf(d1), P2: verdictOf(d2), P3: verdictOf(d3) } };
}
